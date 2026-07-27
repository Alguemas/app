from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

INITIAL_BALANCE = 200
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============ MODELS ============
class SessionRequest(BaseModel):
    session_id: str


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
    # These are accepted to look real but are NEVER persisted.
    card_number: Optional[str] = None
    card_holder: Optional[str] = None
    expiry: Optional[str] = None
    cvv: Optional[str] = None
    amount: int


class BetRequest(BaseModel):
    game: Literal["sports", "crash", "slots"]
    stake: int
    multiplier: float = 1.0  # client-computed outcome multiplier (0 means lost)
    label: str = ""  # description like "Flamengo vs Palmeiras - Casa"


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
async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    exp = session.get("expires_at")
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============ AUTH ============
@api_router.post("/auth/session", response_model=AuthResponse)
async def process_session(req: SessionRequest):
    """Exchange session_id from Emergent Google Auth redirect for a backend session_token."""
    async with httpx.AsyncClient(timeout=10.0) as http:
        try:
            r = await http.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": req.session_id},
            )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"]
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        virtual_coins = existing.get("virtual_coins", INITIAL_BALANCE)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        virtual_coins = INITIAL_BALANCE
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "virtual_coins": virtual_coins,
            "created_at": datetime.now(timezone.utc),
        })

    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )

    return AuthResponse(
        user=UserResponse(
            user_id=user_id, email=email, name=name, picture=picture,
            virtual_coins=virtual_coins,
        ),
        session_token=session_token,
    )


@api_router.get("/auth/me", response_model=UserResponse)
async def auth_me(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture"),
        virtual_coins=user.get("virtual_coins", 0),
    )


@api_router.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ============ USER / BALANCE ============
@api_router.get("/user/balance", response_model=BalanceResponse)
async def get_balance(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return BalanceResponse(virtual_coins=user.get("virtual_coins", 0))


@api_router.post("/user/deposit", response_model=BalanceResponse)
async def fake_deposit(req: FakeDepositRequest, authorization: Optional[str] = Header(None)):
    """SIMULATED DEPOSIT - card data is intentionally NEVER stored. Only the balance updates."""
    user = await get_current_user(authorization)
    if req.amount <= 0 or req.amount > 100000:
        raise HTTPException(status_code=400, detail="Invalid amount")
    new_balance = user.get("virtual_coins", 0) + req.amount
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"virtual_coins": new_balance}},
    )
    # IMPORTANT: card_number, card_holder, expiry, cvv are intentionally DISCARDED.
    return BalanceResponse(virtual_coins=new_balance)


# ============ BETS ============
@api_router.post("/user/bet", response_model=BetResponse)
async def place_bet(req: BetRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    balance = user.get("virtual_coins", 0)
    if req.stake <= 0:
        raise HTTPException(status_code=400, detail="Stake must be positive")
    if req.stake > balance:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")

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
        bet_id=bet_id,
        game=req.game,
        stake=req.stake,
        multiplier=req.multiplier,
        payout=payout,
        won=won,
        new_balance=new_balance,
        label=req.label,
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
    """Hardcoded fake matches with odds."""
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
    return {"message": "SimBet API", "version": "1.0.0"}


# ============ STARTUP ============
@app.on_event("startup")
async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
