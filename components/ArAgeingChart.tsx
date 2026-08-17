"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthLong, monthShort, pct, usd, usdFull } from "@/lib/format";
import { AGEING_BUCKETS, type AgeingPoint } from "@/lib/metrics/cash";
import { niceTicks } from "@/lib/ticks";
import { usePrefersReducedMotion } from "./hooks";

export const AGEING_HEIGHT = 320;

/** Ordinal ramp: one hue deepening with age. Order matters, hue identity does not. */
const BUCKET_FILL: Record<string, string> = {
  current: "var(--ageing-1)",
  d_1_30: "var(--ageing-2)",
  d_31_60: "var(--ageing-3)",
  d_61_90: "var(--ageing-4)",
  d_90_plus: "var(--ageing-5)",
};

export function ArAgeingChart({ series }: { series: AgeingPoint[] }) {
  const reducedMotion = usePrefersReducedMotion();

  if (series.length === 0) return <div style={{ height: AGEING_HEIGHT }} />;

  const scale = niceTicks(0, Math.max(...series.map((p) => p.total)), 6);

  return (
    <div style={{ height: AGEING_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 12, right: 20, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="var(--rule)" vertical={false} />

          <XAxis
            dataKey="month"
            tickFormatter={monthShort}
            interval={2}
            axisLine={{ stroke: "var(--rule)" }}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            minTickGap={4}
          />
          <YAxis
            domain={[scale.lo, scale.hi]}
            ticks={scale.ticks}
            tickFormatter={usd}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            width={58}
          />

          <Tooltip content={<AgeingTooltip />} cursor={{ fill: "var(--ink-wash)" }} />

          {AGEING_BUCKETS.map((bucket, index) => (
            <Bar
              key={bucket.key}
              dataKey={bucket.key}
              stackId="ageing"
              fill={BUCKET_FILL[bucket.key]}
              // A 2px surface stroke is the gap between segments, per the mark
              // spec — the separation is white space, not an outline colour.
              stroke="var(--surface)"
              strokeWidth={1}
              maxBarSize={26}
              radius={
                index === AGEING_BUCKETS.length - 1 ? [2, 2, 0, 0] : undefined
              }
              isAnimationActive={!reducedMotion}
              animationDuration={400}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AgeingTooltipPayload {
  payload?: AgeingPoint;
}

function AgeingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: AgeingTooltipPayload[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div
      className="border border-rule bg-surface px-2.5 py-2 text-[11px]"
      style={{ borderRadius: 5 }}
    >
      <p className="text-muted">{monthLong(row.month)}</p>
      <p className="fig mt-1 font-semibold text-ink">{usdFull(row.total)}</p>
      <p className="text-muted">
        outstanding · <span className="fig">{pct(row.pastDueShare)}</span> past
        due
      </p>
      <dl className="fig mt-1.5 space-y-0.5 border-t border-rule pt-1.5">
        {AGEING_BUCKETS.map((bucket) => (
          <div key={bucket.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: BUCKET_FILL[bucket.key] }}
            />
            <dd className="m-0 min-w-[64px] text-ink">
              {usdFull(row[bucket.key])}
            </dd>
            <dt
              className="text-muted"
              style={{ fontVariantNumeric: "normal" }}
            >
              {bucket.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Ordered scale legend, since the buckets are a ramp rather than categories. */
export function AgeingLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-0 text-[11px] text-muted">
      {AGEING_BUCKETS.map((bucket) => (
        <li key={bucket.key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-sm border border-rule"
            style={{ background: BUCKET_FILL[bucket.key] }}
          />
          {bucket.label}
        </li>
      ))}
    </ul>
  );
}
