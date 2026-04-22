"use client";
import { useState, type FormEvent } from "react";
import { analyzeAuto, analyzeToken, analyzeWallet } from "@/lib/api";
import type { TokenVerdict, WalletVerdict } from "@/lib/api";
import { AccuracyStrip } from "@/components/AccuracyStrip";
import { HowItWorks } from "@/components/HowItWorks";
import { TokenCard } from "@/components/TokenCard";
import { WalletCard } from "@/components/WalletCard";

type Mode = "auto" | "token" | "wallet";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<TokenVerdict | null>(null);
  const [wallet, setWallet] = useState<WalletVerdict | null>(null);
  const [detected, setDetected] = useState<"token" | "wallet" | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setToken(null);
    setWallet(null);
    setDetected(null);
    const addr = input.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError("Enter a valid 0x… BNB address (40 hex chars).");
      return;
    }
    setLoading(true);
    try {
      if (mode === "auto") {
        const res = await analyzeAuto(addr);
        setDetected(res.kind);
        if (res.kind === "token") setToken(res.verdict);
        else setWallet(res.verdict);
      } else if (mode === "token") {
        setToken(await analyzeToken(addr));
      } else {
        setWallet(await analyzeWallet(addr));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100">
          Mirage
        </h1>
        <p className="mt-2 text-neutral-400">
          We don&apos;t rank wallets. We reason about them — and show you our
          work.
        </p>
      </header>

      <AccuracyStrip />
      <HowItWorks />

      <form onSubmit={onSubmit} className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["auto", "token", "wallet"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition ${
                mode === m
                  ? "bg-neutral-100 text-neutral-900"
                  : "bg-neutral-800 text-neutral-300"
              }`}
            >
              {m}
            </button>
          ))}
          <span className="ml-auto text-xs text-neutral-500">
            Auto-detect routes token contracts → token analysis, EOAs → wallet
            analysis.
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a BNB Chain address — 0x…"
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-white disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        {error && <div className="text-sm text-avoid">{error}</div>}
        {detected && (
          <div className="text-sm text-neutral-400">
            Auto-detected as{" "}
            <span className="font-semibold text-neutral-200">{detected}</span>.
          </div>
        )}
      </form>

      {token && <TokenCard v={token} />}
      {wallet && <WalletCard v={wallet} />}

      {!token && !wallet && !loading && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-sm text-neutral-400">
          <p className="mb-2 font-medium text-neutral-200">Try it:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Paste a recent Four.meme token address → see early-buyer bundle
              contamination, graduation probability, and ranked buyer table.
            </li>
            <li>
              Paste any &quot;smart money&quot; wallet you&apos;re considering
              copy-trading → see full feature breakdown, per-agent reasoning,
              and subscribe to exit signals.
            </li>
          </ul>
        </div>
      )}
    </main>
  );
}
