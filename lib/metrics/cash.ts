import type {
  ArAgeingMonth,
  CashflowMonth,
  Category,
  InventoryMonth,
  Month,
  PLMonth,
  SkuMaster,
} from "../data/types";

/**
 * Screen 3 analytics: the cash conversion cycle, a 13-week forecast, inventory
 * cover and receivables ageing.
 *
 * Sign convention, verified across all 24 months: in cashflow_monthly, `capex`
 * and `interest_paid` are stored as POSITIVE magnitudes representing outflows,
 * so the identity is
 *     net_change = ebitda + working_capital_change - capex - interest_paid
 * Adding them instead leaves a $16,700 gap in 2024-09. Everything below
 * subtracts them.
 */

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/* -------------------------------------------------------------------------- */
/* (a) Cash conversion cycle                                                  */
/* -------------------------------------------------------------------------- */

export interface CyclePoint {
  month: Month;
  dio: number;
  dso: number;
  /** Negated for plotting: payables fund the cycle rather than extending it. */
  dpoNegative: number;
  dpo: number;
  ccc: number;
}

/**
 * CCC = DIO + DSO - DPO, so the three drivers cannot simply be stacked: a stack
 * of all three sums to DIO+DSO+DPO, a quantity with no meaning. DPO is carried
 * negated so the stacked band's net height above zero is the cycle itself.
 */
export function cycleSeries(cashflow: CashflowMonth[]): CyclePoint[] {
  return cashflow.map((row) => ({
    month: row.month,
    dio: row.dio,
    dso: row.dso,
    dpo: row.dpo,
    dpoNegative: -row.dpo,
    ccc: row.cash_conversion_cycle,
  }));
}

export interface CycleDrift {
  firstMonth: Month;
  lastMonth: Month;
  first: number;
  last: number;
  delta: number;
  peak: number;
  peakMonth: Month;
  /** Which driver moved most, in days. */
  leadDriver: "Inventory" | "Receivables" | "Payables";
  leadDriverDelta: number;
}

export function cycleDrift(cashflow: CashflowMonth[]): CycleDrift | null {
  if (cashflow.length < 2) return null;

  const first = cashflow[0];
  const last = cashflow[cashflow.length - 1];
  const peakRow = cashflow.reduce((worst, row) =>
    row.cash_conversion_cycle > worst.cash_conversion_cycle ? row : worst,
  );

  const moves: { name: CycleDrift["leadDriver"]; delta: number }[] = [
    { name: "Inventory", delta: last.dio - first.dio },
    { name: "Receivables", delta: last.dso - first.dso },
    // A fall in DPO lengthens the cycle, so its contribution is negated.
    { name: "Payables", delta: -(last.dpo - first.dpo) },
  ];
  const lead = moves.reduce((worst, move) =>
    Math.abs(move.delta) > Math.abs(worst.delta) ? move : worst,
  );

  return {
    firstMonth: first.month,
    lastMonth: last.month,
    first: first.cash_conversion_cycle,
    last: last.cash_conversion_cycle,
    delta: last.cash_conversion_cycle - first.cash_conversion_cycle,
    peak: peakRow.cash_conversion_cycle,
    peakMonth: peakRow.month,
    leadDriver: lead.name,
    leadDriverDelta: lead.delta,
  };
}

/* -------------------------------------------------------------------------- */
/* (b) 13-week cash forecast                                                  */
/* -------------------------------------------------------------------------- */

export interface CashAssumptions {
  asOf: Month;
  basisMonths: number;
  weeklyRevenue: number;
  /** Card-settled, so treated as collected within the week of sale. */
  weeklyDtcRevenue: number;
  /** Invoiced to trade customers, so collected after the wholesale terms. */
  weeklyWholesaleRevenue: number;
  grossMargin: number;
  weeklyCogs: number;
  weeklyOpex: number;
  weeklyCapex: number;
  /**
   * Collection days the model actually uses, implied by the receivables book
   * against wholesale revenue.
   */
  wholesaleCollectionDays: number;
  /** The blended DSO reported in cashflow_monthly, shown for reference only. */
  statedDso: number;
  dpo: number;
  dio: number;
  openingCash: number;
  openingAr: number;
  /** Derived from DPO and trailing purchases — no payables table in the data. */
  openingAp: number;
}

/**
 * Every input the forecast uses, drawn from the data rather than chosen.
 *
 * Run rates come from the trailing three months, which is short enough to
 * reflect the current trajectory and long enough not to ride one odd month.
 *
 * TWO THINGS THIS GETS RIGHT THAT A NAIVE READING WOULD NOT:
 *
 * 1. ar_ageing is the WHOLESALE book — ten named trade customers — while 68.6%
 *    of revenue is DTC and settles by card. Ageing all revenue over DSO starves
 *    the opening weeks of receipts and sends the projection to -$280k, which is
 *    an artefact of the model rather than anything in the business. DTC is
 *    therefore collected in the week of sale and wholesale after its terms.
 *
 * 2. The DSO in cashflow_monthly (42.3 days) does not reconcile to the AR book:
 *    the balance implies 8.7 days against total revenue, or 27.8 against
 *    wholesale revenue. The model uses the AR-implied wholesale figure, because
 *    that is the balance actually being collected. The stated DSO is carried
 *    through to the panel, labelled, so the discrepancy is visible rather than
 *    quietly resolved.
 */
export function cashAssumptions(
  pl: PLMonth[],
  cashflow: CashflowMonth[],
  ar: ArAgeingMonth[],
  basisMonths = 3,
): CashAssumptions | null {
  if (pl.length === 0 || cashflow.length === 0) return null;

  const recentPl = pl.slice(-basisMonths);
  const recentCash = cashflow.slice(-basisMonths);
  const last = cashflow[cashflow.length - 1];

  // Three calendar months is treated as 13 weeks.
  const weeks = basisMonths * (13 / 3);

  const revenue = sum(recentPl.map((r) => r.net_revenue));
  const cogs = sum(recentPl.map((r) => r.cogs));
  const trailingCogs = sum(pl.slice(-12).map((r) => r.cogs));
  const trailingWholesale = sum(pl.slice(-12).map((r) => r.revenue_wholesale));

  const openingAr = sum(
    ar.filter((row) => row.month === last.month).map((row) => row.total_outstanding),
  );

  return {
    asOf: last.month,
    basisMonths,
    weeklyRevenue: revenue / weeks,
    weeklyDtcRevenue: sum(recentPl.map((r) => r.revenue_dtc)) / weeks,
    weeklyWholesaleRevenue:
      sum(recentPl.map((r) => r.revenue_wholesale)) / weeks,
    grossMargin: revenue ? (revenue - cogs) / revenue : 0,
    weeklyCogs: cogs / weeks,
    weeklyOpex: sum(recentPl.map((r) => r.total_opex)) / weeks,
    weeklyCapex: sum(recentCash.map((r) => r.capex)) / weeks,
    wholesaleCollectionDays: trailingWholesale
      ? openingAr / (trailingWholesale / 365)
      : last.dso,
    statedDso: last.dso,
    dpo: last.dpo,
    dio: last.dio,
    openingCash: last.closing_cash,
    openingAr,
    openingAp: (last.dpo / 365) * trailingCogs,
  };
}

export interface ForecastWeek {
  week: number;
  label: string;
  collections: number;
  supplierPayments: number;
  opex: number;
  capex: number;
  netChange: number;
  closingCash: number;
}

/**
 * Thirteen weeks forward, on the stated assumptions.
 *
 * Opening receivables collect evenly across the wholesale terms and opening
 * payables settle evenly across DPO days. DTC sales are card-settled and land in
 * the week of sale; wholesale sales land after the terms. Purchases equal COGS,
 * which holds inventory cover at the current DIO rather than assuming a
 * reduction — the forecast shows the current trajectory, so any improvement has
 * to be a decision the reader makes, not one the model assumes for them.
 */
export function weeklyCashForecast(
  assumptions: CashAssumptions,
  weeks = 13,
): ForecastWeek[] {
  const arWeeks = Math.max(assumptions.wholesaleCollectionDays / 7, 0.01);
  const apWeeks = Math.max(assumptions.dpo / 7, 0.01);

  /** Cumulative cash in from receivables by the end of week w. */
  const collectedBy = (w: number) =>
    assumptions.openingAr * Math.min(1, w / arWeeks) +
    assumptions.weeklyWholesaleRevenue * Math.max(0, w - arWeeks) +
    assumptions.weeklyDtcRevenue * w;

  /** Cumulative cash out to suppliers by the end of week w. */
  const paidBy = (w: number) =>
    assumptions.openingAp * Math.min(1, w / apWeeks) +
    assumptions.weeklyCogs * Math.max(0, w - apWeeks);

  const rows: ForecastWeek[] = [];
  let cash = assumptions.openingCash;

  for (let week = 1; week <= weeks; week += 1) {
    const collections = collectedBy(week) - collectedBy(week - 1);
    const supplierPayments = paidBy(week) - paidBy(week - 1);
    const netChange =
      collections -
      supplierPayments -
      assumptions.weeklyOpex -
      assumptions.weeklyCapex;

    cash += netChange;

    rows.push({
      week,
      label: `W${week}`,
      collections,
      supplierPayments,
      opex: assumptions.weeklyOpex,
      capex: assumptions.weeklyCapex,
      netChange,
      closingCash: cash,
    });
  }

  return rows;
}

/* -------------------------------------------------------------------------- */
/* (c) Inventory cover                                                        */
/* -------------------------------------------------------------------------- */

export interface HeatCell {
  month: Month;
  /** Value-weighted months on hand for the category. */
  monthsOnHand: number;
  closingValue: number;
}

export interface HeatRow {
  category: Category;
  cells: HeatCell[];
}

/**
 * Months on hand by category and month, weighted by closing value so a big slow
 * line is not averaged away by a small fast one.
 */
export function inventoryHeat(
  inventory: InventoryMonth[],
  months: Month[],
  categories: readonly Category[],
): HeatRow[] {
  return categories.map((category) => ({
    category,
    cells: months.map((month) => {
      const rows = inventory.filter(
        (row) => row.category === category && row.month === month,
      );
      const value = sum(rows.map((row) => row.closing_value));
      const weighted = sum(
        rows.map((row) => row.months_on_hand * row.closing_value),
      );
      return {
        month,
        monthsOnHand: value ? weighted / value : 0,
        closingValue: value,
      };
    }),
  }));
}

export interface ExcessStockRow {
  sku: string;
  product: string;
  category: Category;
  monthsOnHand: number;
  closingValue: number;
  /** Stock value above the target cover — the cash that would be released. */
  cashReleased: number;
}

/**
 * SKUs with the most cash tied up above a target cover.
 *
 * cashReleased = closing value x (1 - target / actual cover), which is the value
 * of the units beyond the target months of supply. SKUs already at or below
 * target release nothing and are excluded rather than shown as negatives.
 */
export function excessStock(
  inventory: InventoryMonth[],
  master: SkuMaster[],
  month: Month,
  targetCover: number,
  limit = 10,
): ExcessStockRow[] {
  const meta = new Map(master.map((row) => [row.sku, row]));

  return inventory
    .filter((row) => row.month === month && row.months_on_hand > targetCover)
    .map((row) => ({
      sku: row.sku,
      product: meta.get(row.sku)?.product_name ?? row.sku,
      category: row.category,
      monthsOnHand: row.months_on_hand,
      closingValue: row.closing_value,
      cashReleased:
        row.closing_value * (1 - targetCover / row.months_on_hand),
    }))
    .sort((a, b) => b.cashReleased - a.cashReleased)
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* (d) Receivables ageing                                                     */
/* -------------------------------------------------------------------------- */

export const AGEING_BUCKETS = [
  { key: "current", label: "Current" },
  { key: "d_1_30", label: "1–30" },
  { key: "d_31_60", label: "31–60" },
  { key: "d_61_90", label: "61–90" },
  { key: "d_90_plus", label: "90+" },
] as const;

export type AgeingKey = (typeof AGEING_BUCKETS)[number]["key"];

export interface AgeingPoint {
  month: Month;
  current: number;
  d_1_30: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  total: number;
  /** Share of the book that is past due, as a fraction. */
  pastDueShare: number;
}

export function ageingSeries(
  ar: ArAgeingMonth[],
  months: Month[],
): AgeingPoint[] {
  return months.map((month) => {
    const rows = ar.filter((row) => row.month === month);
    const point = {
      month,
      current: sum(rows.map((r) => r.current)),
      d_1_30: sum(rows.map((r) => r.d_1_30)),
      d_31_60: sum(rows.map((r) => r.d_31_60)),
      d_61_90: sum(rows.map((r) => r.d_61_90)),
      d_90_plus: sum(rows.map((r) => r.d_90_plus)),
      total: sum(rows.map((r) => r.total_outstanding)),
    };
    return {
      ...point,
      pastDueShare: point.total
        ? (point.total - point.current) / point.total
        : 0,
    };
  });
}

export interface CustomerAgeingRow {
  customer: string;
  current: number;
  d_1_30: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  total: number;
  pastDueShare: number;
  /** Change in past-due share against the comparison month, in fraction points. */
  pastDueShift: number | null;
}

export interface CustomerAgeingResult {
  rows: CustomerAgeingRow[];
  /** Range of past-due shift across customers, in fraction points. */
  shiftSpread: number;
  /**
   * True when every account shares essentially the same ageing profile.
   *
   * It is true of this dataset: all ten customers sit at 49.0% past due having
   * moved +1.02pts over six months, identically. Ranking them by "who is
   * deteriorating fastest" would therefore be ranking a tie and inventing a
   * distinction the data does not contain, so the table sorts by balance instead
   * and says why.
   */
  uniformProfile: boolean;
}

/**
 * Customer ageing for one month, with the movement in past-due share against a
 * comparison month so the ones deteriorating fastest can be surfaced rather than
 * just the ones that are largest — where the data supports that ranking.
 */
export function customerAgeing(
  ar: ArAgeingMonth[],
  month: Month,
  comparisonMonth: Month | null,
): CustomerAgeingResult {
  const shareOf = (row: ArAgeingMonth) =>
    row.total_outstanding
      ? (row.total_outstanding - row.current) / row.total_outstanding
      : 0;

  const comparison = new Map(
    comparisonMonth
      ? ar
          .filter((row) => row.month === comparisonMonth)
          .map((row) => [row.customer, shareOf(row)])
      : [],
  );

  const rows: CustomerAgeingRow[] = ar
    .filter((row) => row.month === month)
    .map((row) => {
      const share = shareOf(row);
      const previous = comparison.get(row.customer);
      return {
        customer: row.customer,
        current: row.current,
        d_1_30: row.d_1_30,
        d_31_60: row.d_31_60,
        d_61_90: row.d_61_90,
        d_90_plus: row.d_90_plus,
        total: row.total_outstanding,
        pastDueShare: share,
        pastDueShift: previous === undefined ? null : share - previous,
      };
    });

  const shifts = rows
    .map((row) => row.pastDueShift)
    .filter((shift): shift is number => shift !== null);

  const shiftSpread =
    shifts.length > 1 ? Math.max(...shifts) - Math.min(...shifts) : 0;
  // Half a percentage point of spread across the book is the threshold for
  // treating a ranking as meaningful rather than as noise on a tie.
  const uniformProfile = shifts.length > 1 && shiftSpread < 0.005;

  rows.sort((a, b) =>
    uniformProfile
      ? b.total - a.total
      : (b.pastDueShift ?? -Infinity) - (a.pastDueShift ?? -Infinity),
  );

  return { rows, shiftSpread, uniformProfile };
}
