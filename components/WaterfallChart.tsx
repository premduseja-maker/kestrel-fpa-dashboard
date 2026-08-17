"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BridgeBar } from "@/lib/metrics/core";
import { usd, usdFull } from "@/lib/format";
import { niceTicks } from "@/lib/ticks";
import { usePrefersReducedMotion } from "./hooks";

export const WATERFALL_HEIGHT = 320;

/**
 * A waterfall: two anchoring totals with signed contributions between them.
 * Shared by the EBITDA bridge on the summary and the gross profit bridge on the
 * margin screen.
 *
 * Recharts stacks from a single baseline, so each bar is drawn as a transparent
 * spacer plus a visible span. The frame is shifted up by `floor` to keep both
 * parts non-negative — a stack containing a negative spacer renders on the wrong
 * side of zero — and the axis formatter shifts labels back, so the reader sees
 * true values. Ticks are computed in real value space for the same reason:
 * letting Recharts choose them on the shifted frame produces labels like "($9)"
 * where zero belongs.
 */
export function WaterfallChart({
  bars,
  floor,
  ceiling,
  height = WATERFALL_HEIGHT,
  shortLabels = {},
  totalMeaning = "Level",
}: {
  bars: BridgeBar[];
  floor: number;
  ceiling: number;
  height?: number;
  shortLabels?: Record<string, string>;
  totalMeaning?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();

  const { rows, scale } = useMemo(() => {
    const real = niceTicks(floor, ceiling);
    return {
      scale: {
        lo: real.lo - floor,
        hi: real.hi - floor,
        ticks: real.ticks.map((tick) => tick - floor),
      },
      rows: bars.map((bar) => ({
        label: bar.label,
        short: shortLabels[bar.label] ?? bar.label,
        spacer: bar.from - floor,
        span: Math.max(bar.to - bar.from, 0),
        value: bar.value,
        kind: bar.kind,
        favourable: bar.favourable,
        totalMeaning,
      })),
    };
    // shortLabels is a literal at every call site; keying on its identity would
    // rebuild every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, floor, ceiling, totalMeaning]);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 26, right: 12, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="var(--rule)" vertical={false} />

          <XAxis
            dataKey="short"
            axisLine={{ stroke: "var(--rule)" }}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            interval={0}
          />
          <YAxis
            domain={[scale.lo, scale.hi]}
            ticks={scale.ticks}
            tickFormatter={(value: number) => usd(value + floor)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            width={58}
          />

          {/* True zero, once the frame shift is accounted for. */}
          {floor < 0 && (
            <ReferenceLine y={-floor} stroke="var(--muted)" strokeWidth={1} />
          )}

          <Tooltip
            content={<WaterfallTooltip />}
            cursor={{ fill: "var(--ink-wash)" }}
          />

          <Bar
            dataKey="spacer"
            stackId="waterfall"
            fill="transparent"
            isAnimationActive={false}
          />

          <Bar
            dataKey="span"
            stackId="waterfall"
            isAnimationActive={!reducedMotion}
            animationDuration={400}
            maxBarSize={54}
            radius={[3, 3, 0, 0]}
          >
            {rows.map((row) => (
              <Cell
                key={row.label}
                fill={
                  row.kind === "total"
                    ? "var(--mark-neutral)"
                    : row.favourable
                      ? "var(--favourable)"
                      : "var(--unfavourable)"
                }
              />
            ))}
            <LabelList
              dataKey="span"
              content={(props: unknown) => (
                <BarValueLabel {...(props as BarLabelProps)} rows={rows} />
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BarLabelProps {
  x?: number;
  y?: number;
  width?: number;
  index?: number;
}

/**
 * Value above each bar. Written by hand rather than through LabelList's
 * formatter because the label must show the bar's *signed* contribution, not the
 * span that was actually plotted.
 */
function BarValueLabel({
  x,
  y,
  width,
  index,
  rows,
}: BarLabelProps & { rows: { value: number }[] }) {
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    index === undefined
  ) {
    return null;
  }
  const row = rows[index];
  if (!row) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="var(--muted)"
      fontSize={10}
    >
      {usd(row.value)}
    </text>
  );
}

interface WaterfallTooltipPayload {
  payload?: {
    label?: string;
    value?: number;
    kind?: string;
    totalMeaning?: string;
  };
}

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: WaterfallTooltipPayload[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row || row.value === undefined) return null;

  return (
    <div
      className="border border-rule bg-surface px-2.5 py-2 text-[11px]"
      style={{ borderRadius: 5 }}
    >
      <p className="text-muted">{row.label}</p>
      <p className="fig mt-0.5 font-semibold text-ink">{usdFull(row.value)}</p>
      <p className="mt-0.5 text-muted">
        {row.kind === "total"
          ? (row.totalMeaning ?? "Level")
          : "Contribution to movement"}
      </p>
    </div>
  );
}
