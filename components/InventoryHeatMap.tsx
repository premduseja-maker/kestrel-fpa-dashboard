"use client";

import { monthShort } from "@/lib/format";
import type { HeatRow } from "@/lib/metrics/cash";

/**
 * Months of cover by category and month.
 *
 * A sequential single-hue ramp: more cover, deeper signal. The cell value is
 * printed in every cell rather than left to a tooltip, so the grid doubles as its
 * own table and nothing is gated behind hovering.
 *
 * The ramp is capped at 70% so the ink stays legible on the deepest cell in both
 * themes; magnitude beyond the cap is carried by the printed figure.
 */
export function InventoryHeatMap({
  rows,
  targetCover,
}: {
  rows: HeatRow[];
  targetCover: number;
}) {
  const all = rows.flatMap((row) => row.cells.map((cell) => cell.monthsOnHand));
  const max = Math.max(...all, targetCover);
  const min = Math.min(...all);
  const span = max - min || 1;

  const mix = (value: number) => {
    const ratio = (value - min) / span;
    return `color-mix(in oklab, var(--signal) ${(ratio * 70).toFixed(
      1,
    )}%, var(--surface))`;
  };

  const months = rows[0]?.cells.map((cell) => cell.month) ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[10.5px]">
        <caption className="sr-only">
          Months of inventory cover by category and month
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-surface px-2 py-1 text-left font-medium text-muted">
              Category
            </th>
            {months.map((month, index) => (
              <th
                key={month}
                scope="col"
                className="px-1 py-1 text-center font-medium text-muted"
              >
                {index % 3 === 0 || index === months.length - 1
                  ? monthShort(month)
                  : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="fig">
          {rows.map((row) => (
            <tr key={row.category}>
              <th
                scope="row"
                className="sticky left-0 z-10 whitespace-nowrap bg-surface px-2 py-1 text-left font-normal text-ink"
                style={{ fontVariantNumeric: "normal" }}
              >
                {row.category}
              </th>
              {row.cells.map((cell) => (
                <td
                  key={cell.month}
                  className="px-1 py-1 text-center text-ink"
                  style={{
                    background: mix(cell.monthsOnHand),
                    // A 2px surface gap does the separating, never a border.
                    outline: "2px solid var(--surface)",
                    outlineOffset: -1,
                  }}
                  title={`${row.category} · ${monthShort(cell.month)} · ${cell.monthsOnHand.toFixed(1)} months cover`}
                >
                  {cell.monthsOnHand.toFixed(1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] text-muted">
        <span>Months of cover</span>
        <span className="flex items-center gap-1">
          <span className="fig">{min.toFixed(1)}</span>
          <span
            aria-hidden="true"
            className="h-2.5 w-24 border border-rule"
            style={{
              background: `linear-gradient(to right, ${mix(min)}, ${mix(max)})`,
            }}
          />
          <span className="fig">{max.toFixed(1)}</span>
        </span>
        <span>
          Target cover <span className="fig">{targetCover.toFixed(1)}</span>{" "}
          months
        </span>
      </div>
    </div>
  );
}
