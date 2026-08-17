"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { days, daysChange, daysShort, monthLong, monthShort } from "@/lib/format";
import type { CycleDrift, CyclePoint } from "@/lib/metrics/cash";
import { niceTicks } from "@/lib/ticks";
import { useIsNarrow, usePrefersReducedMotion } from "./hooks";

import { CYCLE_HEIGHT } from "./chart-heights";

/**
 * Cash conversion cycle with its three drivers beneath it.
 *
 * CCC = DIO + DSO - DPO, so the drivers are NOT a plain stack: stacking all
 * three would sum to DIO+DSO+DPO, a number that means nothing. Inventory and
 * receivable days stack upward and payable days extend downward from zero, so
 * the cycle is the *net* of the two bands — the upward extent less the downward
 * one — which is where the CCC line sits. Note it does not sit on the top edge
 * of the upward band: that edge is DIO+DSO, before payables fund any of it.
 * One axis, one unit: days throughout.
 */
export function CashCycleChart({
  series,
  drift,
}: {
  series: CyclePoint[];
  drift: CycleDrift | null;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const narrow = useIsNarrow();

  const scale = useMemo(() => {
    const highs = series.map((point) => point.dio + point.dso);
    const lows = series.map((point) => point.dpoNegative);
    return niceTicks(Math.min(0, ...lows), Math.max(0, ...highs), 7);
  }, [series]);

  if (series.length === 0) return <div style={{ height: CYCLE_HEIGHT }} />;

  return (
    <div style={{ height: CYCLE_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={series}
          margin={{ top: 30, right: 20, bottom: 8, left: 4 }}
          stackOffset="sign"
        >
          <CartesianGrid stroke="var(--rule)" vertical={false} />

          <XAxis
            dataKey="month"
            tickFormatter={monthShort}
            interval={narrow ? 5 : 2}
            axisLine={{ stroke: "var(--rule)" }}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            minTickGap={4}
          />
          <YAxis
            domain={[scale.lo, scale.hi]}
            ticks={scale.ticks}
            tickFormatter={daysShort}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            width={46}
          />

          <Tooltip content={<CycleTooltip />} cursor={{ stroke: "var(--rule)" }} />

          {/* Inventory and receivable days build the cycle. */}
          <Area
            dataKey="dio"
            stackId="cycle"
            stroke="none"
            fill="var(--signal)"
            fillOpacity={0.28}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />
          <Area
            dataKey="dso"
            stackId="cycle"
            stroke="none"
            fill="var(--unfavourable)"
            fillOpacity={0.24}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />
          {/* Payables fund it, so they extend below the rule. */}
          <Area
            dataKey="dpoNegative"
            stackId="cycle"
            stroke="none"
            fill="var(--favourable)"
            fillOpacity={0.3}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />

          <ReferenceLine y={0} stroke="var(--muted)" strokeWidth={1}>
            {drift && !narrow && (
              <Label
                value={`Cycle ${days(drift.first)} → ${days(
                  drift.last,
                )} · ${drift.leadDriver.toLowerCase()} the largest mover at ${daysChange(
                  drift.leadDriverDelta,
                )}`}
                position="insideTopLeft"
                offset={-26}
                fill="var(--signal)"
                fontSize={11}
                fontWeight={600}
              />
            )}
          </ReferenceLine>

          <Line
            dataKey="ccc"
            stroke="var(--ink)"
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 3.5,
              fill: "var(--ink)",
              stroke: "var(--surface)",
              strokeWidth: 2,
            }}
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
  value?: number;
}

function CycleTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Entry[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const at = (key: string) => payload.find((e) => e.dataKey === key)?.value;

  const rows = [
    { name: "Inventory days", value: at("dio"), color: "var(--signal)" },
    { name: "Receivable days", value: at("dso"), color: "var(--unfavourable)" },
    {
      name: "Payable days",
      value: at("dpoNegative"),
      color: "var(--favourable)",
      negate: true,
    },
    { name: "Cash cycle", value: at("ccc"), color: "var(--ink)" },
  ];

  return (
    <div
      className="border border-rule bg-surface px-2.5 py-2 text-[11px]"
      style={{ borderRadius: 5 }}
    >
      <p className="text-muted">{label ? monthLong(label) : ""}</p>
      <dl className="mt-1 space-y-0.5">
        {rows.map((row) =>
          row.value === undefined ? null : (
            <div key={row.name} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-0.5 w-3 shrink-0"
                style={{ background: row.color }}
              />
              <dd className="fig m-0 font-semibold text-ink">
                {days(row.negate ? -row.value : row.value)}
              </dd>
              <dt className="text-muted">{row.name}</dt>
            </div>
          ),
        )}
      </dl>
    </div>
  );
}
