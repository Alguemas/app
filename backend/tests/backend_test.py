"""SimBet backend regression tests (JWT + email/password auth).

Covers:
  * /api/auth/register (creates user w/ 200 coins, returns JWT)
  * /api/auth/login (valid & invalid password, error messages PT)
  * /api/auth/register duplicate => 409
  * /api/auth/me (with/without token, expired token)
  * /api/auth/google (503 when GOOGLE_WEB_CLIENT_ID unset)
  * /api/auth/logout (ok:true)
  * /api/user/balance / /api/user/deposit / /api/user/bet / /api/bets/history
  * Card fields never persisted in DB
  * No `_id` or `password_hash` leaked in any response
  * MongoDB indexes: users.email/user_id unique, users.google_sub sparse unique, bets.user_id
"""
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest
import requests
import jwt as pyjwt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]

FRONTEND_ENV = BACKEND_DIR.parent / "frontend" / ".env"
load_dotenv(FRONTEND_ENV, override=False)
BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL")
            or os.environ.get("EXPO_BACKEND_URL")).rstrip("/")

RUN_TAG = uuid.uuid4().hex[:8]
TEST_EMAIL = f"TEST_simbet_{RUN_TAG}@example.com".lower()
TEST_PASSWORD = "SenhaSegura123"
TEST_NAME = "TEST User"


# ================= FIXTURES =================
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def _cleanup_before_and_after(event_loop):
    async def _wipe():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.users.delete_many({"email": {"$regex": "^TEST_simbet_"}})
        # cascade delete bets
        await db.bets.delete_many({"label": {"$regex": "^TEST_"}})
        client.close()
    event_loop.run_until_complete(_wipe())
    yield
    event_loop.run_until_complete(_wipe())


@pytest.fixture(scope="session")
def registered(api):
    """Register the primary test user and return {token, user}."""
    r = api.post(f"{BASE_URL}/api/auth/register",
                 json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": TEST_NAME})
    assert r.status_code == 201, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    assert "session_token" in body and "user" in body
    return body


def _auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ================= AUTH: REGISTER =================
class TestRegister:
    def test_register_creates_user_with_200_coins(self, registered):
        user = registered["user"]
        assert user["email"] == TEST_EMAIL
        assert user["name"] == TEST_NAME
        assert user["virtual_coins"] == 200
        assert user["user_id"].startswith("user_")
        # sanitization
        assert "_id" not in user
        assert "password_hash" not in user

    def test_register_returns_valid_jwt(self, registered):
        token = registered["session_token"]
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        assert payload["sub"] == registered["user"]["user_id"]
        assert "exp" in payload and "iat" in payload

    def test_register_duplicate_email_returns_409(self, api, registered):
        r = api.post(f"{BASE_URL}/api/auth/register",
                     json={"email": TEST_EMAIL, "password": "OutraSenha1", "name": "Dup"})
        assert r.status_code == 409, r.text
        assert "já está cadastrado" in r.json().get("detail", "")

    def test_register_short_password_returns_422(self, api):
        r = api.post(f"{BASE_URL}/api/auth/register",
                     json={"email": f"TEST_simbet_{uuid.uuid4().hex[:6]}@x.com",
                           "password": "123", "name": "X"})
        assert r.status_code == 422


# ================= AUTH: LOGIN =================
class TestLogin:
    def test_login_valid_returns_jwt_and_user(self, api, registered):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "session_token" in body
        assert body["user"]["email"] == TEST_EMAIL
        assert body["user"]["virtual_coins"] >= 200
        assert "_id" not in body["user"]
        assert "password_hash" not in body["user"]

    def test_login_wrong_password_returns_401_pt(self, api, registered):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": TEST_EMAIL, "password": "senhaErrada!"})
        assert r.status_code == 401
        assert r.json().get("detail") == "E-mail ou senha inválidos."

    def test_login_unknown_email_returns_401(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": f"TEST_simbet_nope_{uuid.uuid4().hex[:6]}@x.com",
                           "password": "whatever1"})
        assert r.status_code == 401
        assert r.json().get("detail") == "E-mail ou senha inválidos."

    def test_login_email_case_insensitive(self, api, registered):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": TEST_EMAIL.upper(), "password": TEST_PASSWORD})
        assert r.status_code == 200, r.text


# ================= AUTH: ME / LOGOUT =================
class TestMe:
    def test_me_without_token_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_fake_token_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=_auth("not.a.jwt"))
        assert r.status_code == 401

    def test_me_with_expired_jwt_returns_401(self, api, registered):
        expired = pyjwt.encode(
            {"sub": registered["user"]["user_id"],
             "iat": int((datetime.now(timezone.utc) - timedelta(days=30)).timestamp()),
             "exp": int((datetime.now(timezone.utc) - timedelta(days=1)).timestamp())},
            JWT_SECRET, algorithm="HS256",
        )
        r = api.get(f"{BASE_URL}/api/auth/me", headers=_auth(expired))
        assert r.status_code == 401

    def test_me_with_valid_token(self, api, registered):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=_auth(registered["session_token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == TEST_EMAIL
        assert data["user_id"] == registered["user"]["user_id"]
        assert "_id" not in data
        assert "password_hash" not in data


class TestLogout:
    def test_logout_returns_ok_true(self, api):
        r = api.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        assert r.json() == {"ok": True}


# ================= AUTH: GOOGLE =================
class TestGoogleAuth:
    def test_google_without_client_id_returns_503(self, api):
        # This env has GOOGLE_WEB_CLIENT_ID empty => must return 503
        if os.environ.get("GOOGLE_WEB_CLIENT_ID", "").strip():
            pytest.skip("GOOGLE_WEB_CLIENT_ID configured, cannot test 503 path")
        r = api.post(f"{BASE_URL}/api/auth/google",
                     json={"id_token": "x" * 40})
        assert r.status_code == 503, r.text
        assert "Google" in r.json().get("detail", "")

    def test_google_short_token_returns_422(self, api):
        r = api.post(f"{BASE_URL}/api/auth/google", json={"id_token": "short"})
        assert r.status_code == 422


# ================= BALANCE =================
class TestBalance:
    def test_balance_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/user/balance")
        assert r.status_code == 401

    def test_balance_returns_initial_200(self, api, registered):
        r = api.get(f"{BASE_URL}/api/user/balance",
                    headers=_auth(registered["session_token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["virtual_coins"] == 200


# ================= DEPOSIT =================
class TestDeposit:
    def test_deposit_requires_auth(self, api):
        r = api.post(f"{BASE_URL}/api/user/deposit", json={"amount": 10})
        assert r.status_code == 401

    def test_deposit_invalid_amount(self, api, registered):
        r = api.post(f"{BASE_URL}/api/user/deposit",
                     headers=_auth(registered["session_token"]),
                     json={"amount": 0})
        assert r.status_code == 400
        r = api.post(f"{BASE_URL}/api/user/deposit",
                     headers=_auth(registered["session_token"]),
                     json={"amount": -1})
        assert r.status_code == 400

    def test_deposit_accepts_amount_and_discards_card_fields(self, api, registered, event_loop):
        payload = {
            "amount": 50,
            "card_number": "4111111111111111",
            "card_holder": "SHOULD_NOT_BE_STORED_XYZ",
            "expiry": "12/29",
            "cvv": "123",
        }
        r = api.post(f"{BASE_URL}/api/user/deposit",
                     headers=_auth(registered["session_token"]),
                     json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["virtual_coins"] >= 250

        async def _scan():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            leaks = []
            for coll in await db.list_collection_names():
                async for doc in db[coll].find({}):
                    s = str(doc)
                    for w in ("4111111111111111", "SHOULD_NOT_BE_STORED_XYZ"):
                        if w in s:
                            leaks.append((coll, w))
            client.close()
            return leaks

        leaks = event_loop.run_until_complete(_scan())
        assert not leaks, f"Card data leaked into DB: {leaks}"


# ================= BETS =================
class TestBets:
    def test_bet_requires_auth(self, api):
        r = api.post(f"{BASE_URL}/api/user/bet",
                     json={"game": "sports", "stake": 10, "multiplier": 2.0})
        assert r.status_code == 401

    def test_bet_win_debits_and_credits(self, api, registered):
        token = registered["session_token"]
        b0 = api.get(f"{BASE_URL}/api/user/balance", headers=_auth(token)).json()["virtual_coins"]
        r = api.post(f"{BASE_URL}/api/user/bet", headers=_auth(token),
                     json={"game": "sports", "stake": 20, "multiplier": 2.0, "label": "TEST_win"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["won"] is True
        assert body["payout"] == 40
        assert body["new_balance"] == b0 - 20 + 40
        b1 = api.get(f"{BASE_URL}/api/user/balance", headers=_auth(token)).json()["virtual_coins"]
        assert b1 == body["new_balance"]

    def test_bet_lose_debits_stake_only(self, api, registered):
        token = registered["session_token"]
        b0 = api.get(f"{BASE_URL}/api/user/balance", headers=_auth(token)).json()["virtual_coins"]
        r = api.post(f"{BASE_URL}/api/user/bet", headers=_auth(token),
                     json={"game": "crash", "stake": 10, "multiplier": 0, "label": "TEST_lose"})
        assert r.status_code == 200
        body = r.json()
        assert body["won"] is False
        assert body["payout"] == 0
        assert body["new_balance"] == b0 - 10

    def test_bet_insufficient_balance(self, api, registered):
        r = api.post(f"{BASE_URL}/api/user/bet",
                     headers=_auth(registered["session_token"]),
                     json={"game": "sports", "stake": 999999, "multiplier": 2.0})
        assert r.status_code == 400

    def test_bet_non_positive_stake(self, api, registered):
        r = api.post(f"{BASE_URL}/api/user/bet",
                     headers=_auth(registered["session_token"]),
                     json={"game": "sports", "stake": -5, "multiplier": 2.0})
        assert r.status_code == 400

    def test_bets_history_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/bets/history")
        assert r.status_code == 401

    def test_bets_history_desc_and_no_leaks(self, api, registered):
        r = api.get(f"{BASE_URL}/api/bets/history",
                    headers=_auth(registered["session_token"]))
        assert r.status_code == 200
        data = r.json()
        assert "bets" in data and isinstance(data["bets"], list)
        assert len(data["bets"]) >= 2
        # descending order
        ts = [b["created_at"] for b in data["bets"]]
        assert ts == sorted(ts, reverse=True), f"history not sorted desc: {ts}"
        for b in data["bets"]:
            assert "_id" not in b
            assert "user_id" not in b
            for k in ("bet_id", "game", "stake", "multiplier", "payout", "won",
                      "label", "created_at"):
                assert k in b


# ================= SPORTS (public) =================
class TestSports:
    def test_matches_public(self, api):
        r = api.get(f"{BASE_URL}/api/sports/matches")
        assert r.status_code == 200
        data = r.json()
        assert "matches" in data and len(data["matches"]) >= 3


# ================= INDEXES =================
class TestIndexes:
    def test_indexes(self, event_loop):
        async def _check():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            users_ix = await db.users.index_information()
            bets_ix = await db.bets.index_information()
            client.close()
            return users_ix, bets_ix

        users_ix, bets_ix = event_loop.run_until_complete(_check())
        assert any(v.get("key") == [("email", 1)] and v.get("unique")
                   for v in users_ix.values()), f"users.email unique missing: {users_ix}"
        assert any(v.get("key") == [("user_id", 1)] and v.get("unique")
                   for v in users_ix.values()), f"users.user_id unique missing: {users_ix}"
        assert any(v.get("key") == [("google_sub", 1)] and v.get("unique") and v.get("sparse")
                   for v in users_ix.values()), f"users.google_sub sparse unique missing: {users_ix}"
        assert any(v.get("key") == [("user_id", 1)] for v in bets_ix.values()), \
            f"bets.user_id index missing: {bets_ix}"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
