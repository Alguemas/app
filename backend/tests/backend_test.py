"""SimBet backend regression tests.

Covers:
  * /api/auth/session (bad session_id => 401)
  * /api/auth/me (401 without/with fake token)
  * /api/sports/matches (public)
  * /api/user/balance (auth required)
  * /api/user/deposit (card fields discarded, never persisted)
  * /api/user/bet (stake deducted, payout added)
  * /api/bets/history (returns user's bets, no _id)
  * MongoDB indexes (users, user_sessions TTL, bets)
"""
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load backend env for direct DB access
BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# Public URL (frontend uses EXPO_PUBLIC_BACKEND_URL)
FRONTEND_ENV = BACKEND_DIR.parent / "frontend" / ".env"
load_dotenv(FRONTEND_ENV, override=False)
BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL")
            or os.environ.get("EXPO_BACKEND_URL")).rstrip("/")

TEST_EMAIL = f"TEST_simbet_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_ID = f"user_TEST{uuid.uuid4().hex[:8]}"
TEST_TOKEN = f"TEST_token_{uuid.uuid4().hex}"


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


@pytest.fixture(scope="session")
def seeded_user(event_loop):
    """Insert a test user + session directly into Mongo (bypass Google OAuth)."""
    async def _seed():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.users.delete_many({"email": TEST_EMAIL})
        await db.user_sessions.delete_many({"user_id": TEST_USER_ID})
        await db.bets.delete_many({"user_id": TEST_USER_ID})
        await db.users.insert_one({
            "user_id": TEST_USER_ID,
            "email": TEST_EMAIL,
            "name": "Test User",
            "picture": None,
            "virtual_coins": 200,
            "created_at": datetime.now(timezone.utc),
        })
        await db.user_sessions.insert_one({
            "session_token": TEST_TOKEN,
            "user_id": TEST_USER_ID,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc),
        })
        client.close()
    event_loop.run_until_complete(_seed())
    yield {"user_id": TEST_USER_ID, "email": TEST_EMAIL, "token": TEST_TOKEN}
    # teardown
    async def _cleanup():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.users.delete_many({"email": TEST_EMAIL})
        await db.user_sessions.delete_many({"user_id": TEST_USER_ID})
        await db.bets.delete_many({"user_id": TEST_USER_ID})
        client.close()
    event_loop.run_until_complete(_cleanup())


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ================= AUTH =================
class TestAuth:
    def test_session_with_bad_session_id_returns_401(self, api):
        r = api.post(f"{BASE_URL}/api/auth/session", json={"session_id": "totally-bogus"})
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_session_missing_field_returns_422(self, api):
        r = api.post(f"{BASE_URL}/api/auth/session", json={})
        assert r.status_code == 422

    def test_me_without_token_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_fake_token_returns_401(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me",
                    headers=_auth_headers("fake_token_" + uuid.uuid4().hex))
        assert r.status_code == 401

    def test_me_with_valid_seeded_token(self, api, seeded_user):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=_auth_headers(seeded_user["token"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == seeded_user["email"]
        assert data["user_id"] == seeded_user["user_id"]
        assert data["virtual_coins"] == 200
        assert "_id" not in data


# ================= SPORTS (public) =================
class TestSports:
    def test_matches_public_no_auth(self, api):
        r = api.get(f"{BASE_URL}/api/sports/matches")
        assert r.status_code == 200
        data = r.json()
        assert "matches" in data and isinstance(data["matches"], list)
        assert len(data["matches"]) >= 3
        first = data["matches"][0]
        for k in ("id", "league", "home", "away", "time", "odds"):
            assert k in first
        for k in ("home", "draw", "away"):
            assert k in first["odds"]


# ================= BALANCE =================
class TestBalance:
    def test_balance_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/user/balance")
        assert r.status_code == 401

    def test_balance_returns_initial_200(self, api, seeded_user):
        r = api.get(f"{BASE_URL}/api/user/balance",
                    headers=_auth_headers(seeded_user["token"]))
        assert r.status_code == 200, r.text
        assert r.json() == {"virtual_coins": 200}


# ================= DEPOSIT (card fields must be discarded) =================
class TestDeposit:
    def test_deposit_accepts_amount_and_discards_card_fields(self, api, seeded_user, event_loop):
        payload = {
            "amount": 50,
            "card_number": "4111111111111111",
            "card_holder": "SHOULD NOT BE STORED",
            "expiry": "12/29",
            "cvv": "123",
        }
        r = api.post(f"{BASE_URL}/api/user/deposit",
                     headers=_auth_headers(seeded_user["token"]),
                     json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "virtual_coins" in body
        assert body["virtual_coins"] >= 250  # 200 + 50

        # Directly inspect Mongo to prove no card fields exist anywhere.
        async def _inspect():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            user = await db.users.find_one({"user_id": seeded_user["user_id"]})
            client.close()
            return user

        user_doc = event_loop.run_until_complete(_inspect())
        assert user_doc is not None
        forbidden = {"card_number", "card_holder", "expiry", "cvv", "SHOULD NOT BE STORED"}
        flat = str(user_doc)
        for word in forbidden:
            assert word not in flat, f"Card data leaked into users doc: {word}"

        # Scan all collections for the sensitive strings
        async def _scan_all():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            leaks = []
            for coll_name in await db.list_collection_names():
                async for doc in db[coll_name].find({}):
                    s = str(doc)
                    for w in ("4111111111111111", "SHOULD NOT BE STORED", "card_number", "cvv"):
                        if w in s:
                            leaks.append((coll_name, w))
            client.close()
            return leaks

        leaks = event_loop.run_until_complete(_scan_all())
        assert not leaks, f"Card data leaked into DB: {leaks}"

    def test_deposit_invalid_amount(self, api, seeded_user):
        r = api.post(f"{BASE_URL}/api/user/deposit",
                     headers=_auth_headers(seeded_user["token"]),
                     json={"amount": 0})
        assert r.status_code == 400
        r = api.post(f"{BASE_URL}/api/user/deposit",
                     headers=_auth_headers(seeded_user["token"]),
                     json={"amount": -10})
        assert r.status_code == 400

    def test_deposit_requires_auth(self, api):
        r = api.post(f"{BASE_URL}/api/user/deposit", json={"amount": 10})
        assert r.status_code == 401


# ================= BETS =================
class TestBets:
    def test_bet_requires_auth(self, api):
        r = api.post(f"{BASE_URL}/api/user/bet",
                     json={"game": "sports", "stake": 10, "multiplier": 2.0})
        assert r.status_code == 401

    def test_bet_wins_updates_balance(self, api, seeded_user):
        # get current balance
        b0 = api.get(f"{BASE_URL}/api/user/balance",
                     headers=_auth_headers(seeded_user["token"])).json()["virtual_coins"]
        stake, mult = 20, 2.0
        r = api.post(f"{BASE_URL}/api/user/bet",
                     headers=_auth_headers(seeded_user["token"]),
                     json={"game": "sports", "stake": stake, "multiplier": mult,
                           "label": "TEST_win"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["won"] is True
        assert body["payout"] == int(stake * mult)
        assert body["new_balance"] == b0 - stake + int(stake * mult)
        # verify balance persisted
        b1 = api.get(f"{BASE_URL}/api/user/balance",
                     headers=_auth_headers(seeded_user["token"])).json()["virtual_coins"]
        assert b1 == body["new_balance"]

    def test_bet_loses_deducts_stake(self, api, seeded_user):
        b0 = api.get(f"{BASE_URL}/api/user/balance",
                     headers=_auth_headers(seeded_user["token"])).json()["virtual_coins"]
        r = api.post(f"{BASE_URL}/api/user/bet",
                     headers=_auth_headers(seeded_user["token"]),
                     json={"game": "crash", "stake": 10, "multiplier": 0,
                           "label": "TEST_lose"})
        assert r.status_code == 200
        body = r.json()
        assert body["won"] is False
        assert body["payout"] == 0
        assert body["new_balance"] == b0 - 10

    def test_bet_insufficient_balance(self, api, seeded_user):
        r = api.post(f"{BASE_URL}/api/user/bet",
                     headers=_auth_headers(seeded_user["token"]),
                     json={"game": "sports", "stake": 999999, "multiplier": 2.0})
        assert r.status_code == 400

    def test_bet_negative_stake(self, api, seeded_user):
        r = api.post(f"{BASE_URL}/api/user/bet",
                     headers=_auth_headers(seeded_user["token"]),
                     json={"game": "sports", "stake": -5, "multiplier": 2.0})
        assert r.status_code == 400

    def test_bets_history_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/bets/history")
        assert r.status_code == 401

    def test_bets_history_returns_user_bets_no_objectid(self, api, seeded_user):
        r = api.get(f"{BASE_URL}/api/bets/history",
                    headers=_auth_headers(seeded_user["token"]))
        assert r.status_code == 200
        data = r.json()
        assert "bets" in data and isinstance(data["bets"], list)
        assert len(data["bets"]) >= 2  # from win + lose above
        for b in data["bets"]:
            assert "_id" not in b
            assert "user_id" not in b  # excluded by projection
            for k in ("bet_id", "game", "stake", "multiplier", "payout", "won",
                      "label", "created_at"):
                assert k in b, f"missing field {k} in bet {b}"
            assert isinstance(b["created_at"], str)  # serialized


# ================= INDEXES =================
class TestIndexes:
    def test_mongodb_indexes_created(self, event_loop):
        async def _check():
            client = AsyncIOMotorClient(MONGO_URL)
            db = client[DB_NAME]
            users_ix = await db.users.index_information()
            sess_ix = await db.user_sessions.index_information()
            bets_ix = await db.bets.index_information()
            client.close()
            return users_ix, sess_ix, bets_ix

        users_ix, sess_ix, bets_ix = event_loop.run_until_complete(_check())

        # users: email unique, user_id unique
        assert any(v.get("key") == [("email", 1)] and v.get("unique")
                   for v in users_ix.values()), f"users.email unique missing: {users_ix}"
        assert any(v.get("key") == [("user_id", 1)] and v.get("unique")
                   for v in users_ix.values()), f"users.user_id unique missing: {users_ix}"

        # user_sessions: session_token unique + TTL on expires_at
        assert any(v.get("key") == [("session_token", 1)] and v.get("unique")
                   for v in sess_ix.values()), f"session_token unique missing: {sess_ix}"
        assert any(v.get("key") == [("expires_at", 1)] and v.get("expireAfterSeconds") == 0
                   for v in sess_ix.values()), f"TTL on expires_at missing: {sess_ix}"

        # bets: user_id index
        assert any(v.get("key") == [("user_id", 1)] for v in bets_ix.values()), \
            f"bets.user_id index missing: {bets_ix}"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
