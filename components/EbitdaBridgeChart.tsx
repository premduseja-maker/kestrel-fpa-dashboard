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
import type { EbitdaBridge } from "@/lib/metrics/core";
import { usd, usdFull } from "@/lib/format";
import { niceTicks } from "@/lib/ticks";
import { usePrefersReducedMotion } from "./hooks";

export const BRIDGE_HEIGHT = 320;

/** Axis labels are shortened; the tooltip carries the full wording. */
const SHORT_LABEL: Record<string, string> = {
  "Budget EBITDA": "Budget",
  "Actual EBITDA": "Actual",
};

/**
 * Budget EBITDA -> Actual EBITDA as a waterfall.
 *
 * Recharts stacks from a single baseline, so each bar is drawn as a transparent
 * spacer plus a visible span. The whole frame is shifted up by `floor` to keep
 * both parts non-negative — a stack containing a negative spacer renders on the
 * wrong side of zero — and the y-axis formatter shifts the labels back, so the
 * reader sees true values throughout.
 */
export function EbitdaBridgeChart({ bridge }: { bridge: EbitdaBridge }) {
  const reducedMotion = usePrefersReducedMotion();

  const { rows, scale, floor } = useMemo(() => {
    const floorValue = bridge.floor;
    // Round ticks are computed in real value space, then shifted into the
    // chart's frame — otherwise the shift lands them on values like "($9)".
    const real = niceTicks(bridge.floor, bridge.ceiling);
    return {
      floor: floorValue,
      scale: {
        lo: real.lo - floorValue,
        hi: real.hi - floorValue,
        ticks: real.ticks.map((tick) => tick - floorValue),
      },
      rows: bridge.bars.map((bar) => ({
        label: bar.label,
        short: SHORT_LABEL[bar.label] ?? bar.label,
        spacer: bar.from - floorValue,
        span: Math.max(bar.to - bar.from, 0),
        value: bar.value,
        kind: bar.kind,
        favourable: bar.favourable,
      })),
    };
  }, [bridge]);

  return (
    <div style={{ height: BRIDGE_HEIGHT }}>
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

          <Tooltip content={<BridgeTooltip />} cursor={{ fill: "var(--ink-wash)" }} />

          <Bar dataKey="spacer" stackId="bridge" fill="transparent" isAnimationActive={false} />

          <Bar
            dataKey="span"
            stackId="bridge"
            isAnimationActive={!reducedMotion}
            animationDuration={400}
            maxBarSize={54}
          >
            {rows.map((row) => (
              <Cell
                key={row.label}
                fill={
                  row.kind === "total"
                    ? "var(--ink)"
                    : row.favourable
                      ? "var(--favourable)"
                      : "var(--unfavourable)"
                }
              />
            ))}
            <LabelList
              dataKey="span"
              content={(props: unknown) => (
                <BarValueLabel
                  {...(props as BarLabelProps)}
                  rows={rows}
                />
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
 * Value sits above each bar. Written by hand rather than through LabelList's
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
  if (x === undefined || y === undefined || width === undefined || index === undefined) {
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

interface BridgeTooltipPayload {
  payload?: {
    label?: string;
    value?: number;
    kind?: string;
  };
}

function BridgeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: BridgeTooltipPayload[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row || row.value === undefined) return null;

  return (
    <div
      className="border border-rule bg-surface px-2.5 py-2 text-[11px]"
      style={{ borderRadius: 2 }}
    >
      <p className="text-muted">{row.label}</p>
      <p className="fig mt-0.5 font-semibold text-ink">{usdFull(row.value)}</p>
      <p className="mt-0.5 text-muted">
        {row.kind === "total" ? "EBITDA level" : "Contribution to variance"}
      </p>
    </div>
  );
}
