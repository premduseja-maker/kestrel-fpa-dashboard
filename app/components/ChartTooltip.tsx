"use client";

import { monthLabelLong } from "../lib/format";

export type TooltipRow = { label: string; value: string; color: string };

/**
 * Shared hover/focus readout. Tooltips enhance, they never gate — every value
 * here is also in the card's table view.
 */
export function ChartTooltip({
  leftPct,
  month,
  rows,
  footer,
}: {
  leftPct: number;
  month: string;
  rows: TooltipRow[];
  footer?: string;
}) {
  const flip = leftPct > 60;

  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-[172px] rounded-md border border-hairline bg-surface-1 p-2.5 shadow-lg"
      style={{
        left: `${leftPct}%`,
        transform: flip
          ? "translateX(-100%) translateX(-12px)"
          : "translateX(12px)",
      }}
      role="status"
      aria-live="polite"
    >
      <p className="text-[11px] font-medium text-ink-secondary">
        {monthLabelLong(month)}
      </p>
      <dl className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            {/* A short line key, not a filled box — at tooltip density a box is
                data-weight ink doing a label's job. */}
            <span
              aria-hidden="true"
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ background: row.color }}
            />
            {/* Value leads, label follows: the reader already has the series. */}
            <dd className="tnum m-0 text-[13px] font-semibold text-ink-primary">
              {row.value}
            </dd>
            <dt className="text-[11px] text-ink-muted">{row.label}</dt>
          </div>
        ))}
      </dl>
      {footer && (
        <p className="tnum mt-1.5 border-t border-hairline pt-1.5 text-[11px] text-ink-secondary">
          {footer}
        </p>
      )}
    </div>
  );
}
