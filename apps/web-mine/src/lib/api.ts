export type Citation = {
  claim: string;
  block_number: number | null;
  tx_hash: string | null;
  wallet_address: string | null;
};

export type AgentTrace = {
  agent: string;
  score: number;
  findings: string[];
  citations: Citation[];
};

export type WalletVerdict = {
  wallet_address: string;
  token_address: string | null;
  verdict: "COPY" | "AVOID" | "UNCERTAIN";
  trust_score: number;
  counter_argument: string;
  reasoning_trace: AgentTrace[];
  features: Record<string, number>;
  verdict_id?: string;
};

export type RankedBuyer = {
  wallet_address: string;
  trust_score: number;
  verdict: "COPY" | "AVOID" | "UNCERTAIN";
};

export type TokenMetadata = {
  name?: string | null;
  symbol?: string | null;
  decimals?: number | null;
  logo?: string | null;
};

export type TokenVerdict = {
  token_address: string;
  verdict: "COPY" | "AVOID" | "UNCERTAIN";
  trust_score: number;
  bundle_contamination_pct: number;
  graduation_probability: number;
  ranked_buyers: RankedBuyer[];
  counter_argument: string;
  verdict_id?: string;
  metadata?: TokenMetadata | null;
  total_early_buyers: number;
  first_tx_ts?: number | null;
  last_tx_ts?: number | null;
  window_minutes: number;
};

export type AutoAnalyzeResult =
  | { kind: "token"; verdict: TokenVerdict }
  | { kind: "wallet"; verdict: WalletVerdict };

export type AccuracySummary = {
  enabled: boolean;
  total_resolved?: number;
  scored?: number;
  correct?: number;
  accuracy?: number | null;
};

const API_URL =
  process.env.NEXT_PUBLIC_ENGINE_API_URL || "http://localhost:8000";

export async function analyzeWallet(
  wallet_address: string,
  token_address?: string,
): Promise<WalletVerdict> {
  const res = await fetch(`${API_URL}/analyze_wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet_address, token_address }),
  });
  if (!res.ok) throw new Error(`Engine returned ${res.status}`);
  return res.json();
}

export async function analyzeToken(
  token_address: string,
  window_minutes = 8,
): Promise<TokenVerdict> {
  const res = await fetch(`${API_URL}/analyze_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token_address, window_minutes }),
  });
  if (!res.ok) throw new Error(`Engine returned ${res.status}`);
  return res.json();
}

export async function analyzeAuto(
  address: string,
  window_minutes = 8,
): Promise<AutoAnalyzeResult> {
  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, window_minutes }),
  });
  if (!res.ok) throw new Error(`Engine returned ${res.status}`);
  return res.json();
}

export async function subscribe(chat_id: number, wallet_address: string) {
  const res = await fetch(`${API_URL}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id, wallet_address }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Subscription failed" }));
    throw new Error(body.detail || `Engine returned ${res.status}`);
  }
  return res.json();
}

export async function getAccuracy(): Promise<AccuracySummary> {
  const res = await fetch(`${API_URL}/accuracy?days=30`);
  if (!res.ok) throw new Error(`Engine returned ${res.status}`);
  return res.json();
}

export function bscscanTx(hash: string) {
  return `https://bscscan.com/tx/${hash}`;
}
export function bscscanBlock(block: number) {
  return `https://bscscan.com/block/${block}`;
}
export function bscscanAddress(address: string) {
  return `https://bscscan.com/address/${address}`;
}
