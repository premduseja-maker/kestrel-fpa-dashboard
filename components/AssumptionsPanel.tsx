import { days, monthLong, pct, usdFull } from "@/lib/format";
import type { CashAssumptions } from "@/lib/metrics/cash";

/**
 * Every input the forecast runs on, beside the chart.
 *
 * A forecast a reader cannot inspect is a forecast they will not trust, so the
 * derived input is labelled as derived rather than presented alongside the
 * measured ones as though it came from the file.
 */
export function AssumptionsPanel({
  assumptions,
}: {
  assumptions: CashAssumptions;
}) {
  const rows: { label: string; value: string; derived?: boolean }[] = [
    { label: "Opening cash", value: usdFull(assumptions.openingCash) },
    { label: "Opening receivables", value: usdFull(assumptions.openingAr) },
    {
      label: "Opening payables",
      value: usdFull(assumptions.openingAp),
      derived: true,
    },
    {
      label: "Weekly revenue — DTC",
      value: usdFull(assumptions.weeklyDtcRevenue),
    },
    {
      label: "Weekly revenue — wholesale",
      value: usdFull(assumptions.weeklyWholesaleRevenue),
    },
    { label: "Gross margin", value: pct(assumptions.grossMargin) },
    { label: "Weekly purchases", value: usdFull(assumptions.weeklyCogs) },
    { label: "Weekly opex", value: usdFull(assumptions.weeklyOpex) },
    { label: "Weekly capex", value: usdFull(assumptions.weeklyCapex) },
    {
      label: "Wholesale collection days",
      value: days(assumptions.wholesaleCollectionDays),
      derived: true,
    },
    { label: "Days payables outstanding", value: days(assumptions.dpo) },
    { label: "Days inventory outstanding", value: days(assumptions.dio) },
  ];

  return (
    <div>
      <table className="w-full border-collapse text-[12px]">
        <caption className="sr-only">Forecast assumptions</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-rule last:border-0">
              <th
                scope="row"
                className="py-1.5 pr-3 text-left font-normal text-muted"
              >
                {row.label}
                {row.derived && (
                  <span className="ml-1 text-[10px] text-signal">derived</span>
                )}
              </th>
              <td className="fig py-1.5 text-right text-ink">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 border-t border-rule pt-2.5 text-[10.5px] leading-relaxed text-muted">
        Run rates are the trailing {assumptions.basisMonths} months to{" "}
        {monthLong(assumptions.asOf)}, divided into weeks. DTC sales are card
        settled and treated as collected in the week of sale; wholesale sales and
        the opening receivables collect across the wholesale terms; payables
        settle across DPO days. Purchases are held equal to COGS, which keeps
        inventory cover at the current{" "}
        <span className="fig">{days(assumptions.dio)}</span> — the forecast shows
        the present trajectory, so releasing stock has to be a decision, not
        something the model assumes for you. There is no payables table, so
        opening payables are derived from DPO against trailing purchases.
      </p>

      <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
        <span className="font-semibold text-ink">On the collection period.</span>{" "}
        The receivables file covers the ten wholesale accounts; DTC does not sit
        in it. The blended DSO reported in the cash statement is{" "}
        <span className="fig">{days(assumptions.statedDso)}</span>, but the
        balance on the book implies{" "}
        <span className="fig">{days(assumptions.wholesaleCollectionDays)}</span>{" "}
        against wholesale revenue, and that is what the model collects on — it is
        the balance actually outstanding. The two do not reconcile in the source
        data.
      </p>
    </div>
  );
}
