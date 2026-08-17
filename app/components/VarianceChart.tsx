"use client";

import { useMemo, useRef, useState } from "react";
import { money, moneyCompact, monthLabel, monthLabelLong } from "../lib/format";
import { barPath, niceScale } from "../lib/scale";
import type { ActualVsBudgetPoint } from "../lib/overview";
import { ChartTooltip } from "./ChartTooltip";

const W = 900;
const H = 300;
const PAD = { top: 18, right: 20, bottom: 34, left: 60 };

const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const MAX_BAR = 24;
const BAND_GAP = 8;

/**
 * Variance to target as diverging columns: warm/cool poles either side of a
 * neutral zero rule. Columns are zero-based — unlike the trend line above, these
 * encode magnitude by length, so the baseline is not negotiable.
 */
export function VarianceChart({
  data,
  favourableLabel = "Favourable",
  unfavourableLabel = "Unfavourable",
}: {
  data: ActualVsBudgetPoint[];
  favourableLabel?: string;
  unfavourableLabel?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const scale = useMemo(() => {
    const values = data.map((d) => d.variance);
    // Always include zero: the baseline is the whole point of the form.
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const pad = (max - min) * 0.05 || 1;
    // Pad outward from zero only on the side that actually has bars — otherwise
    // an all-negative month set reserves headroom above zero for nothing.
    return niceScale(min < 0 ? min - pad : 0, max > 0 ? max + pad : 0);
  }, [data]);

  const n = data.length;
  const band = n === 0 ? PLOT_W : PLOT_W / n;
  const barWidth = Math.max(4, Math.min(MAX_BAR, band - BAND_GAP));

  const bandCentre = (i: number) => PAD.left + band * (i + 0.5);
  const y = (v: number) =>
    PAD.top + PLOT_H - ((v - scale.lo) / (scale.hi - scale.lo)) * PLOT_H;

  const zeroY = y(0);
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  function indexFromPointer(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg || n === 0) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    const vbX = ((clientX - rect.left) / rect.width) * W;
    const i = Math.floor((vbX - PAD.left) / band);
    if (i < 0 || i > n - 1) return null;
    return i;
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
        aria-label={`Variance to budget by month, ${monthLabelLong(
          data[0]?.month ?? "",
        )} to ${monthLabelLong(
          data[n - 1]?.month ?? "",
        )}. Use arrow keys to read each month.`}
        onPointerMove={(e) => setActive(indexFromPointer(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
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

        {data.map((d, i) => {
          const favourable = d.variance >= 0;
          const dimmed = active !== null && active !== i;
          return (
            <path
              key={d.month}
              d={barPath(
                bandCentre(i) - barWidth / 2,
                barWidth,
                zeroY,
                y(d.variance),
              )}
              fill={favourable ? "var(--pos)" : "var(--neg)"}
              opacity={dimmed ? 0.4 : 1}
            />
          );
        })}

        {/* The neutral midpoint of the diverging scale. */}
        <line
          x1={PAD.left}
          x2={PAD.left + PLOT_W}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--axis)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {data.map((d, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text
              key={d.month}
              x={bandCentre(i)}
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
      </svg>

      {active !== null && point && (
        <ChartTooltip
          leftPct={(bandCentre(active) / W) * 100}
          month={point.month}
          rows={[
            {
              label: point.variance >= 0 ? favourableLabel : unfavourableLabel,
              value: `${point.variance >= 0 ? "+" : "-"}${money(
                Math.abs(point.variance),
              )}`,
              color: point.variance >= 0 ? "var(--pos)" : "var(--neg)",
            },
          ]}
          footer={`Actual ${money(point.actual)} · Budget ${money(point.budget)}`}
        />
      )}
    </figure>
  );
}
