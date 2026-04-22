"use client";
import { useState } from "react";
import type { AgentTrace } from "@/lib/api";
import { bscscanAddress, bscscanBlock, bscscanTx } from "@/lib/api";

export function ReasoningDrawer({ trace }: { trace: AgentTrace[] }) {
  const [open, setOpen] = useState(false);
  if (!trace.length) return null;

  return (
    <div>
      <button
        className="text-sm text-neutral-300 underline-offset-4 hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide" : "↘ Expand"} full chain of thought
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          {trace.map((t) => (
            <div
              key={t.agent}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold uppercase tracking-wide text-neutral-200">
                  {t.agent} Agent
                </div>
                <div className="text-xs text-neutral-400">
                  score {t.score}/100
                </div>
              </div>
              <ul className="space-y-1 text-sm text-neutral-300">
                {t.findings.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
              {t.citations.length > 0 && (
                <div className="mt-3 border-t border-neutral-800 pt-2">
                  <div className="mb-1 text-xs font-medium text-neutral-500">
                    Evidence cited
                  </div>
                  <ul className="space-y-1 text-xs text-neutral-400">
                    {t.citations.map((c, i) => (
                      <li key={i} className="flex flex-wrap gap-2">
                        <span className="text-neutral-300">{c.claim}</span>
                        {c.block_number != null && (
                          <a
                            href={bscscanBlock(c.block_number)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded bg-neutral-800 px-2 py-0.5 hover:bg-neutral-700"
                          >
                            block {c.block_number} ↗
                          </a>
                        )}
                        {c.tx_hash && (
                          <a
                            href={bscscanTx(c.tx_hash)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded bg-neutral-800 px-2 py-0.5 hover:bg-neutral-700"
                          >
                            tx {c.tx_hash.slice(0, 10)}… ↗
                          </a>
                        )}
                        {c.wallet_address && (
                          <a
                            href={bscscanAddress(c.wallet_address)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded bg-neutral-800 px-2 py-0.5 hover:bg-neutral-700"
                          >
                            wallet {c.wallet_address.slice(0, 6)}…
                            {c.wallet_address.slice(-4)} ↗
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
