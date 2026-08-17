"use client";

import { useMemo } from "react";
import { Card, CardHeader } from "@/components/Card";
import { KpiStrip, KpiStripSkeleton } from "@/components/KpiStrip";
import {
  WaterfallChart,
  WATERFALL_HEIGHT,
} from "@/components/WaterfallChart";
import {
  RevenueEbitdaChart,
  REVENUE_EBITDA_HEIGHT,
} from "@/components/RevenueEbitdaChart";
import { useDashboard } from "@/components/DashboardProvider";
import { monthLong, monthShort, usdFull } from "@/lib/format";
import { ebitdaBridge, findMonth } from "@/lib/metrics/core";
import { executiveKpis } from "@/lib/metrics/executive";

export default function ExecutiveSummary() {
  const { status, error, pl, cashflow, budget, selectedMonth } = useDashboard();

  const model = useMemo(() => {
    if (status !== "ready" || !selectedMonth) return null;

    const actualRow = findMonth(pl, selectedMonth);
    const budgetRow = findMonth(budget, selectedMonth);

    return {
      kpis: executiveKpis(pl, cashflow, selectedMonth),
      markerIndex: pl.findIndex((row) => row.month === selectedMonth),
      bridge:
        actualRow && budgetRow ? ebitdaBridge(actualRow, budgetRow) : null,
    };
  }, [status, pl, cashflow, budget, selectedMonth]);

  if (status === "error") {
    return (
      <Card className="p-5">
        <h1 className="heading text-[14px] text-unfavourable">
          Could not load the data
        </h1>
        <p className="mt-1.5 text-[12px] text-muted">
          {error ?? "Unknown error"}. The datasets are served from{" "}
          <code>public/data</code>; check they are present and reload.
        </p>
      </Card>
    );
  }

  return (
    /* min-w-0 on every grid child: a grid item defaults to min-width:auto, so it
       refuses to shrink below its content's intrinsic width and a chart pushes
       the whole page into a horizontal scroll at 390px. */
    <div className="grid grid-cols-12 gap-4">
      <header className="col-span-12 min-w-0">
        <h1 className="heading text-[17px] text-ink">Executive summary</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          {selectedMonth
            ? `Reporting month ${monthLong(selectedMonth)}`
            : "Loading reporting month"}
        </p>
      </header>

      <section className="col-span-12 min-w-0" aria-label="Headline measures">
        {model ? (
          <KpiStrip kpis={model.kpis} markerIndex={model.markerIndex} />
        ) : (
          <KpiStripSkeleton />
        )}
      </section>

      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="Revenue against EBITDA"
            subtitle="Monthly, all 24 months. Left axis net revenue, right axis EBITDA — two scales, so read each line against its own axis and take the movements, not the crossing point, as the story."
          />
          <div className="min-w-0 px-2 pb-4 pt-2 sm:px-3">
            {model ? (
              <RevenueEbitdaChart pl={pl} />
            ) : (
              <ChartSkeleton height={REVENUE_EBITDA_HEIGHT} />
            )}
          </div>
        </Card>
      </section>

      <section className="col-span-12 min-w-0 lg:col-span-7">
        <Card>
          <CardHeader
            title={
              selectedMonth
                ? `Budget to actual EBITDA — ${monthShort(selectedMonth)}`
                : "Budget to actual EBITDA"
            }
            subtitle="Four effects, summing exactly to the variance: revenue at budget margin, margin rate on actual revenue, ad spend, and all other opex."
          />
          <div className="min-w-0 px-2 pb-4 pt-2 sm:px-3">
            {model?.bridge ? (
              <WaterfallChart
                bars={model.bridge.bars}
                floor={model.bridge.floor}
                ceiling={model.bridge.ceiling}
                shortLabels={{
                  "Budget EBITDA": "Budget",
                  "Actual EBITDA": "Actual",
                }}
                totalMeaning="EBITDA level"
              />
            ) : model ? (
              <NoBudget />
            ) : (
              <ChartSkeleton height={WATERFALL_HEIGHT} />
            )}
          </div>
        </Card>
      </section>

      <section className="col-span-12 min-w-0 lg:col-span-5">
        <Card className="h-full">
          <CardHeader
            title="Variance detail"
            subtitle="The same bridge as figures, so every value is readable without hovering."
          />
          <div className="min-w-0 overflow-x-auto px-4 pb-5 pt-3 sm:px-5">
            {model?.bridge ? (
              <table className="w-full border-collapse text-[12px]">
                <caption className="sr-only">
                  Budget EBITDA to actual EBITDA, by effect
                </caption>
                <tbody className="fig">
                  {model.bridge.bars.map((bar) => (
                    <tr key={bar.label} className="border-b border-rule last:border-0">
                      <th
                        scope="row"
                        className={`py-1.5 pr-3 text-left font-normal ${
                          bar.kind === "total" ? "text-ink" : "text-muted"
                        }`}
                        style={{ fontFamily: "var(--font-plex-sans)" }}
                      >
                        {bar.label}
                      </th>
                      <td
                        className={`py-1.5 text-right ${
                          bar.kind === "total"
                            ? "font-semibold text-ink"
                            : bar.favourable
                              ? "text-favourable"
                              : "text-unfavourable"
                        }`}
                      >
                        {usdFull(bar.value)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th
                      scope="row"
                      className="py-2 pr-3 text-left font-semibold text-ink"
                      style={{ fontFamily: "var(--font-plex-sans)" }}
                    >
                      Total variance
                    </th>
                    <td
                      className={`py-2 text-right font-semibold ${
                        model.bridge.totalVariance >= 0
                          ? "text-favourable"
                          : "text-unfavourable"
                      }`}
                    >
                      {usdFull(model.bridge.totalVariance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : model ? (
              <NoBudget />
            ) : (
              <ChartSkeleton height={WATERFALL_HEIGHT} />
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse rounded-sm bg-ink-wash"
      style={{ height, borderRadius: 2 }}
      aria-hidden="true"
    />
  );
}

function NoBudget() {
  return (
    <p className="text-[12px] text-muted">
      No budget row for the selected month, so no bridge can be drawn.
    </p>
  );
}
