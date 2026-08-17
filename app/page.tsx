import Link from "next/link";
import { ActualVsBudgetTable } from "./components/ActualVsBudgetTable";
import { ChartCard } from "./components/ChartCard";
import { StatTile } from "./components/StatTile";
import { TrendChart } from "./components/TrendChart";
import { VarianceChart } from "./components/VarianceChart";
import { monthLabelLong } from "./lib/format";
import {
  DEFAULT_RANGE,
  getOverview,
  parseRange,
  RANGES,
  type RangeMonths,
} from "./lib/overview";

export default async function OverviewPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const rangeParam = Array.isArray(params.range) ? params.range[0] : params.range;
  const range = parseRange(rangeParam);
  const overview = await getOverview(range);

  // Drives how the variance card is framed: an all-one-sided series reads better
  // as a shortfall growing up from a baseline than as bars hanging off zero.
  const allUnfavourable = overview.ebitda.every((d) => d.variance <= 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-primary">
            Overview
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            {monthLabelLong(overview.periodStart)} –{" "}
            {monthLabelLong(overview.periodEnd)}
          </p>
        </div>

        {/* One filter row, above everything it scopes: the tiles, both charts
            and both tables all re-render against this slice. */}
        <RangeFilter current={range} />
      </div>

      <section aria-label="Headline figures">
        <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">
          {overview.kpis.map((kpi) => (
            <li key={kpi.label}>
              <StatTile kpi={kpi} />
            </li>
          ))}
        </ul>
      </section>

      <ChartCard
        title="Net revenue vs budget"
        subtitle="Monthly, actual against plan"
        legend={[
          { label: "Actual", color: "var(--series-1)", shape: "line" },
          { label: "Budget", color: "var(--series-2)", shape: "line" },
        ]}
        chart={<TrendChart data={overview.revenue} valueLabel="Net revenue" />}
        table={
          <ActualVsBudgetTable
            data={overview.revenue}
            valueLabel="Net revenue"
            caption="Monthly net revenue, actual against budget, with variance"
          />
        }
      />

      <ChartCard
        title={
          allUnfavourable
            ? "EBITDA shortfall against budget"
            : "EBITDA variance to budget"
        }
        subtitle={
          allUnfavourable
            ? `Budget less actual, by month — every one of these ${overview.ebitda.length} months fell short`
            : "Actual less budget, by month"
        }
        legend={
          allUnfavourable
            ? [{ label: "Shortfall", color: "var(--neg)", shape: "rect" }]
            : [
                { label: "Favourable", color: "var(--pos)", shape: "rect" },
                { label: "Unfavourable", color: "var(--neg)", shape: "rect" },
              ]
        }
        chart={<VarianceChart data={overview.ebitda} />}
        table={
          <ActualVsBudgetTable
            data={overview.ebitda}
            valueLabel="EBITDA"
            caption="Monthly EBITDA, actual against budget, with variance"
          />
        }
      />

      <p className="text-[12px] leading-relaxed text-ink-muted">
        Figures are read from the static datasets in <code>public/data</code>.
        Those files carry no currency field, so the unit shown is an assumption
        set in <code>app/lib/format.ts</code>. Note that SKU-level revenue in{" "}
        <code>sku_monthly</code> does not reconcile to the P&amp;L net revenue
        above — the two are independent series in the source data.
      </p>
    </div>
  );
}

function RangeFilter({ current }: { current: RangeMonths }) {
  return (
    <nav aria-label="Date range" className="flex items-center gap-2">
      <span className="text-[12px] text-ink-muted">Range</span>
      <ul className="flex overflow-hidden rounded-md border border-hairline">
        {RANGES.map((months) => {
          const active = months === current;
          return (
            <li key={months}>
              <Link
                href={months === DEFAULT_RANGE ? "/" : `/?range=${months}`}
                aria-current={active ? "page" : undefined}
                className={`block px-3 py-1 text-[12px] transition-colors ${
                  active
                    ? "bg-wash font-medium text-ink-primary"
                    : "text-ink-secondary hover:text-ink-primary"
                }`}
              >
                {months}M
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
