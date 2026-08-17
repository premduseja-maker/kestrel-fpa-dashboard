import type { Kpi } from "../lib/overview";

const SPARK_W = 140;
const SPARK_H = 32;

/**
 * A bare stat tile is the one form that ships without a hover layer — there is
 * no plot to interrogate, and every number on it is already visible as text.
 */
export function StatTile({ kpi }: { kpi: Kpi }) {
  const spark = sparkGeometry(kpi.spark);

  const good =
    kpi.direction === "flat" || kpi.direction === null
      ? null
      : (kpi.direction === "up") === kpi.higherIsBetter;

  const deltaClass =
    good === null
      ? "text-ink-secondary"
      : good
        ? "text-delta-up"
        : "text-delta-down";

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-4">
      <p className="text-[13px] leading-tight text-ink-secondary">{kpi.label}</p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-primary">
        {kpi.value}
      </p>

      <div className="mt-1.5 flex items-baseline gap-1.5 text-[12px]">
        {kpi.delta === null ? (
          <span className="text-ink-muted">No prior period in the data</span>
        ) : (
          <>
            {/* Glyph + spelled-out comparison, so direction never rests on colour alone. */}
            <span className={`${deltaClass} font-medium`}>
              {kpi.direction === "up" ? "▲" : kpi.direction === "down" ? "▼" : "■"}{" "}
              {kpi.delta}
            </span>
            <span className="text-ink-muted">{kpi.deltaLabel}</span>
          </>
        )}
      </div>

      {spark && (
        <svg
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          className="mt-3 h-8 w-full"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d={spark.path}
            fill="none"
            stroke="var(--ink-muted)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Current period in the accent, with a surface ring so it reads over the line. */}
          <circle
            cx={spark.lastX}
            cy={spark.lastY}
            r={3.5}
            fill="var(--series-1)"
            stroke="var(--surface-1)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}

function sparkGeometry(values: number[]) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;

  const px = (i: number) => (i / (values.length - 1)) * SPARK_W;
  const py = (v: number) =>
    SPARK_H - pad - ((v - min) / span) * (SPARK_H - pad * 2);

  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(2)} ${py(v).toFixed(2)}`)
    .join(" ");

  return {
    path,
    lastX: px(values.length - 1),
    lastY: py(values[values.length - 1]),
  };
}
