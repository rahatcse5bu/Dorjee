"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";

export interface ColumnDatum {
  key: string;
  /** Full label for the tooltip, e.g. "Mon, 3 Nov". */
  label: string;
  /** Short axis label, e.g. "3 Nov". */
  short: string;
  value: number;
}

/**
 * Single-series column chart: one hue, 4px rounded tops on a shared baseline,
 * recessive guides, and a per-bar tooltip on hover or keyboard focus.
 */
export function ColumnChart({
  data,
  format,
  ariaLabel,
  height = 176,
}: {
  data: ColumnDatum[];
  format: (value: number) => string;
  ariaLabel: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const hovered = active !== null ? data[active] : null;
  const tickIndexes = data.length <= 1 ? [0] : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <figure aria-label={ariaLabel}>
      <div className="relative" style={{ height }}>
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          <span className="border-t border-dashed border-ink/10" />
          <span className="border-t border-dashed border-ink/10" />
          <span className="border-t border-ink/15" />
        </div>
        <span className="absolute -top-2 left-0 bg-white/80 pr-1 text-[10px] text-ink/40">{format(max)}</span>

        {hovered && (
          <div
            className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{
              left: `${((active! + 0.5) / data.length) * 100}%`,
              // Anchor to the bar's side near the edges so the tooltip stays inside the card.
              transform:
                active! / data.length > 0.75 ? "translateX(-100%)" : active! / data.length < 0.25 ? "none" : "translateX(-50%)",
            }}
          >
            <span className="text-white/70">{hovered.label}</span> · <span className="font-semibold">{format(hovered.value)}</span>
          </div>
        )}

        <div className="relative flex h-full items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
          {data.map((d, i) => {
            const pct = max ? (d.value / max) * 100 : 0;
            const isActive = active === i;
            return (
              <button
                key={d.key}
                type="button"
                aria-label={`${d.label}: ${format(d.value)}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="flex h-full min-w-0 flex-1 items-end focus:outline-none"
              >
                <span
                  className={`block w-full rounded-t-[4px] transition-colors ${
                    d.value === 0 ? "bg-ink/[0.06]" : isActive ? "bg-[#0f5f68]" : "bg-teal"
                  } ${active !== null && !isActive && d.value > 0 ? "opacity-50" : ""}`}
                  style={{ height: d.value === 0 ? "3px" : `${Math.max(pct, 3)}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative mt-2 h-4 text-[11px] text-ink/45">
        {tickIndexes.map((i, n) => (
          <span
            key={i}
            className="absolute whitespace-nowrap"
            style={
              n === 0
                ? { left: 0 }
                : n === tickIndexes.length - 1
                  ? { right: 0 }
                  : { left: `${((i + 0.5) / data.length) * 100}%`, transform: "translateX(-50%)" }
            }
          >
            {data[i]?.short}
          </span>
        ))}
      </div>
    </figure>
  );
}

export interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
  /** Text shown at the end of the row, e.g. "৳12,400". */
  display: string;
  /** Secondary text under the label. */
  sub?: string;
  /** Optional marker before the label (e.g. a status dot). */
  marker?: ReactNode;
  href?: string;
}

/** Ranked horizontal bars with direct value labels. */
export function BarList({ rows, emptyText }: { rows: BarRow[]; emptyText: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-ink/45">{emptyText}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {row.marker}
                <span className="truncate font-medium text-ink">{row.label}</span>
                {row.sub && <span className="shrink-0 text-xs text-ink/45">{row.sub}</span>}
              </span>
              <span className="shrink-0 font-semibold text-ink">{row.display}</span>
            </div>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
              <span className="block h-full rounded-full bg-teal/80" style={{ width: `${(row.value / max) * 100}%` }} />
            </span>
          </>
        );
        return (
          <li key={row.key}>
            {row.href ? (
              <Link href={row.href} className="block rounded-lg hover:bg-teal/[0.03]">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
