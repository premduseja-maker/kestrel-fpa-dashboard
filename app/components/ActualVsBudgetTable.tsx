import { money, monthLabel, pctChangeSigned } from "../lib/format";
import type { ActualVsBudgetPoint } from "../lib/overview";

/**
 * The table twin of a chart card. Every value the plot shows on hover is
 * readable here without a pointer.
 */
export function ActualVsBudgetTable({
  data,
  valueLabel,
  caption,
}: {
  data: ActualVsBudgetPoint[];
  valueLabel: string;
  caption: string;
}) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-md border border-hairline">
      <table className="w-full border-collapse text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface-1">
          <tr className="border-b border-hairline text-ink-secondary">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Month
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {valueLabel}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Budget
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Variance
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Variance %
            </th>
          </tr>
        </thead>
        <tbody className="tnum">
          {data.map((row) => (
            <tr key={row.month} className="border-b border-hairline last:border-0">
              <th
                scope="row"
                className="px-3 py-1.5 text-left font-normal text-ink-secondary"
              >
                {monthLabel(row.month)}
              </th>
              <td className="px-3 py-1.5 text-right text-ink-primary">
                {money(row.actual)}
              </td>
              <td className="px-3 py-1.5 text-right text-ink-secondary">
                {money(row.budget)}
              </td>
              <td
                className={`px-3 py-1.5 text-right ${
                  row.variance >= 0 ? "text-delta-up" : "text-delta-down"
                }`}
              >
                {row.variance >= 0 ? "+" : "-"}
                {money(Math.abs(row.variance))}
              </td>
              <td className="px-3 py-1.5 text-right text-ink-secondary">
                {row.budget === 0
                  ? "—"
                  : pctChangeSigned(row.variance / Math.abs(row.budget))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
