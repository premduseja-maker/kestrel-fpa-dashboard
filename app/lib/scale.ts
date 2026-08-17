/**
 * Axis helpers. Client-safe (no node imports) so chart components can use them.
 */

export type NiceScale = {
  lo: number;
  hi: number;
  step: number;
  ticks: number[];
};

/**
 * Round a domain out to clean tick values (0 / 50,000 / 100,000 …) so the axis
 * carries the values that aren't directly labelled.
 *
 * Picks the *smallest* step from the 1/2/2.5/5 ladder that still fits inside
 * `maxTicks`. Deriving the step from an average tick width instead lets one
 * rounding jump (5 -> 10) blow the domain out to twice the data's range, which
 * leaves the marks squashed into the middle of an empty plot.
 */
export function niceScale(min: number, max: number, maxTicks = 8): NiceScale {
  let lo = min;
  let hi = max;
  if (lo > hi) [lo, hi] = [hi, lo];
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }

  const exponent = Math.floor(Math.log10(hi - lo));
  const steps: number[] = [];
  for (let e = exponent - 2; e <= exponent + 2; e++) {
    const magnitude = Math.pow(10, e);
    for (const multiple of [1, 2, 2.5, 5]) steps.push(multiple * magnitude);
  }
  steps.sort((a, b) => a - b);

  const step =
    steps.find((s) => Math.ceil(hi / s) - Math.floor(lo / s) <= maxTicks) ??
    steps[steps.length - 1];

  const niceLo = Math.floor(lo / step) * step;
  const niceHi = Math.ceil(hi / step) * step;

  const ticks: number[] = [];
  // Guard the loop against float drift accumulating past the top tick.
  for (let v = niceLo; v <= niceHi + step * 1e-6; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }

  return { lo: niceLo, hi: niceHi, step, ticks };
}

/**
 * A rounded-rect path with the radius applied only to the data end, square at
 * the baseline — the bar/column spec. `y0` is the baseline, `y1` the data end,
 * so a negative bar (y1 > y0) rounds its bottom instead of its top.
 */
export function barPath(
  x: number,
  width: number,
  y0: number,
  y1: number,
  radius = 4,
): string {
  const up = y1 <= y0;
  const height = Math.abs(y0 - y1);
  const r = Math.min(radius, width / 2, height);
  const left = x;
  const right = x + width;

  if (height === 0) return `M ${left} ${y0} L ${right} ${y0}`;

  if (up) {
    // grows upward: round the top two corners
    return [
      `M ${left} ${y0}`,
      `L ${left} ${y1 + r}`,
      `Q ${left} ${y1} ${left + r} ${y1}`,
      `L ${right - r} ${y1}`,
      `Q ${right} ${y1} ${right} ${y1 + r}`,
      `L ${right} ${y0}`,
      "Z",
    ].join(" ");
  }

  // grows downward: round the bottom two corners
  return [
    `M ${left} ${y0}`,
    `L ${left} ${y1 - r}`,
    `Q ${left} ${y1} ${left + r} ${y1}`,
    `L ${right - r} ${y1}`,
    `Q ${right} ${y1} ${right} ${y1 - r}`,
    `L ${right} ${y0}`,
    "Z",
  ].join(" ");
}
