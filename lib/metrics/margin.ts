import {
  CATEGORIES,
  CATEGORY_KEY,
  type Category,
  type Month,
  type PLMonth,
  type SkuMaster,
  type SkuMonth,
} from "../data/types";
import { marginPct, relativeChange, type BridgeBar } from "./core";

/**
 * Screen 2 analytics: where the margin went, and why.
 *
 * SOURCE NOTE. Category margin appears on two bases, and with the refreshed
 * datasets they now agree exactly: aggregated sku_monthly net revenue ties to
 * pl_monthly month by month (worst gap 0.000%), and category margins match to
 * the decimal — apparel 41.0% -> 35.4%, hardgoods 47.9% -> 50.6% either way.
 *
 * Chart (a) still reads pl_monthly while the bridge, table and scatter read
 * sku_monthly, because each is the natural grain for its question — not because
 * the two disagree. An earlier revision of the data had them diverging badly
 * (sku_monthly put apparel at 36.0% -> 25.0% and hardgoods flat at 44.5%), and
 * this screen carried a warning saying so. That warning has been removed: it is
 * no longer true, and a stale caveat is worse than none.
 */

export interface FiscalYears {
  fy1: Month[];
  fy2: Month[];
  fy1Set: Set<Month>;
  fy2Set: Set<Month>;
}

/** Splits a 24-month run into two 12-month comparatives, oldest first. */
export function fiscalYears(months: Month[]): FiscalYears {
  const sorted = [...months].sort((a, b) => a.localeCompare(b));
  const half = Math.floor(sorted.length / 2);
  const fy1 = sorted.slice(0, half);
  const fy2 = sorted.slice(half);
  return {
    fy1,
    fy2,
    fy1Set: new Set(fy1),
    fy2Set: new Set(fy2),
  };
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/* -------------------------------------------------------------------------- */
/* (a) Category margin over time                                              */
/* -------------------------------------------------------------------------- */

export interface CategoryMarginPoint {
  month: Month;
  Apparel: number;
  Hardgoods: number;
  Accessories: number;
  /** Group gross margin — the number that conceals the spread beneath it. */
  group: number;
}

export function categoryMarginSeries(pl: PLMonth[]): CategoryMarginPoint[] {
  return pl.map((row) => {
    const point = {
      month: row.month,
      group: marginPct(row.gross_profit, row.net_revenue),
    } as CategoryMarginPoint;

    for (const category of CATEGORIES) {
      const keys = CATEGORY_KEY[category];
      point[category] = marginPct(
        row[keys.gp] as number,
        row[keys.revenue] as number,
      );
    }
    return point;
  });
}

export interface CategorySpread {
  /** Widest gap between any two category margins, and where it occurs. */
  month: Month;
  spread: number;
  high: Category;
  low: Category;
}

/** The month where the categories are furthest apart — the annotation anchor. */
export function widestSpread(
  series: CategoryMarginPoint[],
): CategorySpread | null {
  let widest: CategorySpread | null = null;

  for (const point of series) {
    let high: Category = CATEGORIES[0];
    let low: Category = CATEGORIES[0];
    for (const category of CATEGORIES) {
      if (point[category] > point[high]) high = category;
      if (point[category] < point[low]) low = category;
    }
    const spread = point[high] - point[low];
    if (!widest || spread > widest.spread) {
      widest = { month: point.month, spread, high, low };
    }
  }

  return widest;
}

/* -------------------------------------------------------------------------- */
/* (b) Gross profit bridge, FY1 -> FY2                                        */
/* -------------------------------------------------------------------------- */

interface SkuYear {
  units: number;
  grossRevenue: number;
  netRevenue: number;
  cogs: number;
  unitsReturned: number;
}

const EMPTY_YEAR: SkuYear = {
  units: 0,
  grossRevenue: 0,
  netRevenue: 0,
  cogs: 0,
  unitsReturned: 0,
};

function aggregate(rows: SkuMonth[]): SkuYear {
  return {
    units: sum(rows.map((r) => r.units_sold)),
    grossRevenue: sum(rows.map((r) => r.gross_revenue)),
    netRevenue: sum(rows.map((r) => r.net_revenue)),
    cogs: sum(rows.map((r) => r.cogs)),
    unitsReturned: sum(rows.map((r) => r.units_returned)),
  };
}

/** Per-unit economics. net revenue per unit is price x (1 - discount) exactly. */
function perUnit(year: SkuYear) {
  const price = year.units ? year.grossRevenue / year.units : 0;
  const discount = year.grossRevenue
    ? 1 - year.netRevenue / year.grossRevenue
    : 0;
  const cost = year.units ? year.cogs / year.units : 0;
  return {
    price,
    discount,
    cost,
    /** Gross profit per unit: price x (1 - discount) - cost. */
    unitGp: price * (1 - discount) - cost,
  };
}

export interface GrossProfitBridge {
  bars: BridgeBar[];
  floor: number;
  ceiling: number;
  gpFy1: number;
  gpFy2: number;
  total: number;
  /** Sum of the five effects, for the footing assertion. */
  effectsTotal: number;
  /** Residual after the five effects. Zero by construction; surfaced anyway. */
  residual: number;
  returns: ReturnsExposure;
}

export interface ReturnsExposure {
  rateFy1: number;
  rateFy2: number;
  unitsFy2: number;
  /**
   * Gross profit that returned units would have carried, at FY2 unit margin.
   *
   * NOT a bridge effect. In this dataset net revenue is gross revenue less
   * discount only, and COGS follows units sold, so recorded gross profit does
   * not move with units_returned at all — a "returns" bar would be structurally
   * zero. This quantifies the exposure instead.
   */
  exposureFy2: number;
}

/**
 * Decomposes the FY1 -> FY2 gross profit movement into five effects that sum to
 * the movement exactly, with no plug:
 *
 *   volume    (Q2 - Q1) x average FY1 unit GP
 *   mix       Q2 x Σ(w2 - w1) x FY1 unit GP        (composition shift)
 *   price     Σ q2 x (p2 - p1) x (1 - d1)
 *   discount  Σ q2 x p2 x (d1 - d2)
 *   unit cost Σ q2 x (c1 - c2)
 *
 * Volume and mix together equal Σq2·g1 - GP1; the three rate effects together
 * equal Σq2·(g2 - g1); so the five sum to GP2 - GP1. The rate effects are a
 * sequential substitution in the order price -> discount -> cost, which is why
 * price is held at the FY1 discount and discount at the FY2 price. A different
 * order shifts value between those three bars; the total is unaffected.
 *
 * `unit cost` is a sixth name the brief did not list. It is kept because a named
 * effect that is silently dropped becomes a plug — and on the current data it is
 * far from negligible: unit cost is the second largest bar on the chart.
 *
 * Measured on the refreshed datasets: discount -$243,497 against volume
 * +$187,939, unit cost +$100,576 and mix +$80,480, netting to +$121,771 with a
 * residual of exactly zero. Two things worth reading off that. Gross profit rose
 * even as the group margin *rate* fell, because volume and mix added more than
 * discounting took away. And mix is positive in dollars while pulling the rate
 * down: apparel carries a higher absolute gross profit per unit than accessories
 * despite a lower percentage, so shifting units toward it lifts dollars and
 * depresses the ratio at the same time.
 *
 * (An earlier revision of the data put unit cost at -$3.82 and the total at
 * -$13,715. If those numbers appear anywhere, they are stale.)
 */
export function grossProfitBridge(
  skuRows: SkuMonth[],
  years: FiscalYears,
): GrossProfitBridge {
  const skus = [...new Set(skuRows.map((row) => row.sku))];

  const fy1ByS = new Map<string, SkuYear>();
  const fy2ByS = new Map<string, SkuYear>();
  for (const sku of skus) {
    const rows = skuRows.filter((row) => row.sku === sku);
    fy1ByS.set(sku, aggregate(rows.filter((r) => years.fy1Set.has(r.month))));
    fy2ByS.set(sku, aggregate(rows.filter((r) => years.fy2Set.has(r.month))));
  }

  const totalUnits1 = sum(skus.map((s) => (fy1ByS.get(s) ?? EMPTY_YEAR).units));
  const totalUnits2 = sum(skus.map((s) => (fy2ByS.get(s) ?? EMPTY_YEAR).units));

  const gpOf = (year: SkuYear) => year.netRevenue - year.cogs;
  const gpFy1 = sum(skus.map((s) => gpOf(fy1ByS.get(s) ?? EMPTY_YEAR)));
  const gpFy2 = sum(skus.map((s) => gpOf(fy2ByS.get(s) ?? EMPTY_YEAR)));

  const averageUnitGp1 = totalUnits1 ? gpFy1 / totalUnits1 : 0;

  let mix = 0;
  let price = 0;
  let discount = 0;
  let unitCost = 0;

  for (const sku of skus) {
    const y1 = fy1ByS.get(sku) ?? EMPTY_YEAR;
    const y2 = fy2ByS.get(sku) ?? EMPTY_YEAR;
    const u1 = perUnit(y1);
    const u2 = perUnit(y2);

    const weight1 = totalUnits1 ? y1.units / totalUnits1 : 0;
    const weight2 = totalUnits2 ? y2.units / totalUnits2 : 0;

    mix += totalUnits2 * (weight2 - weight1) * u1.unitGp;
    price += y2.units * (u2.price - u1.price) * (1 - u1.discount);
    discount += y2.units * u2.price * (u1.discount - u2.discount);
    unitCost += y2.units * (u1.cost - u2.cost);
  }

  const volume = (totalUnits2 - totalUnits1) * averageUnitGp1;

  const effects: { label: string; short: string; value: number }[] = [
    { label: "Volume", short: "Volume", value: volume },
    { label: "Mix", short: "Mix", value: mix },
    { label: "Price", short: "Price", value: price },
    { label: "Discount", short: "Discount", value: discount },
    { label: "Unit cost", short: "Unit cost", value: unitCost },
  ];

  const effectsTotal = sum(effects.map((e) => e.value));

  const bars: BridgeBar[] = [
    {
      label: "FY1 gross profit",
      kind: "total",
      value: gpFy1,
      from: Math.min(0, gpFy1),
      to: Math.max(0, gpFy1),
      favourable: true,
    },
  ];

  let running = gpFy1;
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
    label: "FY2 gross profit",
    kind: "total",
    value: gpFy2,
    from: Math.min(0, gpFy2),
    to: Math.max(0, gpFy2),
    favourable: gpFy2 >= gpFy1,
  });

  const returnsFy1 = sum(
    skus.map((s) => (fy1ByS.get(s) ?? EMPTY_YEAR).unitsReturned),
  );
  const returnsFy2 = sum(
    skus.map((s) => (fy2ByS.get(s) ?? EMPTY_YEAR).unitsReturned),
  );
  const averageUnitGp2 = totalUnits2 ? gpFy2 / totalUnits2 : 0;

  return {
    bars,
    floor: Math.min(0, ...bars.map((bar) => bar.from)),
    ceiling: Math.max(0, ...bars.map((bar) => bar.to)),
    gpFy1,
    gpFy2,
    total: gpFy2 - gpFy1,
    effectsTotal,
    residual: gpFy2 - gpFy1 - effectsTotal,
    returns: {
      rateFy1: totalUnits1 ? returnsFy1 / totalUnits1 : 0,
      rateFy2: totalUnits2 ? returnsFy2 / totalUnits2 : 0,
      unitsFy2: returnsFy2,
      exposureFy2: returnsFy2 * averageUnitGp2,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* (c) SKU table                                                              */
/* -------------------------------------------------------------------------- */

export interface SkuMarginRow {
  sku: string;
  product: string;
  category: Category;
  revenueFy2: number;
  marginFy2: number;
  /** FY2 margin less FY1 margin, as a fraction (render in points). */
  marginDelta: number;
  discountFy2: number;
  returnRateFy2: number;
  /** Monthly gross margin, all 24 months, for the row sparkline. */
  marginSeries: number[];
}

export function skuMarginRows(
  skuRows: SkuMonth[],
  master: SkuMaster[],
  years: FiscalYears,
  months: Month[],
): SkuMarginRow[] {
  const nameBySku = new Map(master.map((row) => [row.sku, row]));
  const skus = [...new Set(skuRows.map((row) => row.sku))];

  return skus.map((sku) => {
    const rows = skuRows.filter((row) => row.sku === sku);
    const byMonth = new Map(rows.map((row) => [row.month, row]));

    const y1 = aggregate(rows.filter((r) => years.fy1Set.has(r.month)));
    const y2 = aggregate(rows.filter((r) => years.fy2Set.has(r.month)));

    const marginFy1 = marginPct(y1.netRevenue - y1.cogs, y1.netRevenue);
    const marginFy2 = marginPct(y2.netRevenue - y2.cogs, y2.netRevenue);

    const meta = nameBySku.get(sku);

    return {
      sku,
      product: meta?.product_name ?? sku,
      category: meta?.category ?? rows[0].category,
      revenueFy2: y2.netRevenue,
      marginFy2,
      marginDelta: marginFy2 - marginFy1,
      discountFy2: y2.grossRevenue ? 1 - y2.netRevenue / y2.grossRevenue : 0,
      returnRateFy2: y2.units ? y2.unitsReturned / y2.units : 0,
      marginSeries: months.map((month) => {
        const row = byMonth.get(month);
        return row ? row.gross_margin_pct : 0;
      }),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* (d) Discount against margin                                                */
/* -------------------------------------------------------------------------- */

export interface ScatterPoint {
  discount: number;
  margin: number;
  year: "FY1" | "FY2";
  sku: string;
  month: Month;
}

export function discountMarginPoints(
  skuRows: SkuMonth[],
  category: Category,
  years: FiscalYears,
): ScatterPoint[] {
  return skuRows
    .filter((row) => row.category === category)
    .map((row) => ({
      discount: row.discount_pct,
      margin: row.gross_margin_pct,
      year: years.fy1Set.has(row.month) ? ("FY1" as const) : ("FY2" as const),
      sku: row.sku,
      month: row.month,
    }));
}

export interface LinearFit {
  slope: number;
  intercept: number;
  /** Pearson correlation coefficient. */
  r: number;
  /** Endpoints for drawing the fitted line. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Ordinary least squares through the scatter, plus its correlation. */
export function linearFit(points: ScatterPoint[]): LinearFit | null {
  const n = points.length;
  if (n < 3) return null;

  const xs = points.map((p) => p.discount);
  const ys = points.map((p) => p.margin);
  const meanX = sum(xs) / n;
  const meanY = sum(ys) / n;

  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const x1 = Math.min(...xs);
  const x2 = Math.max(...xs);

  return {
    slope,
    intercept,
    r: sxy / Math.sqrt(sxx * syy),
    x1,
    y1: intercept + slope * x1,
    x2,
    y2: intercept + slope * x2,
  };
}

/* -------------------------------------------------------------------------- */
/* Interpretation block                                                       */
/* -------------------------------------------------------------------------- */

export interface CategoryMove {
  category: Category;
  marginFy1: number;
  marginFy2: number;
  delta: number;
  revenueShareFy2: number;
}

export interface MarginNarrative {
  groupFy1: number;
  groupFy2: number;
  groupDelta: number;
  revenueGrowth: number | null;
  /** Margin percentages from pl_monthly; ordered worst movement first. */
  moves: CategoryMove[];
  worst: CategoryMove;
  best: CategoryMove;
  /** SKU-level discount for the worst category, FY1 -> FY2. */
  worstDiscountFy1: number;
  worstDiscountFy2: number;
}

export function marginNarrative(
  pl: PLMonth[],
  skuRows: SkuMonth[],
  years: FiscalYears,
): MarginNarrative | null {
  const fy1Rows = pl.filter((row) => years.fy1Set.has(row.month));
  const fy2Rows = pl.filter((row) => years.fy2Set.has(row.month));
  if (fy1Rows.length === 0 || fy2Rows.length === 0) return null;

  const revenue = (rows: PLMonth[]) => sum(rows.map((r) => r.net_revenue));
  const groupFy1 = marginPct(
    sum(fy1Rows.map((r) => r.gross_profit)),
    revenue(fy1Rows),
  );
  const groupFy2 = marginPct(
    sum(fy2Rows.map((r) => r.gross_profit)),
    revenue(fy2Rows),
  );

  const revenueFy2 = revenue(fy2Rows);

  const moves: CategoryMove[] = CATEGORIES.map((category) => {
    const keys = CATEGORY_KEY[category];
    const rev1 = sum(fy1Rows.map((r) => r[keys.revenue] as number));
    const rev2 = sum(fy2Rows.map((r) => r[keys.revenue] as number));
    const marginFy1 = marginPct(
      sum(fy1Rows.map((r) => r[keys.gp] as number)),
      rev1,
    );
    const marginFy2 = marginPct(
      sum(fy2Rows.map((r) => r[keys.gp] as number)),
      rev2,
    );
    return {
      category,
      marginFy1,
      marginFy2,
      delta: marginFy2 - marginFy1,
      revenueShareFy2: revenueFy2 ? rev2 / revenueFy2 : 0,
    };
  }).sort((a, b) => a.delta - b.delta);

  const worst = moves[0];
  const best = moves[moves.length - 1];

  const discountFor = (set: Set<Month>) => {
    const rows = skuRows.filter(
      (row) => row.category === worst.category && set.has(row.month),
    );
    const gross = sum(rows.map((r) => r.gross_revenue));
    return gross ? 1 - sum(rows.map((r) => r.net_revenue)) / gross : 0;
  };

  return {
    groupFy1,
    groupFy2,
    groupDelta: groupFy2 - groupFy1,
    revenueGrowth: relativeChange(revenueFy2, revenue(fy1Rows)),
    moves,
    worst,
    best,
    worstDiscountFy1: discountFor(years.fy1Set),
    worstDiscountFy2: discountFor(years.fy2Set),
  };
}
