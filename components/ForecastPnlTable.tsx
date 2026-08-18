import { monthShort, pct, usdFull } from "@/lib/format";
import type { ForecastMonth, ForecastResult } from "@/lib/metrics/forecast";

interface Line {
  label: string;
  pick: (row: ForecastMonth) => number;
  kind?: "total" | "subtotal" | "rate";
  indent?: boolean;
}

const LINES: Line[] = [
  { label: "DTC revenue", pick: (r) => r.dtcRevenue, indent: true },
  { label: "Wholesale revenue", pick: (r) => r.wholesaleRevenue, indent: true },
  { label: "Net revenue", pick: (r) => r.netRevenue, kind: "subtotal" },
  { label: "Cost of goods", pick: (r) => -r.cogs },
  { label: "Gross profit", pick: (r) => r.grossProfit, kind: "subtotal" },
  { label: "Gross margin", pick: (r) => r.grossMargin, kind: "rate" },
  { label: "Payroll", pick: (r) => -r.payroll, indent: true },
  { label: "Rent", pick: (r) => -r.rent, indent: true },
  { label: "Software", pick: (r) => -r.software, indent: true },
  { label: "Freight", pick: (r) => -r.freight, indent: true },
  { label: "Processing fees", pick: (r) => -r.processingFees, indent: true },
  { label: "Ad spend", pick: (r) => -r.adSpend, indent: true },
  { label: "General & admin", pick: (r) => -r.gAndA, indent: true },
  { label: "Total opex", pick: (r) => -r.totalOpex, kind: "subtotal" },
  { label: "EBITDA", pick: (r) => r.ebitda, kind: "total" },
];

/**
 * The forward P&L, monthly columns plus a full-year total.
 *
 * Costs are shown as negatives so the column adds down to EBITDA the way a
 * statement does, rather than leaving the reader to work out which lines to
 * subtract.
 */
export function ForecastPnlTable({ result }: { result: ForecastResult }) {
  const total = (line: Line) => {
    if (line.kind === "rate") {
      const revenue = result.totals.netRevenue;
      return revenue ? result.totals.grossProfit / revenue : 0;
    }
    return result.months.reduce((sum, row) => sum + line.pick(row), 0);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11.5px]">
        <caption className="sr-only">
          Twelve-month forward profit and loss on the current driver settings
        </caption>
        <thead>
          <tr className="border-b border-rule">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-surface px-2 py-2 text-left font-medium text-muted"
            >
              Line
            </th>
            {result.months.map((row) => (
              <th
                key={row.month}
                scope="col"
                className="whitespace-nowrap px-2 py-2 text-right font-medium text-muted"
              >
                {monthShort(row.month)}
              </th>
            ))}
            <th
              scope="col"
              className="whitespace-nowrap border-l border-rule px-2 py-2 text-right font-semibold text-ink"
            >
              FY total
            </th>
          </tr>
        </thead>
        <tbody className="fig">
          {LINES.map((line) => {
            const emphasis =
              line.kind === "total"
                ? "font-semibold text-ink"
                : line.kind === "subtotal"
                  ? "font-medium text-ink"
                  : "text-muted";
            const border =
              line.kind === "total" || line.kind === "subtotal"
                ? "border-t border-rule"
                : "";

            return (
              <tr key={line.label} className={border}>
                <th
                  scope="row"
                  className={`sticky left-0 z-10 whitespace-nowrap bg-surface px-2 py-1.5 text-left ${emphasis} ${
                    line.indent ? "pl-5" : ""
                  }`}
                  style={{ fontVariantNumeric: "normal", fontWeight: line.kind ? undefined : 400 }}
                >
                  {line.label}
                </th>
                {result.months.map((row) => {
                  const value = line.pick(row);
                  return (
                    <td
                      key={row.month}
                      className={`whitespace-nowrap px-2 py-1.5 text-right ${emphasis}`}
                    >
                      {line.kind === "rate" ? pct(value) : usdFull(value)}
                    </td>
                  );
                })}
                <td
                  className={`whitespace-nowrap border-l border-rule px-2 py-1.5 text-right ${
                    line.kind === "total" || line.kind === "subtotal"
                      ? "font-semibold text-ink"
                      : "text-ink"
                  }`}
                >
                  {line.kind === "rate"
                    ? pct(total(line))
                    : usdFull(total(line))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
