"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Chart and its table twin, with a toggle.
 *
 * An SVG chart made by Recharts is not reachable by keyboard and its values live
 * in a pointer-driven tooltip, so on its own it gates the data behind a mouse.
 * The table is the WCAG-clean equivalent — same numbers, ordinary markup,
 * focusable and readable by a screen reader — and no value on this dashboard is
 * available only by hovering.
 */
export function ChartWithTable({
  label,
  chart,
  table,
}: {
  /** Names the pair for assistive tech, e.g. "gross margin by category". */
  label: string;
  chart: ReactNode;
  table: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const panelId = useId();

  return (
    <div>
      <div className="flex justify-end pb-2">
        <div
          className="flex overflow-hidden border border-rule"
          role="group"
          aria-label={`View ${label} as`}
          style={{ borderRadius: 5 }}
        >
          {(["chart", "table"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-pressed={view === mode}
              aria-controls={panelId}
              className={`px-2.5 py-1 text-[11px] capitalize transition-colors ${
                view === mode
                  ? "bg-ink-wash font-semibold text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div id={panelId}>{view === "chart" ? chart : table}</div>
    </div>
  );
}

export interface Column<T> {
  header: string;
  /** Pre-formatted cell contents. */
  cell: (row: T) => string;
  align?: "left" | "right";
}

/**
 * Generic figures table used as the twin for every chart that needs one, so the
 * markup, scrolling and caption behaviour stay identical across screens.
 */
export function FiguresTable<T>({
  caption,
  rows,
  columns,
  rowKey,
  maxHeight = 320,
}: {
  caption: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  maxHeight?: number;
}) {
  return (
    <div
      className="overflow-auto border border-rule"
      style={{ borderRadius: 5, maxHeight }}
    >
      <table className="w-full border-collapse text-[11.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-rule">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 font-medium text-muted ${
                  column.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="fig">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-rule last:border-0">
              {columns.map((column, index) =>
                index === 0 ? (
                  <th
                    key={column.header}
                    scope="row"
                    className="whitespace-nowrap px-3 py-1.5 text-left font-normal text-muted"
                    style={{ fontVariantNumeric: "normal" }}
                  >
                    {column.cell(row)}
                  </th>
                ) : (
                  <td
                    key={column.header}
                    className={`whitespace-nowrap px-3 py-1.5 text-ink ${
                      column.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {column.cell(row)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
