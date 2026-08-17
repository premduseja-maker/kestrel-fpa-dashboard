"use client";

import { useState, type ReactNode } from "react";

export type LegendEntry = {
  label: string;
  color: string;
  /** Legends mirror the mark: a line key for lines, a swatch for bars/areas. */
  shape: "line" | "rect";
};

/**
 * Card chrome shared by every chart: title, legend, and the chart/table toggle.
 *
 * The table view is not an extra — it's the WCAG-clean twin of the plot, so no
 * value is reachable only by hovering.
 */
export function ChartCard({
  title,
  subtitle,
  legend,
  chart,
  table,
}: {
  title: string;
  subtitle?: string;
  legend: LegendEntry[];
  chart: ReactNode;
  table: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-primary">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-ink-secondary">{subtitle}</p>
          )}
        </div>

        <div
          className="flex shrink-0 overflow-hidden rounded-md border border-hairline"
          role="group"
          aria-label={`${title} view`}
        >
          {(["chart", "table"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-pressed={view === mode}
              className={`px-2.5 py-1 text-[12px] capitalize transition-colors ${
                view === mode
                  ? "bg-wash font-medium text-ink-primary"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {legend.length > 1 && (
        <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {legend.map((entry) => (
            <li
              key={entry.label}
              className="flex items-center gap-1.5 text-[12px] text-ink-secondary"
            >
              {entry.shape === "line" ? (
                <span
                  aria-hidden="true"
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: entry.color }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: entry.color }}
                />
              )}
              {entry.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">{view === "chart" ? chart : table}</div>
    </section>
  );
}
