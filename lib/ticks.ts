/**
 * Axis tick helper.
 *
 * Recharts picks its own ticks, and left to itself produces values like
 * "$95.0k" — or, on a shifted waterfall frame, "($9)" where zero should be.
 * Axis labels carry every value that isn't directly labelled, so they have to be
 * round. These are computed explicitly and handed to the axis.
 */

export interface TickScale {
  lo: number;
  hi: number;
  ticks: number[];
}

/**
 * Round ticks spanning [min, max]. Chooses the smallest step from the
 * 1 / 2 / 2.5 / 5 ladder that fits within `maxTicks` intervals, so the domain
 * hugs the data instead of rounding out to twice its range.
 */
export function niceTicks(
  min: number,
  max: number,
  maxTicks = 6,
): TickScale {
  let lo = min;
  let hi = max;
  if (lo > hi) [lo, hi] = [hi, lo];
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }

  const exponent = Math.floor(Math.log10(hi - lo));
  const steps: number[] = [];
  for (let e = exponent - 2; e <= exponent + 2; e += 1) {
    const magnitude = 10 ** e;
    for (const multiple of [1, 2, 2.5, 5]) steps.push(multiple * magnitude);
  }
  steps.sort((a, b) => a - b);

  const step =
    steps.find((s) => Math.ceil(hi / s) - Math.floor(lo / s) <= maxTicks) ??
    steps[steps.length - 1];

  const niceLo = Math.floor(lo / step) * step;
  const niceHi = Math.ceil(hi / step) * step;

  const ticks: number[] = [];
  for (let value = niceLo; value <= niceHi + step * 1e-6; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }

  return { lo: niceLo, hi: niceHi, ticks };
}
