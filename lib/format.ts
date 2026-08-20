/**
 * Every figure on screen goes through this file. Raw JS numbers never reach the
 * DOM.
 *
 * The conventions are the accounting ones, not the web ones: negative currency
 * wears parentheses rather than a minus sign, margin movements are stated in
 * percentage points rather than percent, and figures are set in tabular
 * numerals so columns line up.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Wraps a negative in parentheses; the caller supplies the magnitude string. */
function accounting(value: number, magnitude: string): string {
  return value < 0 ? `(${magnitude})` : magnitude;
}

/**
 * Headline currency, compacted: `$3.1M`, `$221.4k`, `$940`.
 * Negative: `($89.7k)`.
 */
export function usd(value: number): string {
  const abs = Math.abs(value);
  let magnitude: string;

  if (abs >= 1_000_000) magnitude = `$${(abs / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000) magnitude = `$${(abs / 1_000).toFixed(1)}k`;
  else magnitude = `$${Math.round(abs)}`;

  return accounting(value, magnitude);
}

/**
 * Full dollars, for tables only: `$221,410`. Negative: `($89,724)`.
 */
export function usdFull(value: number): string {
  const magnitude = `$${Math.round(Math.abs(value)).toLocaleString("en-US")}`;
  return accounting(value, magnitude);
}

/**
 * A per-unit amount, to the cent: `$24.84`.
 *
 * Whole dollars are right for statement lines but wrong here — unit margins are
 * small enough that rounding $24.84 to $25 loses a tenth of the number and reads
 * as an estimate rather than a measurement.
 */
export function usdUnit(value: number): string {
  const magnitude = `$${Math.abs(value).toFixed(2)}`;
  return accounting(value, magnitude);
}

/** A ratio held as a fraction (0.442) as a percentage to one decimal: `44.2%`. */
export function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

/**
 * A margin or rate *movement*, in percentage points and labelled as such:
 * `-2.3pts`, `+1.4pts`. Never render a margin move as a percentage — a move
 * from 44% to 42% is 2 points, not 2 percent.
 */
export function pts(fractionDelta: number): string {
  const points = fractionDelta * 100;
  const sign = points > 0 ? "+" : points < 0 ? "-" : "";
  return `${sign}${Math.abs(points).toFixed(1)}pts`;
}

/**
 * Magnitude only, for prose that already carries the direction in words —
 * "fell 2.3pts" rather than the double negative "fell -2.3pts".
 */
export function ptsMagnitude(fractionDelta: number): string {
  return `${Math.abs(fractionDelta * 100).toFixed(1)}pts`;
}

/** A relative change in a value: `+15.4%`, `-91.6%`. */
export function pctChange(fraction: number): string {
  const value = fraction * 100;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/** A count of days, for cycle metrics: `124 days`. */
export function days(value: number): string {
  return `${Math.round(value)} days`;
}

/** Days where space is tight, such as an axis tick: `124d`. */
export function daysShort(value: number): string {
  return `${Math.round(value)}d`;
}

/** Months of inventory cover, compact: `2.7m`. */
export function coverMonths(value: number): string {
  return `${value.toFixed(1)}m`;
}

/** Months of inventory cover, spelled out: `2.7 months`. */
export function coverMonthsLong(value: number): string {
  return `${value.toFixed(1)} months`;
}

/** A plain count of things: `3,550`. */
export function count(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/**
 * A bare statistic that is not a currency, a rate or a count — a correlation
 * coefficient, for instance. Signed with a minus, because parentheses are the
 * accounting convention for money and would misread here.
 */
export function statistic(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/** A signed movement in days: `+50 days`. */
export function daysChange(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(Math.round(value))} days`;
}

/** `2025-08` -> `Aug '25` */
export function monthShort(month: string): string {
  const [year, m] = month.split("-");
  const name = MONTHS[Number(m) - 1] ?? m;
  return `${name} '${year.slice(2)}`;
}

/** `2025-08` -> `August 2025`, for accessible labels and prose. */
export function monthLong(month: string): string {
  const [year, m] = month.split("-");
  const name = MONTHS_LONG[Number(m) - 1] ?? m;
  return `${name} ${year}`;
}
