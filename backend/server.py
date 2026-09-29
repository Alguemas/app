from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import logging
import uuid
import bcrypt
import jwt as pyjwt
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime, timezone, timedelta

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

INITIAL_BALANCE = 200
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 dias
GOOGLE_WEB_CLIENT_ID = os.getenv("GOOGLE_WEB_CLIENT_ID", "").strip()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ============ MODELS ============
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=20)


class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    virtual_coins: int


class AuthResponse(BaseModel):
    user: UserResponse
    session_token: str


class FakeDepositRequest(BaseModel):
    card_number: Optional[str] = None
    card_holder: Optional[str] = None
    expiry: Optional[str] = None
    cvv: Optional[str] = None
    amount: int


class BetRequest(BaseModel):
    game: Literal["sports", "crash", "slots"]
    stake: int
    multiplier: float = 1.0
    label: str = ""


class BetResponse(BaseModel):
    bet_id: str
    game: str
    stake: int
    multiplier: float
    payout: int
    won: bool
    new_balance: int
    label: str
    created_at: str


class BalanceResponse(BaseModel):
    virtual_coins: int


# ============ HELPERS ============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, stored: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def make_jwt(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp()),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> Optional[str]:
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("sub")
    except pyjwt.PyJWTError:
        return None


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sessão inválida.")
    token = authorization.split(" ", 1)[1]
    user_id = decode_jwt(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado.")
    return user


def public_user(doc: dict) -> UserResponse:
    return UserResponse(
        user_id=doc["user_id"],
        email=doc["email"],
        name=doc["name"],
        picture=doc.get("picture"),
        virtual_coins=doc.get("virtual_coins", 0),
    )


def normalize_email(email: str) -> str:
    return email.strip().lower()


# ============ AUTH ============
@api_router.post("/auth/register", response_model=AuthResponse, status_code=201)
async def auth_register(req: RegisterRequest):
    email = normalize_email(str(req.email))
    now = datetime.now(timezone.utc)
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": req.name.strip(),
        "picture": None,
        "virtual_coins": INITIAL_BALANCE,
        "password_hash": hash_password(req.password),
        "auth_provider": "password",
        "created_at": now,
    }
    try:
        await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado.")
    return AuthResponse(user=public_user(doc), session_token=make_jwt(user_id))


@api_router.post("/auth/login", response_model=AuthResponse)
async def auth_login(req: LoginRequest):
    email = normalize_email(str(req.email))
    doc = await db.users.find_one({"email": email})
    if not doc or not doc.get("password_hash") or not verify_password(req.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    return AuthResponse(user=public_user(doc), session_token=make_jwt(doc["user_id"]))


@api_router.post("/auth/google", response_model=AuthResponse)
async def auth_google(req: GoogleLoginRequest):
    if not GOOGLE_WEB_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Login com Google não configurado. Defina GOOGLE_WEB_CLIENT_ID no backend.",
        )
    try:
        info = google_id_token.verify_oauth2_token(
            req.id_token, google_requests.Request(), GOOGLE_WEB_CLIENT_ID
        )
        if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError("issuer inválido")
    except Exception as e:
        logger.warning("Google token verify failed: %s", e)
        raise HTTPException(status_code=401, detail="Token do Google inválido ou expirado.")

    sub = info.get("sub")
    email = info.get("email")
    if not sub or not email:
        raise HTTPException(status_code=401, detail="Conta Google incompleta.")
    email = normalize_email(email)
    name = info.get("name") or email.split("@")[0]
    picture = info.get("picture")
    now = datetime.now(timezone.utc)

    existing = await db.users.find_one({"$or": [{"google_sub": sub}, {"email": email}]})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "google_sub": sub,
                "name": name,
                "picture": picture,
                "updated_at": now,
            }},
        )
        existing["name"] = name
        existing["picture"] = picture
        doc = existing
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "google_sub": sub,
            "virtual_coins": INITIAL_BALANCE,
            "auth_provider": "google",
            "created_at": now,
        }
        try:
            await db.users.insert_one(doc)
        except DuplicateKeyError:
            existing = await db.users.find_one({"email": email})
            doc = existing
            user_id = existing["user_id"]

    return AuthResponse(user=public_user(doc), session_token=make_jwt(user_id))


@api_router.get("/auth/me", response_model=UserResponse)
async def auth_me(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return public_user(user)


@api_router.post("/auth/logout")
async def auth_logout():
    # JWT stateless: cliente apaga o token.
    return {"ok": True}


# ============ USER / BALANCE ============
@api_router.get("/user/balance", response_model=BalanceResponse)
async def get_balance(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return BalanceResponse(virtual_coins=user.get("virtual_coins", 0))


@api_router.post("/user/deposit", response_model=BalanceResponse)
async def fake_deposit(req: FakeDepositRequest, authorization: Optional[str] = Header(None)):
    """SIMULATED DEPOSIT - card data is intentionally NEVER stored."""
    user = await get_current_user(authorization)
    if req.amount <= 0 or req.amount > 100000:
        raise HTTPException(status_code=400, detail="Valor inválido.")
    new_balance = user.get("virtual_coins", 0) + req.amount
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"virtual_coins": new_balance}},
    )
    # card_number, card_holder, expiry, cvv são intencionalmente DESCARTADOS.
    return BalanceResponse(virtual_coins=new_balance)


# ============ BETS ============
@api_router.post("/user/bet", response_model=BetResponse)
async def place_bet(req: BetRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    balance = user.get("virtual_coins", 0)
    if req.stake <= 0:
        raise HTTPException(status_code=400, detail="Aposta deve ser positiva.")
    if req.stake > balance:
        raise HTTPException(status_code=400, detail="Saldo insuficiente.")

    payout = int(req.stake * req.multiplier)
    won = req.multiplier > 0
    new_balance = balance - req.stake + payout

    bet_id = f"bet_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    await db.bets.insert_one({
        "bet_id": bet_id,
        "user_id": user["user_id"],
        "game": req.game,
        "stake": req.stake,
        "multiplier": req.multiplier,
        "payout": payout,
        "won": won,
        "label": req.label,
        "created_at": now,
    })
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"virtual_coins": new_balance}},
    )
    return BetResponse(
        bet_id=bet_id, game=req.game, stake=req.stake, multiplier=req.multiplier,
        payout=payout, won=won, new_balance=new_balance, label=req.label,
        created_at=now.isoformat(),
    )


@api_router.get("/bets/history")
async def bets_history(authorization: Optional[str] = Header(None), limit: int = 30):
    user = await get_current_user(authorization)
    cursor = db.bets.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "user_id": 0},
    ).sort("created_at", -1).limit(limit)
    items = []
    async for b in cursor:
        if isinstance(b.get("created_at"), datetime):
            b["created_at"] = b["created_at"].isoformat()
        items.append(b)
    return {"bets": items}


# ============ FAKE SPORTS DATA ============
@api_router.get("/sports/matches")
async def get_matches():
    matches = [
        {"id": "m1", "league": "Brasileirão", "home": "Flamengo", "away": "Palmeiras",
         "time": "Hoje 21:30", "odds": {"home": 1.85, "draw": 3.40, "away": 4.10}},
        {"id": "m2", "league": "Brasileirão", "home": "Corinthians", "away": "São Paulo",
         "time": "Hoje 19:00", "odds": {"home": 2.10, "draw": 3.20, "away": 3.50}},
        {"id": "m3", "league": "Premier League", "home": "Man City", "away": "Liverpool",
         "time": "Amanhã 13:00", "odds": {"home": 1.95, "draw": 3.60, "away": 3.80}},
        {"id": "m4", "league": "La Liga", "home": "Real Madrid", "away": "Barcelona",
         "time": "Sáb 17:00", "odds": {"home": 2.05, "draw": 3.50, "away": 3.40}},
        {"id": "m5", "league": "NBA", "home": "Lakers", "away": "Warriors",
         "time": "Hoje 23:00", "odds": {"home": 1.70, "draw": 0, "away": 2.10}},
        {"id": "m6", "league": "Libertadores", "home": "Botafogo", "away": "River Plate",
         "time": "Qui 21:30", "odds": {"home": 2.40, "draw": 3.10, "away": 2.80}},
    ]
    return {"matches": matches}


@api_router.get("/")
async def root():
    return {"message": "SimBet API", "version": "2.0.0"}


# ============ STARTUP ============
@app.on_event("startup")
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("google_sub", unique=True, sparse=True)
    await db.bets.create_index("user_id")
    logger.info("MongoDB indexes ready")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
