from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from agents.reasoner import MirageReasoner
from core.bscscan import BscScanClient
from core.features import FeatureExtractor
import os

app = FastAPI(title="Mirage Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

reasoner = MirageReasoner()
bsc_client = BscScanClient()

class AnalysisResponse(BaseModel):
    verdict: str
    score: int
    reasoning: List[str]
    wallet_address: str
    token_address: Optional[str]

@app.get("/")
async def root():
    return {"message": "Mirage Engine API is running"}

@app.post("/analyze_wallet", response_model=AnalysisResponse)
async def analyze_wallet(wallet_address: str, token_address: Optional[str] = None):
    try:
        # 1. Fetch data
        txs = await bsc_client.get_wallet_transactions(wallet_address)
        
        # 2. Extract features
        features = {
            "tx_count": len(txs),
            "bundle_coefficient": FeatureExtractor.calculate_bundle_coefficient(txs),
            "timing_entropy": FeatureExtractor.calculate_timing_entropy([int(tx['timeStamp']) for tx in txs])
        }
        
        # 3. Run reasoner
        state = {
            "wallet_address": wallet_address,
            "token_address": token_address,
            "features": features,
            "reasoning_trace": []
        }
        result = await reasoner.app.ainvoke(state)
        
        return AnalysisResponse(
            verdict=result.get("final_verdict", "UNCERTAIN"),
            score=result.get("trust_score", 50),
            reasoning=result.get("reasoning_trace", []),
            wallet_address=wallet_address,
            token_address=token_address
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_token")
async def analyze_token(token_address: str):
    # Similar logic for token analysis
    return {"message": "Token analysis implementation pending"}
