"use client";

import { isFull, isNearlyFull } from "../lib/limits";

/** A slim usage bar, e.g. "120 of 500 customers". Hidden when there is no limit. */
export function LimitMeter({ used, limit, label, note }: { used: number; limit: number; label: string; note?: string }) {
  if (limit <= 0) return null;
  const full = isFull({ used, limit });
  const near = isNearlyFull({ used, limit });
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="min-w-[180px]">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className={`font-semibold ${full ? "text-coral" : near ? "text-amber-700" : "text-ink/60"}`}>{label}</span>
        {note && <span className="text-ink/40">{note}</span>}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]">
        <div className={`h-full rounded-full ${full ? "bg-coral" : near ? "bg-amber-500" : "bg-teal"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
