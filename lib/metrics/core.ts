import {
  CATEGORY_KEY,
  CATEGORIES,
  type BudgetMonth,
  type Category,
  type Month,
  type PLMonth,
} from "../data/types";

/**
 * All derived calculation. Pure functions only — no React, no fetching, no
 * formatting. Everything here is unit-testable in isolation.
 *
 * Verified against the source data before this was written: `total_opex` is the
 * sum of its seven lines, `ebitda = gross_profit - total_opex`, `gross_profit =
 * net_revenue - cogs`, and the three category columns foot to the group totals,
 * in all 24 months and in both the actual and budget tables. The bridge below
 * relies on those identities holding exactly.
 */

export interface Dated {
  month: Month;
}

/** The most recent month present, or null for an empty table. */
export function latestMonth<T extends Dated>(rows: T[]): Month | null {
  if (rows.length === 0) return null;
  return rows.reduce(
    (latest, row) => (row.month > latest ? row.month : latest),
    rows[0].month,
  );
}

export function findMonth<T extends Dated>(
  rows: T[],
  month: Month | null,
): T | undefined {
  if (!month) return undefined;
  return rows.find((row) => row.month === month);
}

/** `2026-07` -> `2026-06`; `2026-01` -> `2025-12`. */
export function shiftMonth(month: Month, byMonths: number): Month {
  const [yearPart, monthPart] = month.split("-").map(Number);
  const zeroBased = yearPart * 12 + (monthPart - 1) + byMonths;
  const year = Math.floor(zeroBased / 12);
  const m = (zeroBased % 12) + 1;
  return `${year}-${String(m).padStart(2, "0")}`;
}

export const priorMonth = (month: Month) => shiftMonth(month, -1);
export const sameMonthPriorYear = (month: Month) => shiftMonth(month, -12);

/** Gross margin as a fraction. Zero revenue yields 0 rather than NaN. */
export function marginPct(grossProfit: number, netRevenue: number): number {
  if (!netRevenue) return 0;
  return grossProfit / netRevenue;
}

/**
 * Relative change against a base.
 *
 * Returns null when the base is zero or negative: a "percentage change" from a
 * negative EBITDA is arithmetically computable but meaningless to read, so
 * callers are forced to fall back to the absolute movement instead of printing
 * a number that misleads.
 */
export function relativeChange(
  current: number,
  base: number,
): number | null {
  if (base <= 0) return null;
  return (current - base) / base;
}

/** Month-on-month movement of a measure, absolute and relative. */
export function momChange<T extends Dated>(
  rows: T[],
  month: Month,
  pick: (row: T) => number,
): { absolute: number; relative: number | null } | null {
  const current = findMonth(rows, month);
  const previous = findMonth(rows, priorMonth(month));
  if (!current || !previous) return null;
  const a = pick(current);
  const b = pick(previous);
  return { absolute: a - b, relative: relativeChange(a, b) };
}

/** Same month, prior year. */
export function yoyChange<T extends Dated>(
  rows: T[],
  month: Month,
  pick: (row: T) => number,
): { absolute: number; relative: number | null } | null {
  const current = findMonth(rows, month);
  const previous = findMonth(rows, sameMonthPriorYear(month));
  if (!current || !previous) return null;
  const a = pick(current);
  const b = pick(previous);
  return { absolute: a - b, relative: relativeChange(a, b) };
}

/**
 * Trailing twelve months to and including `month`. Returns null unless all 12
 * months are present, so a partial window is never passed off as a TTM figure.
 */
export function ttm<T extends Dated>(
  rows: T[],
  month: Month,
  pick: (row: T) => number,
): number | null {
  const wanted = new Set(
    Array.from({ length: 12 }, (_, i) => shiftMonth(month, -i)),
  );
  const window = rows.filter((row) => wanted.has(row.month));
  if (window.length !== 12) return null;
  return window.reduce((total, row) => total + pick(row), 0);
}

export interface Variance {
  actual: number;
  budget: number;
  absolute: number;
  relative: number | null;
  /** True when the movement is the good outcome for this measure. */
  favourable: boolean;
}

/**
 * Actual against budget. `higherIsBetter` is false for cost lines, where
 * spending less than budget is the favourable outcome.
 */
export function varianceVsBudget(
  actual: number,
  budget: number,
  higherIsBetter = true,
): Variance {
  const absolute = actual - budget;
  return {
    actual,
    budget,
    absolute,
    relative: budget === 0 ? null : absolute / Math.abs(budget),
    favourable: higherIsBetter ? absolute >= 0 : absolute <= 0,
  };
}

export interface CategoryMargin {
  category: Category;
  revenue: number;
  grossProfit: number;
  /** Gross margin as a fraction. */
  margin: number;
  /** Share of the month's net revenue, as a fraction. */
  revenueShare: number;
}

/** Gross margin by category for one month. */
export function categoryMargins(row: PLMonth): CategoryMargin[] {
  return CATEGORIES.map((category) => {
    const keys = CATEGORY_KEY[category];
    const revenue = row[keys.revenue] as number;
    const grossProfit = row[keys.gp] as number;
    return {
      category,
      revenue,
      grossProfit,
      margin: marginPct(grossProfit, revenue),
      revenueShare: marginPct(revenue, row.net_revenue),
    };
  });
}

export type BridgeKind = "total" | "delta";

export interface BridgeBar {
  label: string;
  kind: BridgeKind;
  /** Signed contribution for a delta; the level itself for a total. */
  value: number;
  /** Lower edge of the drawn bar, in value space. */
  from: number;
  /** Upper edge of the drawn bar, in value space. */
  to: number;
  favourable: boolean;
}

export interface EbitdaBridge {
  bars: BridgeBar[];
  /** Lowest point any bar reaches, including zero. */
  floor: number;
  /** Highest point any bar reaches, including zero. */
  ceiling: number;
  budgetEbitda: number;
  actualEbitda: number;
  totalVariance: number;
  /** The margin-rate effect, which the Variance Ribbon decomposes further. */
  marginEffect: number;
}

/**
 * Budget EBITDA -> Actual EBITDA, decomposed into four effects.
 *
 *   revenue effect = (actual revenue - budget revenue) x budget margin %
 *   margin effect  = actual revenue x (actual margin % - budget margin %)
 *   ad spend       = -(actual ad spend - budget ad spend)
 *   other opex     = -(actual other opex - budget other opex)
 *
 * The first two are the standard price/volume-then-rate split: they sum exactly
 * to the gross profit variance, because
 *   (Ar - Br)Bm + Ar(Am - Bm) = ArAm - BrBm.
 * Opex effects are negated so that overspending reads as a reduction in EBITDA.
 * The four therefore sum exactly to the EBITDA variance, with no plug.
 */
export function ebitdaBridge(
  actual: PLMonth,
  budget: BudgetMonth,
): EbitdaBridge {
  const budgetMargin = marginPct(budget.gross_profit, budget.net_revenue);
  const actualMargin = marginPct(actual.gross_profit, actual.net_revenue);

  const actualOtherOpex = actual.total_opex - actual.ad_spend;
  const budgetOtherOpex = budget.total_opex - budget.ad_spend;

  const effects: { label: string; value: number }[] = [
    {
      label: "Revenue",
      value: (actual.net_revenue - budget.net_revenue) * budgetMargin,
    },
    {
      label: "Margin",
      value: actual.net_revenue * (actualMargin - budgetMargin),
    },
    { label: "Ad spend", value: -(actual.ad_spend - budget.ad_spend) },
    { label: "Other opex", value: -(actualOtherOpex - budgetOtherOpex) },
  ];

  const bars: BridgeBar[] = [
    {
      label: "Budget EBITDA",
      kind: "total",
      value: budget.ebitda,
      from: Math.min(0, budget.ebitda),
      to: Math.max(0, budget.ebitda),
      favourable: true,
    },
  ];

  let running = budget.ebitda;
  for (const effect of effects) {
    const next = running + effect.value;
    bars.push({
      label: effect.label,
      kind: "delta",
      value: effect.value,
      from: Math.min(running, next),
      to: Math.max(running, next),
      favourable: effect.value >= 0,
    });
    running = next;
  }

  bars.push({
    label: "Actual EBITDA",
    kind: "total",
    value: actual.ebitda,
    from: Math.min(0, actual.ebitda),
    to: Math.max(0, actual.ebitda),
    favourable: actual.ebitda >= budget.ebitda,
  });

  return {
    bars,
    floor: Math.min(0, ...bars.map((bar) => bar.from)),
    ceiling: Math.max(0, ...bars.map((bar) => bar.to)),
    budgetEbitda: budget.ebitda,
    actualEbitda: actual.ebitda,
    totalVariance: actual.ebitda - budget.ebitda,
    marginEffect: effects[1].value,
  };
}
