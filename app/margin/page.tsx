"use client";

import dynamic from "next/dynamic";
import {
  CATEGORY_MARGIN_HEIGHT,
  SCATTER_HEIGHT,
  WATERFALL_HEIGHT,
} from "@/components/chart-heights";

/* Loaded on demand — see the note on the summary screen. */
const CategoryMarginChart = dynamic(
  () => import("@/components/CategoryMarginChart").then((x) => x.CategoryMarginChart),
  { ssr: false, loading: () => <Skeleton height={CATEGORY_MARGIN_HEIGHT} /> },
);
const WaterfallChart = dynamic(
  () => import("@/components/WaterfallChart").then((x) => x.WaterfallChart),
  { ssr: false, loading: () => <Skeleton height={WATERFALL_HEIGHT} /> },
);
const DiscountScatter = dynamic(
  () => import("@/components/DiscountScatter").then((x) => x.DiscountScatter),
  { ssr: false, loading: () => <Skeleton height={SCATTER_HEIGHT} /> },
);
const SkuTable = dynamic(
  () => import("@/components/SkuTable").then((x) => x.SkuTable),
  { ssr: false, loading: () => <Skeleton height={420} /> },
);

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/Card";
import { ChartWithTable, FiguresTable } from "@/components/ChartWithTable";

import { useDashboard } from "@/components/DashboardProvider";

import { Interpretation } from "@/components/Interpretation";


import { data, type SkuMaster, type SkuMonth } from "@/lib/data";
import {
  count,
  monthShort,
  pct,
  ptsMagnitude,
  statistic,
  usdFull,
} from "@/lib/format";
import {
  categoryMarginSeries,
  discountMarginPoints,
  fiscalYears,
  grossProfitBridge,
  linearFit,
  marginNarrative,
  skuMarginRows,
} from "@/lib/metrics/margin";

export default function MarginScreen() {
  const { pl, status: shellStatus } = useDashboard();

  /* sku_monthly is ~200KB and only this screen needs it, so it is fetched on
     mount rather than by the provider. The adapter caches it, so navigating away
     and back does not refetch. */
  const [skuRows, setSkuRows] = useState<SkuMonth[] | null>(null);
  const [master, setMaster] = useState<SkuMaster[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([data.getSkuMonthly(), data.getSkuMaster()])
      .then(([rows, masterRows]) => {
        if (cancelled) return;
        setSkuRows(rows);
        setMaster(masterRows);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Could not load SKUs");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(() => {
    if (pl.length === 0) return null;

    const months = pl.map((row) => row.month);
    const years = fiscalYears(months);
    const series = categoryMarginSeries(pl);

    if (!skuRows || !master) {
      return { series, years, months, narrative: null, bridge: null, skus: null, scatter: null };
    }

    const narrative = marginNarrative(pl, skuRows, years);
    const worstCategory = narrative?.worst.category ?? "Apparel";
    const scatterPoints = discountMarginPoints(skuRows, worstCategory, years);

    return {
      series,
      years,
      months,
      narrative,
      bridge: grossProfitBridge(skuRows, years),
      skus: skuMarginRows(skuRows, master, years, months),
      scatter: {
        category: worstCategory,
        points: scatterPoints,
        fit: linearFit(scatterPoints),
      },
    };
  }, [pl, skuRows, master]);

  const fyLabel = model
    ? `${monthShort(model.years.fy1[0])} – ${monthShort(
        model.years.fy1[model.years.fy1.length - 1],
      )} vs ${monthShort(model.years.fy2[0])} – ${monthShort(
        model.years.fy2[model.years.fy2.length - 1],
      )}`
    : "";

  if (shellStatus === "error" || error) {
    return (
      <Card className="p-5">
        <h1 className="heading text-[14px] text-unfavourable">
          Could not load the data
        </h1>
        <p className="mt-1.5 text-[12px] text-muted">
          {error ?? "The monthly tables failed to load."}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <header className="col-span-12 min-w-0">
        <h1 className="heading text-[17px] text-ink">Margin decomposition</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          {fyLabel || "Loading comparatives"}
        </p>
      </header>

      <section className="col-span-12 min-w-0">
        {model?.narrative ? (
          <Interpretation narrative={model.narrative} />
        ) : (
          <div className="h-[76px] animate-pulse border-l-2 border-rule bg-ink-wash" />
        )}
      </section>

      {/* (a) */}
      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="Gross margin by category"
            subtitle="Monthly, all 24 months. The dashed group average sits between a falling line and a rising one, so it moves far less than either — which is exactly how a group margin conceals a category problem."
          />
          <div className="min-w-0 px-2 pb-4 pt-2 sm:px-3">
            {model ? (
              <ChartWithTable
                label="gross margin by category"
                chart={
                  <CategoryMarginChart
                    series={model.series}
                    groupDelta={model.narrative?.groupDelta ?? null}
                  />
                }
                table={
                  <FiguresTable
                    caption="Monthly gross margin by category and for the group"
                    rows={model.series}
                    rowKey={(row) => row.month}
                    maxHeight={CATEGORY_MARGIN_HEIGHT}
                    columns={[
                      { header: "Month", cell: (row) => monthShort(row.month) },
                      {
                        header: "Apparel",
                        align: "right",
                        cell: (row) => pct(row.Apparel),
                      },
                      {
                        header: "Hardgoods",
                        align: "right",
                        cell: (row) => pct(row.Hardgoods),
                      },
                      {
                        header: "Accessories",
                        align: "right",
                        cell: (row) => pct(row.Accessories),
                      },
                      {
                        header: "Group",
                        align: "right",
                        cell: (row) => pct(row.group),
                      },
                    ]}
                  />
                }
              />
            ) : (
              <Skeleton height={CATEGORY_MARGIN_HEIGHT} />
            )}
          </div>
        </Card>
      </section>

      {/* (b) */}
      <section className="col-span-12 min-w-0 lg:col-span-7">
        <Card>
          <CardHeader
            title="Gross profit bridge, FY1 to FY2"
            subtitle="Volume and mix at FY1 unit margins, then price, discount and unit cost at FY2 volumes. The five effects sum to the movement exactly."
          />
          <div className="min-w-0 px-2 pb-4 pt-2 sm:px-3">
            {model?.bridge ? (
              <WaterfallChart
                bars={model.bridge.bars}
                floor={model.bridge.floor}
                ceiling={model.bridge.ceiling}
                shortLabels={{
                  "FY1 gross profit": "FY1",
                  "FY2 gross profit": "FY2",
                }}
                totalMeaning="Gross profit"
              />
            ) : (
              <Skeleton height={WATERFALL_HEIGHT} />
            )}
          </div>
        </Card>
      </section>

      <section className="col-span-12 min-w-0 lg:col-span-5">
        <Card className="h-full">
          <CardHeader
            title="Bridge detail"
            subtitle="Every effect as a figure, and the footing check."
          />
          <div className="min-w-0 overflow-x-auto px-4 pb-5 pt-3 sm:px-5">
            {model?.bridge ? (
              <>
                <table className="w-full border-collapse text-[12px]">
                  <caption className="sr-only">
                    Gross profit bridge from FY1 to FY2 by effect
                  </caption>
                  <tbody className="fig">
                    {model.bridge.bars.map((bar) => (
                      <tr
                        key={bar.label}
                        className="border-b border-rule last:border-0"
                      >
                        <th
                          scope="row"
                          className={`py-1.5 pr-3 text-left font-normal ${
                            bar.kind === "total" ? "text-ink" : "text-muted"
                          }`}
                          style={{ fontFamily: "inherit" }}
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
                      >
                        Movement
                      </th>
                      <td
                        className={`py-2 text-right font-semibold ${
                          model.bridge.total >= 0
                            ? "text-favourable"
                            : "text-unfavourable"
                        }`}
                      >
                        {usdFull(model.bridge.total)}
                      </td>
                    </tr>
                    <tr>
                      <th
                        scope="row"
                        className="py-1 pr-3 text-left font-normal text-muted"
                      >
                        Unexplained residual
                      </th>
                      <td className="py-1 text-right text-muted">
                        {usdFull(model.bridge.residual)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Returns cannot be a bridge effect in this dataset. */}
                <div className="mt-4 border-t border-rule pt-3">
                  <p className="text-[11px] leading-relaxed text-muted">
                    <span className="font-semibold text-ink">Returns.</span> The
                    return rate rose from{" "}
                    <span className="fig">
                      {pct(model.bridge.returns.rateFy1)}
                    </span>{" "}
                    to{" "}
                    <span className="fig">
                      {pct(model.bridge.returns.rateFy2)}
                    </span>{" "}
                    of units, but it is deliberately not a bar above. In this
                    data net revenue is gross revenue less discount only, and
                    COGS follows units sold, so recorded gross profit does not
                    move with returns at all — a returns effect would be
                    structurally zero. The exposure, valuing FY2&rsquo;s{" "}
                    <span className="fig">
                      {count(model.bridge.returns.unitsFy2)}
                    </span>{" "}
                    returned units at FY2 unit margin, is{" "}
                    <span className="fig">
                      {usdFull(model.bridge.returns.exposureFy2)}
                    </span>
                    .
                  </p>
                </div>
              </>
            ) : (
              <Skeleton height={WATERFALL_HEIGHT} />
            )}
          </div>
        </Card>
      </section>

      {/* (c) */}
      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="SKU margin detail"
            subtitle="Sorted by margin deterioration by default, not by revenue — the question here is which lines are decaying fastest."
          />
          <div className="min-w-0 px-4 pb-5 pt-3 sm:px-5">
            {model?.skus ? (
              <SkuTable rows={model.skus} />
            ) : (
              <Skeleton height={420} />
            )}
          </div>
        </Card>
      </section>

      {/* (d) */}
      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title={
              model?.scatter
                ? `Discount against gross margin — ${model.scatter.category}`
                : "Discount against gross margin"
            }
            subtitle="One point per SKU per month. Grey is FY1, red is FY2."
          />
          <div className="min-w-0 px-2 pb-2 pt-2 sm:px-3">
            {model?.scatter ? (
              <DiscountScatter points={model.scatter.points} />
            ) : (
              <Skeleton height={SCATTER_HEIGHT} />
            )}
          </div>
          {model?.scatter?.fit && (
            <p className="px-4 pb-5 text-[12px] leading-relaxed text-muted sm:px-5">
              Across{" "}
              <span className="fig">{count(model.scatter.points.length)}</span>{" "}
              {model.scatter.category.toLowerCase()} SKU-months, every{" "}
              <span className="fig">10 points</span> of additional discount{" "}
              {model.scatter.fit.slope < 0 ? "costs" : "adds"}{" "}
              <span className="fig font-semibold text-ink">
                {ptsMagnitude(model.scatter.fit.slope * 0.1)}
              </span>{" "}
              of gross margin, a correlation of{" "}
              <span className="fig">{statistic(model.scatter.fit.r)}</span>. The
              FY2 cloud sits to the right and below the FY1 cloud: the discount
              went up and the margin followed it down. This is an association in
              the data, not a controlled experiment — but with a slope this steep
              on this many observations, discount discipline is where the margin
              is recoverable.
            </p>
          )}
        </Card>
      </section>

      <section className="col-span-12 min-w-0">
        <p className="text-[11px] leading-relaxed text-muted">
          <span className="font-semibold text-ink">Sources.</span> Category margin
          percentages above come from <code>pl_monthly</code>; the bridge, the SKU
          table and the scatter are SKU-level and come from{" "}
          <code>sku_monthly</code>. The two tie out — aggregated SKU net revenue
          matches the P&amp;L month by month, and category margins agree to the
          decimal — so figures are directly comparable across that line. Each
          reads from the grain that suits its question rather than from the one
          that happens to agree.
        </p>
      </section>
    </div>
  );
}

function Skeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse bg-ink-wash"
      style={{ height, borderRadius: 5 }}
      aria-hidden="true"
    />
  );
}
