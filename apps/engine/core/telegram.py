import logging
import os
from typing import Optional

import httpx

log = logging.getLogger(__name__)


class TelegramPush:
    """Minimal Telegram Bot API sender. Used by the exit watchdog to push alerts
    without depending on the TypeScript bot being awake.
    No-ops when TELEGRAM_BOT_TOKEN is unset."""

    def __init__(self) -> None:
        self.token = os.getenv("TELEGRAM_BOT_TOKEN")
        self._client: Optional[httpx.AsyncClient] = None

    def enabled(self) -> bool:
        return bool(self.token)

    async def send(self, chat_id: int, text: str, parse_mode: str = "Markdown") -> bool:
        if not self.token:
            return False
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=15.0)
        try:
            resp = await self._client.post(
                f"https://api.telegram.org/bot{self.token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
            )
            if resp.status_code >= 400:
                log.warning("Telegram send %s: %s", resp.status_code, resp.text[:200])
                return False
            return True
        except httpx.HTTPError as e:
            log.warning("Telegram send error: %s", e)
            return False

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
