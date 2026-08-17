import type {
  ArAgeingMonth,
  CashflowMonth,
  InventoryMonth,
  MarketingMonth,
  Month,
  PLMonth,
  SkuMonth,
} from "../data/types";
import { shiftMonth } from "./core";

/**
 * Screen 4: a driver-based forward model.
 *
 * The central discipline here is CALIBRATION. At default driver values the model
 * must reproduce the trailing actuals, or every delta it reports — including the
 * Recover figure the whole screen exists to state — is measuring the gap between
 * the model and reality rather than the effect of the change. So rate drivers
 * enter as ratios against their own baseline: at default they multiply by
 * exactly 1 and the first forecast month lands on the last actual.
 */

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Annual cost inflation applied to the fixed opex lines, as a monthly factor. */
const ANNUAL_INFLATION = 0.03;
const MONTHLY_INFLATION = (1 + ANNUAL_INFLATION) ** (1 / 12);

export interface Drivers {
  sessionsGrowth: number;
  conversionRate: number;
  aov: number;
  apparelDiscount: number;
  returnRate: number;
  blendedCac: number;
  apparelCover: number;
  wholesaleGrowth: number;
}

export type DriverKey = keyof Drivers;

export interface DriverSpec {
  key: DriverKey;
  label: string;
  unit: "percent" | "currency" | "months";
  min: number;
  max: number;
  step: number;
  /** Higher is better for EBITDA — drives the colour of a movement. */
  higherIsBetter: boolean;
  help: string;
}

export interface Baseline extends Drivers {
  lastActualMonth: Month;
  sessions: number;
  newCustomersPerOrder: number;
  wholesaleRevenue: number;
  grossMargin: number;
  apparelShare: number;
  otherCover: number;
  payroll: number;
  rent: number;
  software: number;
  gAndA: number;
  freightRate: number;
  processingRate: number;
  capex: number;
  interest: number;
  openingCash: number;
  wholesaleCollectionDays: number;
  dpo: number;
  /** Trailing monthly net revenue, for the "vs recent actual" readouts. */
  monthlyNetRevenue: number;
}

/**
 * Every baseline the model runs from, measured over the trailing three months.
 *
 * AOV is taken as revenue_dtc / orders rather than the `aov` column: the two
 * differ ($141.71 against $136.30), and only the derived one reproduces actual
 * DTC revenue when multiplied back by orders. A baseline that does not
 * reconstruct the actuals would break the calibration above.
 */
export function forecastBaseline(
  pl: PLMonth[],
  marketing: MarketingMonth[],
  cashflow: CashflowMonth[],
  skuRows: SkuMonth[],
  inventory: InventoryMonth[],
  ar: ArAgeingMonth[],
  basisMonths = 3,
): Baseline | null {
  if (pl.length < basisMonths + 1 || cashflow.length === 0) return null;

  const months = pl.slice(-basisMonths).map((row) => row.month);
  const inWindow = new Set(months);
  const lastActualMonth = months[months.length - 1];

  const p = pl.filter((row) => inWindow.has(row.month));
  const m = marketing.filter((row) => inWindow.has(row.month));
  const c = cashflow.filter((row) => inWindow.has(row.month));
  const lastCash = cashflow[cashflow.length - 1];

  const netRevenue = sum(p.map((r) => r.net_revenue)) / basisMonths;
  const orders = sum(m.map((r) => r.orders)) / basisMonths;
  const sessions = sum(m.map((r) => r.sessions)) / basisMonths;
  const dtcRevenue = sum(p.map((r) => r.revenue_dtc)) / basisMonths;

  /** Average month-on-month growth across the window, including its first step. */
  const growth = <T,>(rows: T[], pick: (row: T) => number) => {
    const series = rows.slice(-(basisMonths + 1)).map(pick);
    let total = 0;
    for (let i = 1; i < series.length; i += 1) {
      total += series[i] / series[i - 1] - 1;
    }
    return series.length > 1 ? total / (series.length - 1) : 0;
  };

  const apparelRows = skuRows.filter(
    (row) => inWindow.has(row.month) && row.category === "Apparel",
  );
  const apparelGross = sum(apparelRows.map((r) => r.gross_revenue));
  const apparelNet = sum(apparelRows.map((r) => r.net_revenue));

  const coverFor = (predicate: (row: InventoryMonth) => boolean) => {
    const rows = inventory.filter(
      (row) => inWindow.has(row.month) && predicate(row),
    );
    const value = sum(rows.map((r) => r.closing_value));
    return value
      ? sum(rows.map((r) => r.months_on_hand * r.closing_value)) / value
      : 0;
  };

  const openingAr = sum(
    ar
      .filter((row) => row.month === lastCash.month)
      .map((row) => row.total_outstanding),
  );
  const trailingWholesale = sum(pl.slice(-12).map((r) => r.revenue_wholesale));

  return {
    lastActualMonth,
    // Drivers
    sessionsGrowth: growth(marketing, (r) => r.sessions),
    conversionRate: orders / sessions,
    aov: dtcRevenue / orders,
    apparelDiscount: apparelGross ? 1 - apparelNet / apparelGross : 0,
    returnRate: sum(m.map((r) => r.return_rate)) / basisMonths,
    blendedCac:
      sum(m.map((r) => r.ad_spend)) / sum(m.map((r) => r.new_customers)),
    apparelCover: coverFor((row) => row.category === "Apparel"),
    wholesaleGrowth: growth(pl, (r) => r.revenue_wholesale),
    // Structure
    sessions,
    newCustomersPerOrder:
      sum(m.map((r) => r.new_customers)) / sum(m.map((r) => r.orders)),
    wholesaleRevenue: sum(p.map((r) => r.revenue_wholesale)) / basisMonths,
    grossMargin: sum(p.map((r) => r.gross_profit)) / sum(p.map((r) => r.net_revenue)),
    apparelShare: sum(p.map((r) => r.revenue_apparel)) / sum(p.map((r) => r.net_revenue)),
    otherCover: coverFor((row) => row.category !== "Apparel"),
    payroll: sum(p.map((r) => r.payroll)) / basisMonths,
    rent: sum(p.map((r) => r.rent)) / basisMonths,
    software: sum(p.map((r) => r.software)) / basisMonths,
    gAndA: sum(p.map((r) => r.g_and_a)) / basisMonths,
    freightRate: sum(p.map((r) => r.freight)) / sum(p.map((r) => r.net_revenue)),
    processingRate:
      sum(p.map((r) => r.processing_fees)) / sum(p.map((r) => r.net_revenue)),
    capex: sum(c.map((r) => r.capex)) / basisMonths,
    interest: sum(c.map((r) => r.interest_paid)) / basisMonths,
    openingCash: lastCash.closing_cash,
    wholesaleCollectionDays: trailingWholesale
      ? openingAr / (trailingWholesale / 365)
      : lastCash.dso,
    dpo: lastCash.dpo,
    monthlyNetRevenue: netRevenue,
  };
}

/**
 * Slider definitions. Ranges are set around the measured baseline so the control
 * has usable travel either side of where the business actually is.
 */
export function driverSpecs(baseline: Baseline): DriverSpec[] {
  return [
    {
      key: "sessionsGrowth",
      label: "Sessions growth",
      unit: "percent",
      min: -0.15,
      max: 0.15,
      step: 0.001,
      higherIsBetter: true,
      help: "Month-on-month change in traffic.",
    },
    {
      key: "conversionRate",
      label: "Conversion rate",
      unit: "percent",
      min: 0.005,
      max: 0.04,
      step: 0.0001,
      higherIsBetter: true,
      help: "Share of sessions that place an order.",
    },
    {
      key: "aov",
      label: "Average order value",
      unit: "currency",
      min: 80,
      max: 220,
      step: 1,
      higherIsBetter: true,
      help: "DTC revenue per order at baseline discounting.",
    },
    {
      key: "apparelDiscount",
      label: "Apparel discount",
      unit: "percent",
      min: 0,
      max: 0.45,
      step: 0.005,
      higherIsBetter: false,
      help: "Discount off list on apparel. Volume is held constant.",
    },
    {
      key: "returnRate",
      label: "Return rate",
      unit: "percent",
      min: 0,
      max: 0.25,
      step: 0.001,
      higherIsBetter: false,
      help: "Share of units returned, treated as a revenue deduction.",
    },
    {
      key: "blendedCac",
      label: "Blended CAC",
      unit: "currency",
      min: 15,
      max: 90,
      step: 0.5,
      higherIsBetter: false,
      help: "Acquisition cost per new customer; drives ad spend.",
    },
    {
      key: "apparelCover",
      label: "Apparel stock cover",
      unit: "months",
      min: 1,
      max: 6,
      step: 0.1,
      higherIsBetter: false,
      help: "Months of apparel supply held. Affects cash, not profit.",
    },
    {
      key: "wholesaleGrowth",
      label: "Wholesale growth",
      unit: "percent",
      min: -0.15,
      max: 0.15,
      step: 0.001,
      higherIsBetter: true,
      help: "Month-on-month change in wholesale revenue.",
    },
  ].map((spec) => spec as DriverSpec).map((spec) => ({
    ...spec,
    // Keep the measured baseline inside the control's travel.
    min: Math.min(spec.min, baseline[spec.key]),
    max: Math.max(spec.max, baseline[spec.key]),
  }));
}

export function driversFrom(baseline: Baseline): Drivers {
  return {
    sessionsGrowth: baseline.sessionsGrowth,
    conversionRate: baseline.conversionRate,
    aov: baseline.aov,
    apparelDiscount: baseline.apparelDiscount,
    returnRate: baseline.returnRate,
    blendedCac: baseline.blendedCac,
    apparelCover: baseline.apparelCover,
    wholesaleGrowth: baseline.wholesaleGrowth,
  };
}

export interface ForecastMonth {
  month: Month;
  sessions: number;
  orders: number;
  dtcRevenue: number;
  wholesaleRevenue: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  payroll: number;
  rent: number;
  software: number;
  freight: number;
  processingFees: number;
  adSpend: number;
  gAndA: number;
  totalOpex: number;
  ebitda: number;
  inventory: number;
  receivables: number;
  payables: number;
  workingCapitalChange: number;
  capex: number;
  interest: number;
  netChange: number;
  closingCash: number;
}

export interface ForecastResult {
  months: ForecastMonth[];
  totals: {
    netRevenue: number;
    grossProfit: number;
    totalOpex: number;
    ebitda: number;
  };
  closingCash: number;
  /** Lowest cash point across the horizon. */
  troughCash: number;
  troughMonth: Month;
}

/**
 * Twelve months forward.
 *
 * COGS is driven by VOLUME, not by revenue — that separation is the whole
 * mechanism of the discount driver. Cutting the discount lifts revenue while
 * units, and therefore cost, stay put, so margin improves. Computing COGS as a
 * percentage of revenue instead would move cost down with price and cancel the
 * effect out entirely.
 *
 * Volume is held constant when the discount moves. That is a real limitation and
 * the screen states it: no price elasticity is modelled, so the Recover case is
 * the value of the discount if demand holds, not a forecast that it will.
 */
export function runForecast(
  baseline: Baseline,
  drivers: Drivers,
  horizon = 12,
): ForecastResult {
  const months: ForecastMonth[] = [];

  const discountAdjust =
    baseline.apparelShare *
      ((1 - drivers.apparelDiscount) / (1 - baseline.apparelDiscount)) +
    (1 - baseline.apparelShare);
  const returnAdjust = (1 - drivers.returnRate) / (1 - baseline.returnRate);

  // Opening balances are computed with the model's own formulas at baseline
  // drivers, so month one shows no step that is merely a change of definition.
  const baseCogsMonthly =
    (baseline.sessions * baseline.conversionRate * baseline.aov +
      baseline.wholesaleRevenue) *
    (1 - baseline.grossMargin);

  let inventory =
    baseCogsMonthly * baseline.apparelShare * baseline.apparelCover +
    baseCogsMonthly * (1 - baseline.apparelShare) * baseline.otherCover;
  let receivables =
    (baseline.wholesaleRevenue * baseline.wholesaleCollectionDays) / 30;
  let payables = (baseCogsMonthly * baseline.dpo) / 30;
  let cash = baseline.openingCash;

  for (let step = 1; step <= horizon; step += 1) {
    const month = shiftMonth(baseline.lastActualMonth, step);
    const inflation = MONTHLY_INFLATION ** step;

    const sessions =
      baseline.sessions * (1 + drivers.sessionsGrowth) ** step;
    const orders = sessions * drivers.conversionRate;
    const newCustomers = orders * baseline.newCustomersPerOrder;

    // Revenue at baseline pricing — the volume the business actually moves.
    const dtcAtBaselinePricing = orders * drivers.aov;
    const wholesaleRevenue =
      baseline.wholesaleRevenue * (1 + drivers.wholesaleGrowth) ** step;

    const dtcRevenue = dtcAtBaselinePricing * discountAdjust * returnAdjust;
    const netRevenue = dtcRevenue + wholesaleRevenue;

    const cogs =
      (dtcAtBaselinePricing + wholesaleRevenue) * (1 - baseline.grossMargin);
    const grossProfit = netRevenue - cogs;

    const payroll = baseline.payroll * inflation;
    const rent = baseline.rent * inflation;
    const software = baseline.software * inflation;
    const gAndA = baseline.gAndA * inflation;
    const freight = netRevenue * baseline.freightRate;
    const processingFees = netRevenue * baseline.processingRate;
    const adSpend = newCustomers * drivers.blendedCac;

    const totalOpex =
      payroll + rent + software + freight + processingFees + adSpend + gAndA;
    const ebitda = grossProfit - totalOpex;

    const nextInventory =
      cogs * baseline.apparelShare * drivers.apparelCover +
      cogs * (1 - baseline.apparelShare) * baseline.otherCover;
    const nextReceivables =
      (wholesaleRevenue * baseline.wholesaleCollectionDays) / 30;
    const nextPayables = (cogs * baseline.dpo) / 30;

    // A rise in inventory or receivables consumes cash; a rise in payables frees it.
    const workingCapitalChange =
      nextInventory -
      inventory +
      (nextReceivables - receivables) -
      (nextPayables - payables);

    const netChange =
      ebitda - workingCapitalChange - baseline.capex - baseline.interest;

    inventory = nextInventory;
    receivables = nextReceivables;
    payables = nextPayables;
    cash += netChange;

    months.push({
      month,
      sessions,
      orders,
      dtcRevenue,
      wholesaleRevenue,
      netRevenue,
      cogs,
      grossProfit,
      grossMargin: netRevenue ? grossProfit / netRevenue : 0,
      payroll,
      rent,
      software,
      freight,
      processingFees,
      adSpend,
      gAndA,
      totalOpex,
      ebitda,
      inventory,
      receivables,
      payables,
      workingCapitalChange,
      capex: baseline.capex,
      interest: baseline.interest,
      netChange,
      closingCash: cash,
    });
  }

  const trough = months.reduce((low, row) =>
    row.closingCash < low.closingCash ? row : low,
  );

  return {
    months,
    totals: {
      netRevenue: sum(months.map((r) => r.netRevenue)),
      grossProfit: sum(months.map((r) => r.grossProfit)),
      totalOpex: sum(months.map((r) => r.totalOpex)),
      ebitda: sum(months.map((r) => r.ebitda)),
    },
    closingCash: months[months.length - 1].closingCash,
    troughCash: trough.closingCash,
    troughMonth: trough.month,
  };
}

/* -------------------------------------------------------------------------- */
/* Sensitivity                                                                */
/* -------------------------------------------------------------------------- */

export interface TornadoRow {
  key: DriverKey;
  label: string;
  low: number;
  high: number;
  /** Largest absolute EBITDA swing, for ranking. */
  magnitude: number;
}

/**
 * Each driver moved plus and minus 10% of its own value, everything else held.
 *
 * Ten percent *of the driver's value* rather than ten percentage points, so the
 * drivers stay comparable: ten points on a 1.72% conversion rate would be a
 * seven-fold change, while ten points on a 29% discount is a third of it.
 *
 * The swing is taken on the ABSOLUTE value, so "high" always means a numerically
 * higher driver. Multiplying by (1 + swing) instead breaks on the two growth
 * drivers, which are currently negative: -4.01% x 1.1 is -4.41%, so the bar
 * labelled "+10%" would in fact be the worse case and the chart would read
 * backwards against every other row.
 */
export function tornado(
  baseline: Baseline,
  drivers: Drivers,
  specs: DriverSpec[],
  swing = 0.1,
): TornadoRow[] {
  const base = runForecast(baseline, drivers).totals.ebitda;

  return specs
    .map((spec) => {
      const value = drivers[spec.key];
      const step = Math.abs(value) * swing;
      const lowDrivers = { ...drivers, [spec.key]: value - step };
      const highDrivers = { ...drivers, [spec.key]: value + step };

      const low = runForecast(baseline, lowDrivers).totals.ebitda - base;
      const high = runForecast(baseline, highDrivers).totals.ebitda - base;

      return {
        key: spec.key,
        label: spec.label,
        low,
        high,
        magnitude: Math.max(Math.abs(low), Math.abs(high)),
      };
    })
    .sort((a, b) => b.magnitude - a.magnitude);
}

/** The Recover preset: apparel discipline restored, stock back to target cover. */
export const RECOVER_PRESET = {
  apparelDiscount: 0.12,
  apparelCover: 2.7,
} as const;

export interface RecoverOutcome {
  drivers: Drivers;
  ebitdaDelta: number;
  cashDelta: number;
  baseEbitda: number;
  recoveredEbitda: number;
  baseClosingCash: number;
  recoveredClosingCash: number;
}

export function recoverOutcome(
  baseline: Baseline,
  current: Drivers,
): RecoverOutcome {
  const recovered: Drivers = { ...current, ...RECOVER_PRESET };
  const before = runForecast(baseline, current);
  const after = runForecast(baseline, recovered);

  return {
    drivers: recovered,
    ebitdaDelta: after.totals.ebitda - before.totals.ebitda,
    cashDelta: after.closingCash - before.closingCash,
    baseEbitda: before.totals.ebitda,
    recoveredEbitda: after.totals.ebitda,
    baseClosingCash: before.closingCash,
    recoveredClosingCash: after.closingCash,
  };
}
