"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { monthShort, pct } from "@/lib/format";
import { linearFit, type ScatterPoint } from "@/lib/metrics/margin";
import { niceTicks } from "@/lib/ticks";
import { usePrefersReducedMotion } from "./hooks";

import { SCATTER_HEIGHT } from "./chart-heights";

/**
 * Discount against gross margin, one point per SKU per month, split by year.
 *
 * A scatter is an all-pairs form, so it uses only two colours: the two years are
 * the comparison, and FY2 carries the accent because it is the year in question.
 */
export function DiscountScatter({ points }: { points: ScatterPoint[] }) {
  const reducedMotion = usePrefersReducedMotion();

  const model = useMemo(() => {
    if (points.length === 0) return null;

    return {
      fy1: points.filter((point) => point.year === "FY1"),
      fy2: points.filter((point) => point.year === "FY2"),
      fit: linearFit(points),
      xScale: niceTicks(0, Math.max(...points.map((p) => p.discount)), 6),
      yScale: niceTicks(
        Math.min(...points.map((p) => p.margin)),
        Math.max(...points.map((p) => p.margin)),
        6,
      ),
    };
  }, [points]);

  if (!model) return <div style={{ height: SCATTER_HEIGHT }} />;

  const { fy1, fy2, fit, xScale, yScale } = model;

  return (
    <div style={{ height: SCATTER_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 16, bottom: 26, left: 4 }}>
          <CartesianGrid stroke="var(--rule)" />

          <XAxis
            type="number"
            dataKey="discount"
            domain={[xScale.lo, xScale.hi]}
            ticks={xScale.ticks}
            tickFormatter={(value: number) => pct(value)}
            axisLine={{ stroke: "var(--rule)" }}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
          >
            <Label
              value="Discount"
              position="insideBottom"
              offset={-16}
              fill="var(--muted)"
              fontSize={10}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="margin"
            domain={[yScale.lo, yScale.hi]}
            ticks={yScale.ticks}
            tickFormatter={(value: number) => pct(value)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            width={52}
          >
            <Label
              value="Gross margin"
              angle={-90}
              position="insideLeft"
              offset={14}
              fill="var(--muted)"
              fontSize={10}
              style={{ textAnchor: "middle" }}
            />
          </YAxis>
          <ZAxis range={[26, 26]} />

          <Tooltip content={<ScatterTooltip />} />

          {/* Fitted line, drawn as a segment across the observed range. */}
          {fit && (
            <ReferenceLine
              segment={[
                { x: fit.x1, y: fit.y1 },
                { x: fit.x2, y: fit.y2 },
              ]}
              stroke="var(--signal)"
              strokeWidth={2}
            />
          )}

          <Scatter
            name="FY1"
            data={fy1}
            fill="var(--muted)"
            fillOpacity={0.5}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />
          <Scatter
            name="FY2"
            data={fy2}
            fill="var(--unfavourable)"
            fillOpacity={0.75}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ScatterTooltipPayload {
  payload?: ScatterPoint;
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ScatterTooltipPayload[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div
      className="border border-rule bg-surface px-2.5 py-2 text-[11px]"
      style={{ borderRadius: 5 }}
    >
      <p className="text-muted">
        {point.sku} · {monthShort(point.month)} · {point.year}
      </p>
      <p className="fig mt-1 font-semibold text-ink">
        {pct(point.margin)} margin
      </p>
      <p className="fig text-muted">{pct(point.discount)} discount</p>
    </div>
  );
}
