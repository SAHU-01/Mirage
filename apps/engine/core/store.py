"""
Central MongoDB-backed store for Mirage persistence beyond the feature cache:

  - verdicts         — every emitted verdict + feature snapshot (ground-truth training data)
  - outcomes         — resolved outcomes keyed by verdict_id
  - adversarial      — labeled adversarial wallets (seed for graph-distance features)
  - subscriptions    — (chat_id, wallet) pairs for the exit watchdog

All methods degrade to no-ops when MONGODB_URI is unset so the engine keeps
serving traffic without Mongo. In-memory fallback is also provided for verdict
history so /accuracy still returns *something* during local dev.
"""
from __future__ import annotations

import logging
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from pymongo.errors import PyMongoError
except ImportError:  # pragma: no cover
    AsyncIOMotorClient = None  # type: ignore
    PyMongoError = Exception  # type: ignore


log = logging.getLogger(__name__)

VERDICT_CACHE_TTL_SECONDS = 10 * 60  # 10 min hot cache on final verdicts


class InMemoryVerdictCache:
    """Fallback hot cache when MongoDB is unreachable — survives only in-process."""

    def __init__(self, ttl_seconds: int = VERDICT_CACHE_TTL_SECONDS) -> None:
        self._ttl = ttl_seconds
        self._data: Dict[str, tuple[float, dict]] = {}

    def get(self, key: str) -> Optional[dict]:
        hit = self._data.get(key)
        if not hit:
            return None
        expires_at, value = hit
        if expires_at < time.time():
            self._data.pop(key, None)
            return None
        return value

    def set(self, key: str, value: dict) -> None:
        self._data[key] = (time.time() + self._ttl, value)


class MirageStore:
    def __init__(self) -> None:
        uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("MONGODB_DB", "mirage")
        self._client = None
        self._db = None
        self._verdict_fallback = InMemoryVerdictCache()
        if uri and AsyncIOMotorClient:
            try:
                self._client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)
                self._db = self._client[db_name]
            except PyMongoError as e:  # pragma: no cover
                log.warning("Store init failed, persistence disabled: %s", e)

    def enabled(self) -> bool:
        return self._db is not None

    async def ensure_indexes(self) -> None:
        if self._db is None:
            return
        try:
            await self._db.verdicts.create_index([("address", 1), ("created_at", -1)])
            await self._db.verdicts.create_index([("kind", 1), ("created_at", -1)])
            await self._db.verdicts.create_index("verdict_id", unique=True)
            await self._db.verdict_cache.create_index("expires_at", expireAfterSeconds=0)
            await self._db.verdict_cache.create_index("key", unique=True)
            await self._db.outcomes.create_index("verdict_id", unique=True)
            await self._db.adversarial.create_index("address", unique=True)
            await self._db.subscriptions.create_index(
                [("chat_id", 1), ("wallet_address", 1)], unique=True
            )
        except PyMongoError as e:
            log.warning("Store index creation failed: %s", e)
            self._db = None

    # -------- Hot verdict cache (10-min TTL) --------

    @staticmethod
    def _vkey(kind: str, address: str, extras: Optional[str] = None) -> str:
        base = f"{kind}:{address.lower()}"
        return f"{base}:{extras}" if extras else base

    async def get_cached_verdict(
        self, kind: str, address: str, extras: Optional[str] = None
    ) -> Optional[dict]:
        key = self._vkey(kind, address, extras)
        if self._db is not None:
            try:
                doc = await self._db.verdict_cache.find_one({"key": key})
                if doc:
                    return doc["value"]
            except PyMongoError as e:
                log.warning("verdict_cache read failed: %s", e)
        return self._verdict_fallback.get(key)

    async def set_cached_verdict(
        self,
        kind: str,
        address: str,
        value: dict,
        extras: Optional[str] = None,
    ) -> None:
        key = self._vkey(kind, address, extras)
        self._verdict_fallback.set(key, value)
        if self._db is None:
            return
        try:
            await self._db.verdict_cache.update_one(
                {"key": key},
                {"$set": {
                    "key": key,
                    "value": value,
                    "expires_at": datetime.now(timezone.utc)
                    + timedelta(seconds=VERDICT_CACHE_TTL_SECONDS),
                }},
                upsert=True,
            )
        except PyMongoError as e:
            log.warning("verdict_cache write failed: %s", e)

    # -------- Verdict history (permanent log for outcome resolution) --------

    async def record_verdict(
        self,
        kind: str,
        address: str,
        verdict: str,
        trust_score: int,
        features: Dict[str, Any],
        extras: Optional[Dict[str, Any]] = None,
    ) -> str:
        verdict_id = uuid.uuid4().hex
        if self._db is None:
            return verdict_id
        try:
            await self._db.verdicts.insert_one({
                "verdict_id": verdict_id,
                "kind": kind,
                "address": address.lower(),
                "verdict": verdict,
                "trust_score": trust_score,
                "features": features,
                "extras": extras or {},
                "created_at": datetime.now(timezone.utc),
                "resolved": False,
            })
        except PyMongoError as e:
            log.warning("verdict record failed: %s", e)
        return verdict_id

    async def list_verdicts(
        self,
        kind: Optional[str] = None,
        resolved: Optional[bool] = None,
        limit: int = 100,
        older_than: Optional[timedelta] = None,
    ) -> List[Dict]:
        if self._db is None:
            return []
        query: Dict[str, Any] = {}
        if kind:
            query["kind"] = kind
        if resolved is not None:
            query["resolved"] = resolved
        if older_than:
            query["created_at"] = {"$lte": datetime.now(timezone.utc) - older_than}
        try:
            cursor = self._db.verdicts.find(query).sort("created_at", -1).limit(limit)
            return [d async for d in cursor]
        except PyMongoError as e:
            log.warning("verdict list failed: %s", e)
            return []

    # -------- Outcomes --------

    async def record_outcome(
        self,
        verdict_id: str,
        outcome: str,
        evidence: Dict[str, Any],
    ) -> None:
        if self._db is None:
            return
        try:
            await self._db.outcomes.update_one(
                {"verdict_id": verdict_id},
                {"$set": {
                    "verdict_id": verdict_id,
                    "outcome": outcome,
                    "evidence": evidence,
                    "resolved_at": datetime.now(timezone.utc),
                }},
                upsert=True,
            )
            await self._db.verdicts.update_one(
                {"verdict_id": verdict_id},
                {"$set": {"resolved": True, "final_outcome": outcome}},
            )
        except PyMongoError as e:
            log.warning("outcome record failed: %s", e)

    async def accuracy_summary(self, since: Optional[timedelta] = None) -> Dict[str, Any]:
        if self._db is None:
            return {"enabled": False}
        match: Dict[str, Any] = {"resolved": True}
        if since:
            match["created_at"] = {"$gte": datetime.now(timezone.utc) - since}
        try:
            pipeline = [
                {"$match": match},
                {"$group": {
                    "_id": {"verdict": "$verdict", "outcome": "$final_outcome"},
                    "count": {"$sum": 1},
                }},
            ]
            rows = [r async for r in self._db.verdicts.aggregate(pipeline)]
            total = sum(r["count"] for r in rows)
            # A verdict is "correct" when:
            #   AVOID  + outcome in {rugged, dumped}
            #   COPY   + outcome == graduated
            #   UNCERTAIN + any outcome (counted neutral, excluded from accuracy)
            correct = 0
            total_scored = 0
            for r in rows:
                v = r["_id"]["verdict"]
                o = r["_id"]["outcome"]
                if v == "UNCERTAIN":
                    continue
                total_scored += r["count"]
                if (v == "AVOID" and o in ("rugged", "dumped")) or (
                    v == "COPY" and o == "graduated"
                ):
                    correct += r["count"]
            return {
                "enabled": True,
                "total_resolved": total,
                "scored": total_scored,
                "correct": correct,
                "accuracy": (correct / total_scored) if total_scored else None,
            }
        except PyMongoError as e:
            log.warning("accuracy aggregate failed: %s", e)
            return {"enabled": False, "error": str(e)}

    # -------- Labeled adversarial wallets --------

    async def label_adversarial(
        self,
        address: str,
        source: str,
        confidence: float,
        evidence: Optional[Dict[str, Any]] = None,
    ) -> None:
        if self._db is None:
            return
        try:
            await self._db.adversarial.update_one(
                {"address": address.lower()},
                {"$set": {
                    "address": address.lower(),
                    "source": source,
                    "confidence": confidence,
                    "evidence": evidence or {},
                    "labeled_at": datetime.now(timezone.utc),
                }},
                upsert=True,
            )
        except PyMongoError as e:
            log.warning("adversarial label failed: %s", e)

    async def adversarial_set(self) -> set[str]:
        if self._db is None:
            return set()
        try:
            cursor = self._db.adversarial.find({}, {"address": 1})
            return {d["address"] async for d in cursor}
        except PyMongoError as e:
            log.warning("adversarial read failed: %s", e)
            return set()

    # -------- Subscriptions (exit watchdog) --------

    async def add_subscription(
        self,
        chat_id: int,
        wallet_address: str,
        baseline: Optional[Dict[str, Any]] = None,
    ) -> None:
        if self._db is None:
            return
        try:
            await self._db.subscriptions.update_one(
                {"chat_id": chat_id, "wallet_address": wallet_address.lower()},
                {"$set": {
                    "chat_id": chat_id,
                    "wallet_address": wallet_address.lower(),
                    "baseline": baseline or {},
                    "created_at": datetime.now(timezone.utc),
                    "last_checked_at": datetime.now(timezone.utc),
                }},
                upsert=True,
            )
        except PyMongoError as e:
            log.warning("subscription add failed: %s", e)

    async def remove_subscription(self, chat_id: int, wallet_address: str) -> None:
        if self._db is None:
            return
        try:
            await self._db.subscriptions.delete_one(
                {"chat_id": chat_id, "wallet_address": wallet_address.lower()}
            )
        except PyMongoError as e:
            log.warning("subscription remove failed: %s", e)

    async def list_subscriptions(self) -> List[Dict]:
        if self._db is None:
            return []
        try:
            cursor = self._db.subscriptions.find({})
            return [d async for d in cursor]
        except PyMongoError as e:
            log.warning("subscription list failed: %s", e)
            return []

    async def update_subscription_checkpoint(
        self,
        chat_id: int,
        wallet_address: str,
        baseline: Dict[str, Any],
    ) -> None:
        if self._db is None:
            return
        try:
            await self._db.subscriptions.update_one(
                {"chat_id": chat_id, "wallet_address": wallet_address.lower()},
                {"$set": {
                    "baseline": baseline,
                    "last_checked_at": datetime.now(timezone.utc),
                }},
            )
        except PyMongoError as e:
            log.warning("subscription checkpoint failed: %s", e)

    async def close(self) -> None:
        if self._client:
            self._client.close()
