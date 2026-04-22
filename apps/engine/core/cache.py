import json
import os
from typing import Any, Optional

try:
    from redis.asyncio import Redis
except ImportError:  # pragma: no cover
    Redis = None  # type: ignore


THIRTY_DAYS = 60 * 60 * 24 * 30


class FeatureCache:
    """
    Thin async Redis wrapper with a 30-day rolling window on feature bundles.
    Degrades to a no-op when REDIS_URL is unset, so the engine still runs
    in local dev without Redis.
    """

    def __init__(self) -> None:
        url = os.getenv("REDIS_URL")
        self._client = Redis.from_url(url, decode_responses=True) if url and Redis else None

    def enabled(self) -> bool:
        return self._client is not None

    @staticmethod
    def _key(kind: str, address: str) -> str:
        return f"mirage:{kind}:{address.lower()}"

    async def get(self, kind: str, address: str) -> Optional[dict]:
        if not self._client:
            return None
        raw = await self._client.get(self._key(kind, address))
        return json.loads(raw) if raw else None

    async def set(self, kind: str, address: str, value: dict, ttl: int = THIRTY_DAYS) -> None:
        if not self._client:
            return
        await self._client.set(self._key(kind, address), json.dumps(value), ex=ttl)

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
