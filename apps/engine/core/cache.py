import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from pymongo.errors import PyMongoError
except ImportError:  # pragma: no cover
    AsyncIOMotorClient = None  # type: ignore
    PyMongoError = Exception  # type: ignore


log = logging.getLogger(__name__)
THIRTY_DAYS = timedelta(days=30)
VERDICT_TTL = timedelta(minutes=10)


class FeatureCache:
    """
    MongoDB-backed feature cache with a 30-day rolling TTL.
    Degrades to a no-op when MONGODB_URI is unset or the server is unreachable,
    so the engine keeps serving traffic without caching.
    """

    def __init__(self) -> None:
        uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("MONGODB_DB", "mirage")
        self._client = None
        self._col = None
        if uri and AsyncIOMotorClient:
            try:
                self._client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)
                self._col = self._client[db_name]["features"]
            except PyMongoError as e:  # pragma: no cover
                log.warning("MongoDB client init failed, cache disabled: %s", e)
                self._client, self._col = None, None

    def enabled(self) -> bool:
        return self._col is not None

    async def ensure_indexes(self) -> None:
        if self._col is None:
            return
        try:
            await self._col.create_index([("kind", 1), ("address", 1)], unique=True)
            await self._col.create_index("expires_at", expireAfterSeconds=0)
        except PyMongoError as e:
            log.warning("MongoDB ping/index failed, cache disabled: %s", e)
            self._col = None

    async def get(self, kind: str, address: str) -> Optional[dict]:
        if self._col is None:
            return None
        try:
            doc = await self._col.find_one({"kind": kind, "address": address.lower()})
            return doc["value"] if doc else None
        except PyMongoError as e:
            log.warning("MongoDB read failed: %s", e)
            return None

    async def set(
        self,
        kind: str,
        address: str,
        value: dict,
        ttl: Optional[timedelta] = None,
    ) -> None:
        if self._col is None:
            return
        try:
            await self._col.update_one(
                {"kind": kind, "address": address.lower()},
                {
                    "$set": {
                        "value": value,
                        "updated_at": datetime.now(timezone.utc),
                        "expires_at": datetime.now(timezone.utc) + (ttl or THIRTY_DAYS),
                    }
                },
                upsert=True,
            )
        except PyMongoError as e:
            log.warning("MongoDB write failed: %s", e)

    async def close(self) -> None:
        if self._client:
            self._client.close()
