"use client";

import { useEffect, useMemo, useState } from "react";
import { AgeingLegend, ArAgeingChart, AGEING_HEIGHT } from "@/components/ArAgeingChart";
import { AssumptionsPanel } from "@/components/AssumptionsPanel";
import { Card, CardHeader } from "@/components/Card";
import { CashCycleChart, CYCLE_HEIGHT } from "@/components/CashCycleChart";
import {
  CashForecastChart,
  FORECAST_HEIGHT,
} from "@/components/CashForecastChart";
import { CustomerAgeingTable, ExcessStockTable } from "@/components/CashTables";
import { useDashboard } from "@/components/DashboardProvider";
import { InventoryHeatMap } from "@/components/InventoryHeatMap";
import {
  CATEGORIES,
  data,
  type ArAgeingMonth,
  type InventoryMonth,
  type SkuMaster,
} from "@/lib/data";
import {
  count,
  coverMonthsLong,
  days,
  monthLong,
  monthShort,
  usd,
  usdFull,
} from "@/lib/format";
import {
  ageingSeries,
  cashAssumptions,
  customerAgeing,
  cycleDrift,
  cycleSeries,
  excessStock,
  inventoryHeat,
  weeklyCashForecast,
} from "@/lib/metrics/cash";
import { shiftMonth } from "@/lib/metrics/core";

/** The cover the excess-stock table measures against, per the brief. */
const TARGET_COVER = 2.7;

export default function CashScreen() {
  const { cashflow, pl, selectedMonth, status: shellStatus } = useDashboard();

  /* inventory_monthly is ~200KB and ar_ageing is only needed here, so both are
     fetched on this screen's mount rather than by the provider. */
  const [inventory, setInventory] = useState<InventoryMonth[] | null>(null);
  const [ar, setAr] = useState<ArAgeingMonth[] | null>(null);
  const [master, setMaster] = useState<SkuMaster[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      data.getInventoryMonthly(),
      data.getArAgeing(),
      data.getSkuMaster(),
    ])
      .then(([inventoryRows, arRows, masterRows]) => {
        if (cancelled) return;
        setInventory(inventoryRows);
        setAr(arRows);
        setMaster(masterRows);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error ? cause.message : "Could not load cash detail",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(() => {
    if (cashflow.length === 0) return null;

    const months = cashflow.map((row) => row.month);
    const cycle = cycleSeries(cashflow);
    const drift = cycleDrift(cashflow);
    const month = selectedMonth ?? months[months.length - 1];

    if (!inventory || !ar || !master) {
      return { cycle, drift, months, month, forecast: null, heat: null, ageing: null };
    }

    const assumptions = cashAssumptions(pl, cashflow, ar);
    const comparisonMonth = shiftMonth(month, -6);
    const hasComparison = months.includes(comparisonMonth);

    const overCovered = excessStock(inventory, master, month, TARGET_COVER, 10);
    const releasedTotal = excessStock(
      inventory,
      master,
      month,
      TARGET_COVER,
      Number.MAX_SAFE_INTEGER,
    ).reduce((total, row) => total + row.cashReleased, 0);

    return {
      cycle,
      drift,
      months,
      month,
      forecast: assumptions
        ? { assumptions, weeks: weeklyCashForecast(assumptions) }
        : null,
      heat: {
        rows: inventoryHeat(inventory, months, CATEGORIES),
        overCovered,
        releasedTotal,
      },
      ageing: {
        series: ageingSeries(ar, months),
        customers: customerAgeing(
          ar,
          month,
          hasComparison ? comparisonMonth : null,
        ),
        comparisonLabel: hasComparison ? monthShort(comparisonMonth) : null,
      },
    };
  }, [cashflow, pl, inventory, ar, master, selectedMonth]);

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

  const trough = model?.forecast
    ? model.forecast.weeks.reduce((low, week) =>
        week.closingCash < low.closingCash ? week : low,
      )
    : null;

  return (
    <div className="grid grid-cols-12 gap-4">
      <header className="col-span-12 min-w-0">
        <h1 className="heading text-[17px] text-ink">Cash and working capital</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          {model
            ? `Cycle across ${count(model.months.length)} months · detail as at ${monthLong(model.month)}`
            : "Loading"}
        </p>
      </header>

      {/* (a) */}
      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="Cash conversion cycle"
            subtitle="Days, monthly. Inventory and receivable days stack upward; payable days extend below the rule because they fund the cycle rather than lengthen it. The solid line is the cycle — the net of the two bands, not the top edge of the upper one, which is the cycle before payables fund any of it."
          />
          <div className="min-w-0 px-2 pb-4 pt-2 sm:px-3">
            {model ? (
              <CashCycleChart series={model.cycle} drift={model.drift} />
            ) : (
              <Skeleton height={CYCLE_HEIGHT} />
            )}
          </div>
        </Card>
      </section>

      {/* (b) */}
      <section className="col-span-12 min-w-0 lg:col-span-7">
        <Card className="h-full">
          <CardHeader
            title="Thirteen-week cash forecast"
            subtitle={
              trough
                ? `Projected on the trailing run rate. Low point ${usd(
                    trough.closingCash,
                  )} in week ${trough.week}.`
                : "Projected on the trailing run rate."
            }
          />
          <div className="min-w-0 px-2 pb-4 pt-2 sm:px-3">
            {model?.forecast ? (
              <CashForecastChart
                weeks={model.forecast.weeks}
                assumptions={model.forecast.assumptions}
              />
            ) : (
              <Skeleton height={FORECAST_HEIGHT} />
            )}
          </div>
        </Card>
      </section>

      <section className="col-span-12 min-w-0 lg:col-span-5">
        <Card className="h-full">
          <CardHeader
            title="Assumptions"
            subtitle="Drawn from the data, not chosen. A forecast you cannot inspect is one you will not trust."
          />
          <div className="min-w-0 px-4 pb-5 pt-3 sm:px-5">
            {model?.forecast ? (
              <AssumptionsPanel assumptions={model.forecast.assumptions} />
            ) : (
              <Skeleton height={FORECAST_HEIGHT} />
            )}
          </div>
        </Card>
      </section>

      {/* (c) */}
      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="Inventory cover by category"
            subtitle="Months of supply on hand, weighted by stock value so a large slow line is not averaged away by a small fast one."
          />
          <div className="min-w-0 px-4 pb-5 pt-3 sm:px-5">
            {model?.heat ? (
              <InventoryHeatMap
                rows={model.heat.rows}
                targetCover={TARGET_COVER}
              />
            ) : (
              <Skeleton height={140} />
            )}
          </div>
        </Card>
      </section>

      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="Where the cash is tied up"
            subtitle={`The ten SKUs holding the most stock above ${coverMonthsLong(
              TARGET_COVER,
            )} of cover, and what returning them to it would release.`}
          />
          <div className="min-w-0 px-4 pb-5 pt-3 sm:px-5">
            {model?.heat ? (
              <ExcessStockTable
                rows={model.heat.overCovered}
                targetCover={TARGET_COVER}
                total={model.heat.releasedTotal}
              />
            ) : (
              <Skeleton height={320} />
            )}
          </div>
        </Card>
      </section>

      {/* (d) */}
      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="Receivables ageing"
            subtitle="Monthly, by bucket. The buckets are an ordered scale, so age is encoded as one hue deepening rather than five unrelated colours."
            right={<AgeingLegend />}
          />
          <div className="min-w-0 px-2 pb-4 pt-2 sm:px-3">
            {model?.ageing ? (
              <ArAgeingChart series={model.ageing.series} />
            ) : (
              <Skeleton height={AGEING_HEIGHT} />
            )}
          </div>
          {model?.ageing && model.drift && (
            <p className="px-4 pb-4 text-[12px] leading-relaxed text-muted sm:px-5">
              Receivable days moved from{" "}
              <span className="fig">{days(model.cycle[0].dso)}</span> to{" "}
              <span className="fig font-semibold text-ink">
                {days(model.cycle[model.cycle.length - 1].dso)}
              </span>{" "}
              across the window, and the book grew to{" "}
              <span className="fig">
                {usdFull(
                  model.ageing.series[model.ageing.series.length - 1].total,
                )}
              </span>
              .
            </p>
          )}
        </Card>
      </section>

      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="Customer ageing"
            subtitle="Ordered by how fast the past-due share is deteriorating, so a small account going bad shows up before a large one merely being large."
          />
          <div className="min-w-0 px-4 pb-5 pt-3 sm:px-5">
            {model?.ageing ? (
              <CustomerAgeingTable
                rows={model.ageing.customers.rows}
                comparisonLabel={model.ageing.comparisonLabel}
                uniformProfile={model.ageing.customers.uniformProfile}
              />
            ) : (
              <Skeleton height={320} />
            )}
          </div>
        </Card>
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
