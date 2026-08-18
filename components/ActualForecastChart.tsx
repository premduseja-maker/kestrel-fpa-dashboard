"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthLong, monthShort, usd, usdFull } from "@/lib/format";
import { niceTicks } from "@/lib/ticks";
import { useIsNarrow, usePrefersReducedMotion } from "./hooks";

import { ACTUAL_FORECAST_HEIGHT } from "./chart-heights";

export interface JoinedPoint {
  month: string;
  actual: number | null;
  forecast: number | null;
}

/**
 * Actual months then forecast months on one continuous axis.
 *
 * The forecast is a separate series with its own dashed stroke rather than a
 * continuation of the same line, so a reader can never mistake projection for
 * record. The two share the boundary month, which is what keeps the line
 * unbroken across the join.
 */
export function ActualForecastChart({
  points,
  boundaryMonth,
  height = ACTUAL_FORECAST_HEIGHT,
  showZero = false,
}: {
  points: JoinedPoint[];
  boundaryMonth: string;
  height?: number;
  showZero?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const narrow = useIsNarrow();

  if (points.length === 0) return <div style={{ height }} />;

  const values = points.flatMap((point) =>
    [point.actual, point.forecast].filter(
      (value): value is number => value !== null,
    ),
  );
  const scale = niceTicks(
    Math.min(showZero ? 0 : Math.min(...values), ...values),
    Math.max(0, ...values),
    6,
  );

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={points}
          margin={{ top: 22, right: 20, bottom: 8, left: 4 }}
        >
          <CartesianGrid stroke="var(--rule)" vertical={false} />

          <XAxis
            dataKey="month"
            tickFormatter={monthShort}
            interval={narrow ? 7 : 3}
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

          <Tooltip content={<JoinTooltip />} cursor={{ stroke: "var(--rule)" }} />

          {scale.lo < 0 && (
            <ReferenceLine y={0} stroke="var(--unfavourable)" strokeWidth={1} />
          )}

          <ReferenceLine
            x={boundaryMonth}
            stroke="var(--muted)"
            strokeWidth={1}
          >
            <Label
              value="Forecast →"
              position="insideTopRight"
              offset={-18}
              fill="var(--muted)"
              fontSize={10}
            />
          </ReferenceLine>

          <Area
            dataKey="actual"
            stroke="var(--ink)"
            strokeWidth={2}
            fill="var(--ink)"
            fillOpacity={0.05}
            dot={false}
            connectNulls={false}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />
          <Area
            dataKey="forecast"
            stroke="var(--signal)"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="var(--signal)"
            fillOpacity={0.1}
            dot={false}
            connectNulls={false}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface Entry {
  dataKey?: string | number;
  value?: number | null;
}

function JoinTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Entry[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const actual = payload.find((e) => e.dataKey === "actual")?.value;
  const forecast = payload.find((e) => e.dataKey === "forecast")?.value;
  const isForecast = actual === null || actual === undefined;
  const value = isForecast ? forecast : actual;
  if (value === null || value === undefined) return null;

  return (
    <div
      className="border border-rule bg-surface px-2.5 py-2 text-[11px]"
      style={{ borderRadius: 5 }}
    >
      <p className="text-muted">{label ? monthLong(label) : ""}</p>
      <p className="fig mt-0.5 font-semibold text-ink">{usdFull(value)}</p>
      <p className="text-muted">{isForecast ? "forecast" : "actual"}</p>
    </div>
  );
}
