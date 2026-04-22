"use client";
import { useEffect, useState } from "react";
import { getAccuracy, type AccuracySummary } from "@/lib/api";

export function AccuracyStrip() {
  const [a, setA] = useState<AccuracySummary | null>(null);

  useEffect(() => {
    let mounted = true;
    getAccuracy()
      .then((x) => mounted && setA(x))
      .catch(() => mounted && setA({ enabled: false }));
    return () => {
      mounted = false;
    };
  }, []);

  if (!a) return null;
  if (!a.enabled) {
    return (
      <div className="mb-6 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-500">
        Accuracy tracking enables automatically once MongoDB is connected and
        the first verdicts age past 24h.
      </div>
    );
  }
  const acc = a.accuracy;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs">
      <span className="text-neutral-500">Mirage last 30d:</span>
      <span className="text-neutral-300">
        <span className="font-semibold text-neutral-100">
          {a.total_resolved ?? 0}
        </span>{" "}
        verdicts resolved
      </span>
      <span className="text-neutral-300">
        <span className="font-semibold text-neutral-100">{a.scored ?? 0}</span>{" "}
        scored
      </span>
      <span className="text-neutral-300">
        accuracy{" "}
        <span className="font-semibold text-neutral-100">
          {acc == null ? "—" : `${(acc * 100).toFixed(0)}%`}
        </span>
      </span>
    </div>
  );
}
