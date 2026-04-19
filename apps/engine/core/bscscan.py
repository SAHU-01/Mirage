import httpx
import os
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

class BscScanClient:
    def __init__(self):
        self.api_key = os.getenv("BSCSCAN_API_KEY")
        self.base_url = "https://api.bscscan.com/api"

    async def get_token_transactions(self, token_address: str, start_block: int = 0) -> List[Dict]:
        params = {
            "module": "account",
            "action": "tokentx",
            "contractaddress": token_address,
            "startblock": start_block,
            "endblock": 99999999,
            "sort": "asc",
            "apikey": self.api_key
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(self.base_url, params=params)
            data = response.json()
            if data["status"] == "1":
                return data["result"]
            return []

    async def get_wallet_transactions(self, wallet_address: str) -> List[Dict]:
        params = {
            "module": "account",
            "action": "txlist",
            "address": wallet_address,
            "startblock": 0,
            "endblock": 99999999,
            "sort": "desc",
            "apikey": self.api_key
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(self.base_url, params=params)
            data = response.json()
            if data["status"] == "1":
                return data["result"]
            return []
