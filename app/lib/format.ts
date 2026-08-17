/**
 * The source datasets carry no currency field, so the unit is an assumption.
 * Change it once here and every figure in the app follows.
 */
export const CURRENCY = "$";

const MONTH_NAMES = [
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

/** Full amount, no decimals: $221,410 */
export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}${CURRENCY}${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
}

/** Compact amount for tiles and axis ticks: $1.2M / $234.5K / $940 */
export function moneyCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${CURRENCY}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${CURRENCY}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${CURRENCY}${Math.round(abs)}`;
}

/** Signed compact amount, for variances: +$12.3K / -$4.1K */
export function moneyCompactSigned(n: number): string {
  const body = moneyCompact(Math.abs(n));
  return `${n < 0 ? "-" : "+"}${body}`;
}

/** A ratio held as a fraction (0.0223) rendered as a percentage: 2.2% */
export function pct(n: number, dp = 1): string {
  return `${(n * 100).toFixed(dp)}%`;
}

/** A signed percentage-point difference: +1.4pp */
export function pctPoints(n: number, dp = 1): string {
  const v = n * 100;
  return `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(dp)}pp`;
}

/** A signed relative change: +4.2% */
export function pctChangeSigned(n: number, dp = 1): string {
  return `${n >= 0 ? "+" : "-"}${Math.abs(n * 100).toFixed(dp)}%`;
}

/** "2024-08" -> "Aug 24" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const name = MONTH_NAMES[Number(m) - 1] ?? m;
  return `${name} ${y.slice(2)}`;
}

/** "2024-08" -> "August 2024" */
export function monthLabelLong(month: string): string {
  const [y, m] = month.split("-");
  const name = MONTH_NAMES[Number(m) - 1] ?? m;
  return `${name} ${y}`;
}
