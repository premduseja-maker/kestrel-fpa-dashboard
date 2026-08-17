const WIDTH = 160;
const HEIGHT = 28;
const PAD = 3;

/**
 * 24-month context strip inside a stat card. Quiet by construction: the line is
 * secondary ink and the marker is primary ink — the signal accent is not spent
 * here, so it still means something when the Variance Ribbon uses it.
 */
export function Sparkline({
  values,
  markerIndex,
}: {
  values: number[];
  /** The month the card is reporting, highlighted along the run. */
  markerIndex: number;
}) {
  if (values.length < 2) {
    return <div style={{ height: HEIGHT }} aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (index: number) => (index / (values.length - 1)) * WIDTH;
  const y = (value: number) =>
    HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2);

  const path = values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(value).toFixed(2)}`)
    .join(" ");

  const safeIndex = Math.min(Math.max(markerIndex, 0), values.length - 1);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      className="block"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--muted)"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={x(safeIndex)}
        cy={y(values[safeIndex])}
        r={2.5}
        fill="var(--ink)"
        stroke="var(--surface)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
