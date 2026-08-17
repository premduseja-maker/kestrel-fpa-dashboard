import {
  getBudgetMonthly,
  getCashflowMonthly,
  getPlMonthly,
  type BudgetMonth,
  type CashflowMonth,
  type PlMonth,
} from "./data";
import {
  money,
  moneyCompact,
  moneyCompactSigned,
  pct,
  pctChangeSigned,
  pctPoints,
} from "./format";

export const RANGES = [6, 12, 24] as const;
export type RangeMonths = (typeof RANGES)[number];

/**
 * Defaults to 12 months: the dataset is exactly 24 months long, so the 24-month
 * view has no prior window to compare against and lands with its deltas blank.
 */
export const DEFAULT_RANGE: RangeMonths = 12;

export function parseRange(value: string | undefined): RangeMonths {
  const n = Number(value);
  return (RANGES as readonly number[]).includes(n)
    ? (n as RangeMonths)
    : DEFAULT_RANGE;
}

export type ActualVsBudgetPoint = {
  month: string;
  actual: number;
  budget: number;
  variance: number;
};

export type Kpi = {
  label: string;
  /** Pre-formatted headline value. */
  value: string;
  /** Pre-formatted delta, or null when there is no comparable prior period. */
  delta: string | null;
  /** Direction of the delta, for colouring the text token. */
  direction: "up" | "down" | "flat" | null;
  /** Whether an up-move is the good outcome, so colour matches meaning. */
  higherIsBetter: boolean;
  /** What the delta is measured against, spelled out. */
  deltaLabel: string;
  /** Monthly series behind the tile, for the sparkline. */
  spark: number[];
};

export type Overview = {
  months: RangeMonths;
  /** Every month in the current slice, oldest first. */
  periodStart: string;
  periodEnd: string;
  /** True when a preceding window of equal length exists in the data. */
  hasPriorWindow: boolean;
  revenue: ActualVsBudgetPoint[];
  ebitda: ActualVsBudgetPoint[];
  kpis: Kpi[];
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function pairWithBudget(
  pl: PlMonth[],
  budgetByMonth: Map<string, BudgetMonth>,
  pick: (row: PlMonth) => number,
  pickBudget: (row: BudgetMonth) => number,
): ActualVsBudgetPoint[] {
  return pl.flatMap((row) => {
    const budgetRow = budgetByMonth.get(row.month);
    if (!budgetRow) return [];
    const actual = pick(row);
    const budget = pickBudget(budgetRow);
    return [{ month: row.month, actual, budget, variance: actual - budget }];
  });
}

/**
 * Builds every number the overview shows for a trailing window of `months`.
 *
 * KPI deltas compare the window against the equal-length window immediately
 * before it (last 12 months vs the 12 before that), which is why they move when
 * the range filter changes. With 24 months of data there is no prior window for
 * the 24-month range, so those deltas are reported as unavailable rather than
 * against a partial period.
 */
export async function getOverview(months: RangeMonths): Promise<Overview> {
  const [pl, budget, cashflow] = await Promise.all([
    getPlMonthly(),
    getBudgetMonthly(),
    getCashflowMonthly(),
  ]);

  const budgetByMonth = new Map(budget.map((r) => [r.month, r]));

  const window = pl.slice(-months);
  const priorWindow = pl.slice(-(months * 2), -months);
  const hasPriorWindow = priorWindow.length === months;

  const cashByMonth = new Map(cashflow.map((r) => [r.month, r]));
  const windowCash = window
    .map((r) => cashByMonth.get(r.month))
    .filter((r): r is CashflowMonth => Boolean(r));

  const revenue = pairWithBudget(
    window,
    budgetByMonth,
    (r) => r.net_revenue,
    (b) => b.net_revenue,
  );
  const ebitda = pairWithBudget(
    window,
    budgetByMonth,
    (r) => r.ebitda,
    (b) => b.ebitda,
  );

  const revNow = sum(window.map((r) => r.net_revenue));
  const revPrior = sum(priorWindow.map((r) => r.net_revenue));
  const gpNow = sum(window.map((r) => r.gross_profit));
  const gpPrior = sum(priorWindow.map((r) => r.gross_profit));
  const ebitdaNow = sum(window.map((r) => r.ebitda));
  const ebitdaPrior = sum(priorWindow.map((r) => r.ebitda));

  const marginNow = revNow === 0 ? 0 : gpNow / revNow;
  const marginPrior = revPrior === 0 ? 0 : gpPrior / revPrior;

  const closingCash = windowCash.at(-1)?.closing_cash ?? 0;
  const openingCash = windowCash.at(0)?.opening_cash ?? 0;
  const cashMove = closingCash - openingCash;

  const periodWord = `${months} months`;
  const priorLabel = `vs prior ${periodWord}`;

  const relativeDelta = (now: number, prior: number) => {
    if (!hasPriorWindow || prior === 0) return null;
    return (now - prior) / Math.abs(prior);
  };

  const revDelta = relativeDelta(revNow, revPrior);
  const ebitdaDelta = relativeDelta(ebitdaNow, ebitdaPrior);
  const marginDelta = hasPriorWindow ? marginNow - marginPrior : null;

  const directionOf = (n: number | null): Kpi["direction"] =>
    n === null ? null : n > 0 ? "up" : n < 0 ? "down" : "flat";

  const kpis: Kpi[] = [
    {
      label: `Net revenue · last ${periodWord}`,
      value: moneyCompact(revNow),
      delta: revDelta === null ? null : pctChangeSigned(revDelta),
      direction: directionOf(revDelta),
      higherIsBetter: true,
      deltaLabel: priorLabel,
      spark: window.map((r) => r.net_revenue),
    },
    {
      label: "Gross margin",
      value: pct(marginNow),
      delta: marginDelta === null ? null : pctPoints(marginDelta),
      direction: directionOf(marginDelta),
      higherIsBetter: true,
      deltaLabel: priorLabel,
      spark: window.map((r) =>
        r.net_revenue === 0 ? 0 : r.gross_profit / r.net_revenue,
      ),
    },
    {
      label: `EBITDA · last ${periodWord}`,
      value: moneyCompact(ebitdaNow),
      delta: ebitdaDelta === null ? null : pctChangeSigned(ebitdaDelta),
      direction: directionOf(ebitdaDelta),
      higherIsBetter: true,
      deltaLabel: priorLabel,
      spark: window.map((r) => r.ebitda),
    },
    {
      label: "Closing cash",
      value: money(closingCash),
      delta: moneyCompactSigned(cashMove),
      direction: directionOf(cashMove),
      higherIsBetter: true,
      deltaLabel: `movement over ${periodWord}`,
      spark: windowCash.map((r) => r.closing_cash),
    },
  ];

  return {
    months,
    periodStart: window.at(0)?.month ?? "",
    periodEnd: window.at(-1)?.month ?? "",
    hasPriorWindow,
    revenue,
    ebitda,
    kpis,
  };
}
