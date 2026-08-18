import {
  CATEGORY_KEY,
  CATEGORIES,
  type BudgetMonth,
  type CashflowMonth,
  type Category,
  type Month,
  type PLMonth,
} from "../data/types";
import {
  findMonth,
  marginPct,
  momChange,
  yoyChange,
  type EbitdaBridge,
} from "./core";

/** How a KPI's value and movements should be read. */
export type KpiUnit = "currency" | "percent" | "days";

export interface KpiChange {
  absolute: number;
  relative: number | null;
}

export interface Kpi {
  id: string;
  label: string;
  unit: KpiUnit;
  value: number;
  mom: KpiChange | null;
  yoy: KpiChange | null;
  higherIsBetter: boolean;
  series: { month: Month; value: number }[];
}

/**
 * The five headline measures for the executive summary, for one month.
 *
 * Margin and cycle movements are carried as absolute differences only —
 * percentage points and days respectively — because a relative change on a rate
 * invites the "-2.3%" misreading that CLAUDE.md forbids.
 */
export function executiveKpis(
  pl: PLMonth[],
  cashflow: CashflowMonth[],
  month: Month,
): Kpi[] {
  const plRow = findMonth(pl, month);
  const cashRow = findMonth(cashflow, month);

  const marginOf = (row: PLMonth) =>
    marginPct(row.gross_profit, row.net_revenue);

  const rateChange = <T extends { month: Month }>(
    rows: T[],
    pick: (row: T) => number,
    shift: typeof momChange,
  ): KpiChange | null => {
    const change = shift(rows, month, pick);
    if (!change) return null;
    return { absolute: change.absolute, relative: null };
  };

  return [
    {
      id: "net_revenue",
      label: "Net revenue",
      unit: "currency",
      value: plRow?.net_revenue ?? 0,
      mom: momChange(pl, month, (r) => r.net_revenue),
      yoy: yoyChange(pl, month, (r) => r.net_revenue),
      higherIsBetter: true,
      series: pl.map((r) => ({ month: r.month, value: r.net_revenue })),
    },
    {
      id: "gross_margin",
      label: "Gross margin",
      unit: "percent",
      value: plRow ? marginOf(plRow) : 0,
      mom: rateChange(pl, marginOf, momChange),
      yoy: rateChange(pl, marginOf, yoyChange),
      higherIsBetter: true,
      series: pl.map((r) => ({ month: r.month, value: marginOf(r) })),
    },
    {
      id: "ebitda",
      label: "EBITDA",
      unit: "currency",
      value: plRow?.ebitda ?? 0,
      mom: momChange(pl, month, (r) => r.ebitda),
      yoy: yoyChange(pl, month, (r) => r.ebitda),
      higherIsBetter: true,
      series: pl.map((r) => ({ month: r.month, value: r.ebitda })),
    },
    {
      id: "closing_cash",
      label: "Closing cash",
      unit: "currency",
      value: cashRow?.closing_cash ?? 0,
      mom: momChange(cashflow, month, (r) => r.closing_cash),
      yoy: yoyChange(cashflow, month, (r) => r.closing_cash),
      higherIsBetter: true,
      series: cashflow.map((r) => ({ month: r.month, value: r.closing_cash })),
    },
    {
      id: "ccc",
      label: "Cash conversion cycle",
      unit: "days",
      value: cashRow?.cash_conversion_cycle ?? 0,
      mom: rateChange(cashflow, (r) => r.cash_conversion_cycle, momChange),
      yoy: rateChange(cashflow, (r) => r.cash_conversion_cycle, yoyChange),
      higherIsBetter: false,
      series: cashflow.map((r) => ({
        month: r.month,
        value: r.cash_conversion_cycle,
      })),
    },
  ];
}

export interface CategoryMarginVariance {
  category: Category;
  revenue: number;
  /** Actual gross margin for the category, as a fraction. */
  margin: number;
  /** The margin the category is being held to, as a fraction. */
  targetMargin: number;
  /** EBITDA impact in dollars: revenue x (margin - target). */
  impact: number;
  /**
   * Share of the total *magnitude* of category margin movement — that is,
   * |impact| over the sum of all three |impacts|.
   *
   * Deliberately not impact/net-total. When categories move in opposite
   * directions the net total is smaller than the individual moves, so a signed
   * share exceeds 100% (apparel measured 165% of the net in July 2026, because
   * hardgoods and accessories offset it). A share of the gross movement is
   * bounded by 100% and is what a reader means by "how much of this is apparel".
   */
  share: number;
}

/**
 * Splits the month's gross-margin variance across the three categories.
 *
 * ASSUMPTION, and the only one on this screen: budget_monthly carries no
 * category breakdown — it has group net_revenue, gross_profit, ad_spend,
 * total_opex and ebitda only. Each category is therefore held to the *group*
 * budget gross margin %. Stated on screen next to the ribbon so a viewer can
 * audit it.
 *
 * The split is exact rather than approximate: category revenues sum to net
 * revenue and category gross profits sum to group gross profit (verified across
 * all 24 months), so
 *   Σ revenue_c x (margin_c - target) = gross_profit - net_revenue x target
 * which is precisely the margin effect in the EBITDA bridge.
 */
export function marginVarianceByCategory(
  actual: PLMonth,
  budget: BudgetMonth,
): {
  rows: CategoryMarginVariance[];
  /** Net margin effect, matching the bridge's margin bar exactly. */
  total: number;
  /** Sum of the absolute category movements, the denominator for `share`. */
  grossMovement: number;
  targetMargin: number;
} {
  const targetMargin = marginPct(budget.gross_profit, budget.net_revenue);

  const raw = CATEGORIES.map((category) => {
    const keys = CATEGORY_KEY[category];
    const revenue = actual[keys.revenue] as number;
    const grossProfit = actual[keys.gp] as number;
    const margin = marginPct(grossProfit, revenue);
    return {
      category,
      revenue,
      margin,
      targetMargin,
      impact: revenue * (margin - targetMargin),
    };
  });

  const total = raw.reduce((sum, row) => sum + row.impact, 0);
  const grossMovement = raw.reduce((sum, row) => sum + Math.abs(row.impact), 0);

  const rows = raw
    .map((row) => ({
      ...row,
      share: grossMovement === 0 ? 0 : Math.abs(row.impact) / grossMovement,
    }))
    // Most unfavourable first: this is a diagnosis, so the problem leads.
    .sort((a, b) => a.impact - b.impact);

  return { rows, total, grossMovement, targetMargin };
}

export interface RibbonDriver {
  category: Category;
  margin: number;
  targetMargin: number;
  impact: number;
  /** Share of the total category margin movement, as a fraction of magnitude. */
  share: number;
  /** Net margin effect for the month, after the other categories offset. */
  netEffect: number;
  /** True when this driver is dragging EBITDA down. */
  adverse: boolean;
}

/**
 * The single largest driver of the month's margin variance — the Variance
 * Ribbon's content. Returns null only when there is no data for the month.
 */
export function varianceRibbon(
  actual: PLMonth | undefined,
  budget: BudgetMonth | undefined,
  bridge: EbitdaBridge | null,
): RibbonDriver | null {
  if (!actual || !budget || !bridge) return null;

  const { rows, total, targetMargin } = marginVarianceByCategory(actual, budget);
  if (rows.length === 0) return null;

  // Largest absolute contribution, so the ribbon leads with whichever category
  // moves the number most rather than whichever is alphabetically first.
  const leader = rows.reduce((worst, row) =>
    Math.abs(row.impact) > Math.abs(worst.impact) ? row : worst,
  );

  return {
    category: leader.category,
    margin: leader.margin,
    targetMargin,
    impact: leader.impact,
    share: leader.share,
    netEffect: total,
    adverse: leader.impact < 0,
  };
}
