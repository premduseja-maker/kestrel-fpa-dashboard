"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ACTUAL_FORECAST_HEIGHT } from "@/components/chart-heights";
import type { JoinedPoint } from "@/components/ActualForecastChart";

/* Loaded on demand — see the note on the summary screen. */
const ActualForecastChart = dynamic(
  () =>
    import("@/components/ActualForecastChart").then((x) => x.ActualForecastChart),
  { ssr: false, loading: () => <Skeleton height={ACTUAL_FORECAST_HEIGHT} /> },
);
import { Card, CardHeader } from "@/components/Card";
import { ChartWithTable, FiguresTable } from "@/components/ChartWithTable";
import { useDashboard } from "@/components/DashboardProvider";
import { DriverSliders } from "@/components/DriverSliders";
import { ForecastPnlTable } from "@/components/ForecastPnlTable";
import { RecoverBanner } from "@/components/RecoverBanner";
import { TornadoChart } from "@/components/TornadoChart";
import {
  data,
  type ArAgeingMonth,
  type InventoryMonth,
  type SkuMonth,
} from "@/lib/data";
import { monthLong, monthShort, usd, usdFull } from "@/lib/format";
import {
  discountBreakeven,
  driverSpecs,
  driversFrom,
  forecastBaseline,
  recoverOutcome,
  runForecast,
  tornado,
  RECOVER_PRESET,
  type DriverKey,
  type Drivers,
} from "@/lib/metrics/forecast";

export default function ForecastScreen() {
  const { pl, marketing, cashflow, status: shellStatus } = useDashboard();

  const [skuRows, setSkuRows] = useState<SkuMonth[] | null>(null);
  const [inventory, setInventory] = useState<InventoryMonth[] | null>(null);
  const [ar, setAr] = useState<ArAgeingMonth[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Fetched once on mount. Slider movement never touches this. */
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      data.getSkuMonthly(),
      data.getInventoryMonthly(),
      data.getArAgeing(),
    ])
      .then(([sku, inv, arRows]) => {
        if (cancelled) return;
        setSkuRows(sku);
        setInventory(inv);
        setAr(arRows);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Could not load data");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* Baselines depend only on the fetched data, so they are computed once. */
  const baseline = useMemo(() => {
    if (!skuRows || !inventory || !ar) return null;
    if (pl.length === 0 || marketing.length === 0 || cashflow.length === 0) {
      return null;
    }
    return forecastBaseline(pl, marketing, cashflow, skuRows, inventory, ar);
  }, [pl, marketing, cashflow, skuRows, inventory, ar]);

  const specs = useMemo(
    () => (baseline ? driverSpecs(baseline) : []),
    [baseline],
  );

  /**
   * Only the drivers the reader has actually moved are held in state; the rest
   * are derived from the baseline during render. Seeding a full copy of the
   * drivers from an effect once the baseline arrives would be a cascading render,
   * and this way "reset" is simply discarding the overrides.
   */
  const [overrides, setOverrides] = useState<Partial<Drivers>>({});

  const drivers = useMemo(
    () => (baseline ? { ...driversFrom(baseline), ...overrides } : null),
    [baseline, overrides],
  );

  const onChange = useCallback((key: DriverKey, value: number) => {
    setOverrides((current) => ({ ...current, [key]: value }));
  }, []);

  const onReset = useCallback(() => setOverrides({}), []);

  const onApplyRecover = useCallback(() => {
    setOverrides((current) => ({ ...current, ...RECOVER_PRESET }));
  }, []);

  /* The model itself: recomputed only when a driver or the baseline changes. */
  const result = useMemo(
    () => (baseline && drivers ? runForecast(baseline, drivers) : null),
    [baseline, drivers],
  );

  /* Sensitivity runs the model 16 more times, so it is memoised separately. */
  const tornadoRows = useMemo(
    () =>
      baseline && drivers && specs.length > 0
        ? tornado(baseline, drivers, specs)
        : [],
    [baseline, drivers, specs],
  );

  const recover = useMemo(
    () => (baseline && drivers ? recoverOutcome(baseline, drivers) : null),
    [baseline, drivers],
  );

  /* Measured from wherever the discount slider currently sits to the preset
     target, so the threshold tracks the reader rather than a fixed baseline. */
  const breakeven = useMemo(
    () =>
      baseline && drivers
        ? discountBreakeven(
            baseline,
            drivers.apparelDiscount,
            RECOVER_PRESET.apparelDiscount,
          )
        : null,
    [baseline, drivers],
  );

  const recoverApplied = Boolean(
    drivers &&
      Math.abs(drivers.apparelDiscount - RECOVER_PRESET.apparelDiscount) < 1e-9 &&
      Math.abs(drivers.apparelCover - RECOVER_PRESET.apparelCover) < 1e-9,
  );

  const series = useMemo(() => {
    if (!result || !baseline) return null;

    const boundary = baseline.lastActualMonth;

    const join = (
      actualOf: (month: string) => number | null,
      forecastOf: (month: string) => number | null,
    ): JoinedPoint[] => [
      ...pl.map((row) => ({
        month: row.month,
        actual: actualOf(row.month),
        // Share the boundary month so the two series meet rather than gap.
        forecast: row.month === boundary ? actualOf(row.month) : null,
      })),
      ...result.months.map((row) => ({
        month: row.month,
        actual: null,
        forecast: forecastOf(row.month),
      })),
    ];

    const plByMonth = new Map(pl.map((row) => [row.month, row]));
    const cashByMonth = new Map(cashflow.map((row) => [row.month, row]));
    const forecastByMonth = new Map(
      result.months.map((row) => [row.month, row]),
    );

    return {
      boundary,
      ebitda: join(
        (month) => plByMonth.get(month)?.ebitda ?? null,
        (month) => forecastByMonth.get(month)?.ebitda ?? null,
      ),
      cash: join(
        (month) => cashByMonth.get(month)?.closing_cash ?? null,
        (month) => forecastByMonth.get(month)?.closingCash ?? null,
      ),
    };
  }, [result, baseline, pl, cashflow]);

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
        <h1 className="heading text-[17px] text-ink">Driver forecast</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          {baseline
            ? `Twelve months from ${monthLong(baseline.lastActualMonth)}, on the trailing three-month run rate`
            : "Loading"}
        </p>
      </header>

      {/* (d) — the point of the screen, so it leads. */}
      <section className="col-span-12 min-w-0">
        {recover ? (
          <RecoverBanner
            breakeven={breakeven}
            outcome={recover}
            applied={recoverApplied}
            onApply={onApplyRecover}
          />
        ) : (
          <Skeleton height={230} />
        )}
      </section>

      <section className="col-span-12 min-w-0 lg:col-span-5">
        <Card className="h-full">
          <CardHeader
            title="Drivers"
            subtitle="Each starts at the trailing three-month actual."
          />
          <div className="min-w-0 px-4 pb-5 pt-3 sm:px-5">
            {baseline && drivers ? (
              <DriverSliders
                specs={specs}
                drivers={drivers}
                baseline={baseline}
                onChange={onChange}
                onReset={onReset}
              />
            ) : (
              <Skeleton height={480} />
            )}
          </div>
        </Card>
      </section>

      {/* (b) */}
      <section className="col-span-12 min-w-0 lg:col-span-7">
        <div className="flex h-full flex-col gap-4">
          <Card>
            <CardHeader
              title="EBITDA — 24 months actual, 12 forecast"
              subtitle="The forecast is a separate dashed series, never a continuation of the same line."
            />
            <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
              {series ? (
                <ChartWithTable
                  label="EBITDA, actual and forecast"
                  chart={
                    <ActualForecastChart
                      points={series.ebitda}
                      boundaryMonth={series.boundary}
                    />
                  }
                  table={<JoinTable rows={series.ebitda} label="EBITDA" />}
                />
              ) : (
                <Skeleton height={ACTUAL_FORECAST_HEIGHT} />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Closing cash"
              subtitle={
                result
                  ? `Low point ${usd(result.troughCash)} in ${monthLong(
                      result.troughMonth,
                    )}.`
                  : undefined
              }
            />
            <div className="min-w-0 px-2 pb-3 pt-1 sm:px-3">
              {series ? (
                <ChartWithTable
                  label="closing cash, actual and forecast"
                  chart={
                    <ActualForecastChart
                      points={series.cash}
                      boundaryMonth={series.boundary}
                      showZero
                    />
                  }
                  table={<JoinTable rows={series.cash} label="Closing cash" />}
                />
              ) : (
                <Skeleton height={ACTUAL_FORECAST_HEIGHT} />
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* (c) */}
      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="What moves EBITDA most"
            subtitle="Twelve-month EBITDA impact of each driver at ±10% of its own value."
          />
          <div className="min-w-0 px-4 pb-5 pt-3 sm:px-5">
            {tornadoRows.length > 0 ? (
              <TornadoChart rows={tornadoRows} />
            ) : (
              <Skeleton height={280} />
            )}
          </div>
        </Card>
      </section>

      {/* (a) */}
      <section className="col-span-12 min-w-0">
        <Card>
          <CardHeader
            title="Forward profit and loss"
            subtitle="Twelve months on the current settings, with the full-year total. Costs are shown negative so each column adds down to EBITDA."
          />
          <div className="min-w-0 px-2 pb-5 pt-3 sm:px-3">
            {result ? (
              <ForecastPnlTable result={result} />
            ) : (
              <Skeleton height={400} />
            )}
          </div>
        </Card>
      </section>

      <section className="col-span-12 min-w-0">
        <p className="text-[11px] leading-relaxed text-muted">
          <span className="font-semibold text-ink">How to read this.</span> At
          default settings the model reproduces the trailing three-month run rate
          exactly, so every figure it reports is the effect of a change rather
          than a gap between model and record. The forecast starts from that run
          rate and not from the final month, which is why the join steps down:{" "}
          {baseline ? monthLong(baseline.lastActualMonth) : "the last month"} ran
          well above trend, and anchoring twelve months on one strong month would
          flatter every number below. Cost of goods is driven by units, not by
          revenue, so cutting a discount lifts margin instead of cancelling
          itself out — and volume is held constant when price moves, which is the
          model&rsquo;s main limitation.
        </p>
      </section>
    </div>
  );
}

/**
 * Table twin for the joined actual/forecast charts. The basis column is what a
 * table can say that a dashed line cannot: which rows are record and which are
 * projection, in words.
 */
function JoinTable({
  rows,
  label,
}: {
  rows: JoinedPoint[];
  label: string;
}) {
  return (
    <FiguresTable
      caption={`${label} by month, actual then forecast`}
      rows={rows}
      rowKey={(row) => row.month}
      maxHeight={ACTUAL_FORECAST_HEIGHT}
      columns={[
        { header: "Month", cell: (row) => monthShort(row.month) },
        {
          header: label,
          align: "right",
          cell: (row) => {
            const value = row.actual ?? row.forecast;
            return value === null || value === undefined ? "—" : usdFull(value);
          },
        },
        {
          header: "Basis",
          align: "right",
          cell: (row) => (row.actual === null ? "Forecast" : "Actual"),
        },
      ]}
    />
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
