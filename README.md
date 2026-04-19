# Mirage: Anti-Adversarial Intelligence Layer

Mirage is a multi-agent reasoning engine designed to detect adversarial bots (bundle bots, wash traders, snipers) on the BNB Chain, specifically targeting Four.meme.

## Architecture

- **`apps/engine`**: Python FastAPI service using LangGraph for multi-agent CoT reasoning.
- **`apps/bot`**: grammY Telegram Bot for quick wallet/token audits.
- **`apps/web`**: Next.js 15 dashboard for detailed analysis and ranked buyer tracking.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- API Keys: BscScan, Dune Analytics (optional), OpenAI.

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Project

#### 1. Start the Engine (Python)
```bash
cd apps/engine
pip install -r requirements.txt
uvicorn main:app --reload
```

#### 2. Start the Telegram Bot (TypeScript)
```bash
cd apps/bot
# Fill in .env with TELEGRAM_BOT_TOKEN and ENGINE_API_URL
npm run dev
```

#### 3. Start the Web Dashboard (Next.js)
```bash
cd apps/web
npm run dev
```

## Features (MVP P0)

- ✅ **Wallet Trust Verdict API**: Multi-agent reasoning on wallet funding and behavior.
- ✅ **Telegram Bot Surface**: Quick screenshot-ready audit cards.
- ✅ **Web Dashboard**: Visual trust scores and reasoning traces.
- ✅ **Feature Pipeline**: On-chain data ingestion and structural feature extraction.
