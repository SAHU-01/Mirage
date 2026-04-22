"use client";
import { useState } from "react";
import { subscribe } from "@/lib/api";

type Props = { wallet: string };

export function SubscribeBox({ wallet }: Props) {
  const [chatId, setChatId] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "ok" } | { kind: "error"; msg: string }
  >({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = Number(chatId.trim());
    if (!Number.isFinite(id) || id === 0) {
      setStatus({ kind: "error", msg: "Paste a numeric Telegram chat id." });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      await subscribe(id, wallet);
      setStatus({ kind: "ok" });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Subscribe failed",
      });
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-1 text-xs uppercase tracking-wider text-neutral-500">
        🔔 Exit-signal subscription
      </div>
      <p className="text-sm text-neutral-400">
        Mirage will Telegram-message you if this wallet shows distribution
        behavior (large sells, multi-token exits, transfers to fresh
        wallets).{" "}
        <span className="text-neutral-500">
          Don&apos;t have your chat id? DM the bot and send{" "}
          <code className="rounded bg-neutral-900 px-1">/chatid</code>.
        </span>
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="Your Telegram chat id (e.g. 123456789)"
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status.kind === "loading" || status.kind === "ok"}
          className="rounded-md bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-white disabled:opacity-50"
        >
          {status.kind === "loading"
            ? "Arming…"
            : status.kind === "ok"
              ? "✓ Subscribed"
              : "Subscribe"}
        </button>
      </form>
      {status.kind === "error" && (
        <div className="mt-2 text-xs text-avoid">{status.msg}</div>
      )}
      {status.kind === "ok" && (
        <div className="mt-2 text-xs text-copy">
          Armed. You&apos;ll get a Telegram ping on distribution signals.
        </div>
      )}
    </div>
  );
}
