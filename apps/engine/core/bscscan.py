import httpx
import os
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()


class BscScanClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("BSCSCAN_API_KEY")
        self.base_url = "https://api.bscscan.com/api"
        self._client: Optional[httpx.AsyncClient] = None

    async def _get(self, params: Dict) -> List[Dict]:
        params = {**params, "apikey": self.api_key}
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=20.0)
        resp = await self._client.get(self.base_url, params=params)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "1":
            return data.get("result", [])
        return []

    async def get_wallet_transactions(self, wallet_address: str, start_block: int = 0) -> List[Dict]:
        return await self._get({
            "module": "account",
            "action": "txlist",
            "address": wallet_address,
            "startblock": start_block,
            "endblock": 99999999,
            "sort": "desc",
        })

    async def get_token_transfers_for_wallet(self, wallet_address: str) -> List[Dict]:
        """ERC20 transfer events in/out of a wallet — used to derive token-level PnL."""
        return await self._get({
            "module": "account",
            "action": "tokentx",
            "address": wallet_address,
            "startblock": 0,
            "endblock": 99999999,
            "sort": "desc",
        })

    async def get_token_transactions(self, token_address: str, start_block: int = 0) -> List[Dict]:
        return await self._get({
            "module": "account",
            "action": "tokentx",
            "contractaddress": token_address,
            "startblock": start_block,
            "endblock": 99999999,
            "sort": "asc",
        })

    async def get_early_buyers(
        self,
        token_address: str,
        window_minutes: int = 8,
    ) -> List[Dict]:
        """Buyers in the first N minutes after the token's first observed transfer."""
        txs = await self.get_token_transactions(token_address)
        if not txs:
            return []
        first_ts = int(txs[0].get("timeStamp", 0))
        cutoff = first_ts + window_minutes * 60
        seen_wallets = set()
        buyers: List[Dict] = []
        for tx in txs:
            if int(tx.get("timeStamp", 0)) > cutoff:
                break
            buyer = tx.get("to", "").lower()
            if buyer and buyer not in seen_wallets:
                seen_wallets.add(buyer)
                buyers.append(tx)
        return buyers

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
