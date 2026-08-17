"use client";

import { useMemo, useRef, useState } from "react";
import { moneyCompact, money, monthLabel, monthLabelLong } from "../lib/format";
import { niceScale } from "../lib/scale";
import type { ActualVsBudgetPoint } from "../lib/overview";
import { ChartTooltip } from "./ChartTooltip";

const W = 900;
const H = 320;
const PAD = { top: 18, right: 74, bottom: 34, left: 60 };

const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/**
 * Actual vs budget over time — two categorical series on ONE axis.
 *
 * The domain is fitted rather than zero-based: a line encodes position, and
 * pinning revenue that moves inside a 180k–260k band to a zero baseline would
 * flatten the trend into a straight line. Magnitude against target is carried by
 * the zero-based variance columns below it.
 */
export function TrendChart({
  data,
  valueLabel,
}: {
  data: ActualVsBudgetPoint[];
  valueLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const scale = useMemo(() => {
    const values = data.flatMap((d) => [d.actual, d.budget]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.05 || Math.abs(max) * 0.05 || 1;
    return niceScale(min - pad, max + pad);
  }, [data]);

  const n = data.length;
  const x = (i: number) =>
    PAD.left + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const y = (v: number) =>
    PAD.top + PLOT_H - ((v - scale.lo) / (scale.hi - scale.lo)) * PLOT_H;

  const linePath = (pick: (d: ActualVsBudgetPoint) => number) =>
    data
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(pick(d)).toFixed(2)}`,
      )
      .join(" ");

  // Thin the x labels so they never collide; keep the last month labelled.
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  const last = data[n - 1];

  function indexFromPointer(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || n === 0) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    const vbX = ((clientX - rect.left) / rect.width) * W;
    const ratio = (vbX - PAD.left) / PLOT_W;
    return Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
  }

  function onKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
    if (n === 0) return;
    const current = active ?? n - 1;
    let next: number | null = null;

    if (event.key === "ArrowLeft") next = Math.max(0, current - 1);
    else if (event.key === "ArrowRight") next = Math.min(n - 1, current + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = n - 1;
    else if (event.key === "Escape") {
      setActive(null);
      return;
    } else return;

    event.preventDefault();
    setActive(next);
  }

  const point = active === null ? null : data[active];

  return (
    <figure className="relative m-0">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-none"
        role="img"
        tabIndex={0}
        aria-label={`${valueLabel}: actual versus budget, ${monthLabelLong(
          data[0]?.month ?? "",
        )} to ${monthLabelLong(last?.month ?? "")}. Use arrow keys to read each month.`}
        onPointerMove={(e) => setActive(indexFromPointer(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        {/* Horizontal grid — solid hairlines, one step off the surface. */}
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--grid)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD.left - 10}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="tnum"
              fill="var(--ink-muted)"
              fontSize={11}
            >
              {moneyCompact(tick)}
            </text>
          </g>
        ))}

        {/* Baseline */}
        <line
          x1={PAD.left}
          x2={PAD.left + PLOT_W}
          y1={PAD.top + PLOT_H}
          y2={PAD.top + PLOT_H}
          stroke="var(--axis)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {data.map((d, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text
              key={d.month}
              x={x(i)}
              y={PAD.top + PLOT_H + 20}
              textAnchor="middle"
              className="tnum"
              fill="var(--ink-muted)"
              fontSize={11}
            >
              {monthLabel(d.month)}
            </text>
          ) : null,
        )}

        {/* Crosshair finds the X so the reader aims at a month, not at a 2px line. */}
        {active !== null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="var(--axis)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Budget sits under actual: actual is the series the reader came for. */}
        <path
          d={linePath((d) => d.budget)}
          fill="none"
          stroke="var(--series-2)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={linePath((d) => d.actual)}
          fill="none"
          stroke="var(--series-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* End marker + a single direct label: the last actual. Labelling both
            series here would collide wherever the lines converge. */}
        {last && (
          <>
            <circle
              cx={x(n - 1)}
              cy={y(last.actual)}
              r={4}
              fill="var(--series-1)"
              stroke="var(--surface-1)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={x(n - 1) + 10}
              y={y(last.actual)}
              dominantBaseline="middle"
              className="tnum"
              fill="var(--ink-primary)"
              fontSize={12}
              fontWeight={600}
            >
              {moneyCompact(last.actual)}
            </text>
          </>
        )}

        {active !== null && point && (
          <>
            <circle
              cx={x(active)}
              cy={y(point.budget)}
              r={4}
              fill="var(--series-2)"
              stroke="var(--surface-1)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x(active)}
              cy={y(point.actual)}
              r={4}
              fill="var(--series-1)"
              stroke="var(--surface-1)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {active !== null && point && (
        <ChartTooltip
          leftPct={(x(active) / W) * 100}
          month={point.month}
          rows={[
            { label: "Actual", value: money(point.actual), color: "var(--series-1)" },
            { label: "Budget", value: money(point.budget), color: "var(--series-2)" },
          ]}
          footer={`Variance ${point.variance >= 0 ? "+" : "-"}${money(
            Math.abs(point.variance),
          )}`}
        />
      )}
    </figure>
  );
}
