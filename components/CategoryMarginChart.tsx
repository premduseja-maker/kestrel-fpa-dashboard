"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORIES, type Category } from "@/lib/data";
import { monthLong, monthShort, pct, ptsMagnitude } from "@/lib/format";
import {
  widestSpread,
  type CategoryMarginPoint,
} from "@/lib/metrics/margin";
import { niceTicks } from "@/lib/ticks";
import { usePrefersReducedMotion } from "./hooks";

export const CATEGORY_MARGIN_HEIGHT = 340;

/**
 * Three category margins plus the group average as a dashed line.
 *
 * The group line is the point of the chart: it sits between a falling apparel
 * line and a rising hardgoods line, so it moves far less than either and hides
 * both. Categories keep a fixed colour per entity, so filtering or reordering
 * never repaints them.
 */
const SERIES: { key: Category; color: string }[] = [
  { key: "Apparel", color: "var(--unfavourable)" },
  { key: "Hardgoods", color: "var(--favourable)" },
  { key: "Accessories", color: "var(--muted)" },
];

export function CategoryMarginChart({
  series,
  /**
   * The group margin movement to quote in the annotation, supplied by the page
   * so it is the same revenue-weighted FY1->FY2 figure the interpretation block
   * states. Computing it here from the endpoints instead gave 4.1pts against the
   * prose's 2.3pts — two defensible measures wearing identical words, which
   * reads as a bug.
   */
  groupDelta,
}: {
  series: CategoryMarginPoint[];
  groupDelta: number | null;
}) {
  const reducedMotion = usePrefersReducedMotion();

  const model = useMemo(() => {
    if (series.length === 0) return null;

    const values = series.flatMap((point) => [
      point.group,
      ...CATEGORIES.map((category) => point[category]),
    ]);

    return {
      scale: niceTicks(Math.min(...values), Math.max(...values), 6),
      spread: widestSpread(series),
      last: series[series.length - 1],
    };
  }, [series]);

  if (!model) return <div style={{ height: CATEGORY_MARGIN_HEIGHT }} />;

  const { scale, spread, last } = model;

  return (
    <div style={{ height: CATEGORY_MARGIN_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={series}
          margin={{ top: 30, right: 96, bottom: 8, left: 4 }}
        >
          <CartesianGrid stroke="var(--rule)" vertical={false} />

          {/* The widening gap, shaded where it is widest. */}
          {spread && (
            <ReferenceArea
              x1={spread.month}
              x2={last.month}
              fill="var(--signal)"
              fillOpacity={0.06}
              stroke="none"
            />
          )}

          {/* The annotation rides a full-width invisible band anchored top-left.
              Hanging it off the shaded band centred it over a narrow span at the
              right edge, where the text ran off the plot. */}
          {spread && (
            <ReferenceArea
              x1={series[0].month}
              x2={last.month}
              fill="none"
              stroke="none"
            >
              <Label
                value={
                  `Widest gap ${ptsMagnitude(spread.spread)}: ${spread.high} over ${spread.low}` +
                  (groupDelta === null
                    ? ""
                    : ` — the group line moved just ${ptsMagnitude(groupDelta)}`)
                }
                position="insideTopLeft"
                offset={-22}
                fill="var(--signal)"
                fontSize={11}
                fontWeight={600}
              />
            </ReferenceArea>
          )}

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
            tickFormatter={(value: number) => pct(value)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            width={52}
          />

          <Tooltip content={<CategoryTooltip />} cursor={{ stroke: "var(--rule)" }} />

          {/* Group average, dashed — the only dashed line in the app, and it
              earns it: this line is an average, not an observation. */}
          <Line
            type="monotone"
            dataKey="group"
            stroke="var(--ink)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 3.5, fill: "var(--ink)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />

          {SERIES.map((entry) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              stroke={entry.color}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 3.5,
                fill: entry.color,
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
              isAnimationActive={!reducedMotion}
              animationDuration={400}
            />
          ))}

          {/* Direct end labels instead of a legend. */}
          {SERIES.map((entry) => (
            <ReferenceDot
              key={`label-${entry.key}`}
              x={last.month}
              y={last[entry.key]}
              r={3}
              fill={entry.color}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              <Label
                value={entry.key}
                position="right"
                offset={8}
                fill={entry.color === "var(--muted)" ? "var(--muted)" : "var(--ink)"}
                fontSize={11}
                fontWeight={600}
              />
            </ReferenceDot>
          ))}
          <ReferenceDot
            x={last.month}
            y={last.group}
            r={3}
            fill="var(--ink)"
            stroke="var(--surface)"
            strokeWidth={2}
          >
            <Label
              value="Group"
              position="right"
              offset={8}
              fill="var(--ink)"
              fontSize={11}
              fontWeight={600}
            />
          </ReferenceDot>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipEntry {
  dataKey?: string | number;
  value?: number;
}

function CategoryTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const valueOf = (key: string) =>
    payload.find((entry) => entry.dataKey === key)?.value;

  const rows: { name: string; value: number | undefined; color: string }[] = [
    ...SERIES.map((entry) => ({
      name: entry.key,
      value: valueOf(entry.key),
      color: entry.color,
    })),
    { name: "Group", value: valueOf("group"), color: "var(--ink)" },
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
              <dd className="fig m-0 font-semibold text-ink">{pct(row.value)}</dd>
              <dt className="text-muted">{row.name}</dt>
            </div>
          ),
        )}
      </dl>
    </div>
  );
}
