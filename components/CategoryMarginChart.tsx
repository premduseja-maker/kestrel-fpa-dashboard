"use client";

import { useMemo, useState } from "react";
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
import { useIsNarrow, usePrefersReducedMotion } from "./hooks";

import { CATEGORY_MARGIN_HEIGHT } from "./chart-heights";

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
  const narrow = useIsNarrow();
  const [monthWindow, setMonthWindow] = useState<12 | 24>(12);

  /**
   * Twenty-four monthly points across 390px is roughly 13px per month, which
   * turns four lines into a single textured band. The last twelve months is the
   * readable default on a phone — and it is also the comparison the narrative
   * rests on — with the full history one tap away for anyone who wants it.
   */
  const shown = narrow && monthWindow === 12 ? series.slice(-12) : series;

  const model = useMemo(() => {
    if (shown.length === 0) return null;

    const values = shown.flatMap((point) => [
      point.group,
      ...CATEGORIES.map((category) => point[category]),
    ]);

    return {
      scale: niceTicks(Math.min(...values), Math.max(...values), 6),
      spread: widestSpread(shown),
      last: shown[shown.length - 1],
    };
  }, [shown]);

  if (!model) return <div style={{ height: CATEGORY_MARGIN_HEIGHT }} />;

  const { scale, spread, last } = model;

  return (
    <>
      {narrow && (
        <div className="flex justify-end pb-2">
          <div
            className="flex overflow-hidden border border-rule"
            role="group"
            aria-label="Months shown"
            style={{ borderRadius: 5 }}
          >
            {([12, 24] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMonthWindow(option)}
                aria-pressed={monthWindow === option}
                className={`min-h-[44px] px-3 text-[11px] transition-colors ${
                  monthWindow === option
                    ? "bg-ink-wash font-semibold text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                {option} months
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: CATEGORY_MARGIN_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={shown}
          margin={
            narrow
              ? { top: 12, right: 10, bottom: 8, left: 0 }
              : { top: 30, right: 96, bottom: 8, left: 4 }
          }
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
          {spread && !narrow && (
            <ReferenceArea
              x1={shown[0].month}
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
            // Twelve points fit a label every third month; twenty-four do not.
            interval={narrow ? (shown.length <= 12 ? 2 : 5) : 2}
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

          {/* Direct end labels instead of a legend — but only where there is
              room for them. At 390px "Accessories" needs 70px of gutter, which
              is a third of the plot, and Hardgoods and Accessories end close
              enough together that the two labels overlap anyway. The phone gets
              its identities from the legend below the chart instead, which also
              carries each line's closing value. */}
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
              {narrow ? null : (
                <Label
                  value={entry.key}
                  position="right"
                  offset={8}
                  fill={entry.color === "var(--muted)" ? "var(--muted)" : "var(--ink)"}
                  fontSize={11}
                  fontWeight={600}
                />
              )}
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
            {narrow ? null : (
              <Label
                value="Group"
                position="right"
                offset={8}
                fill="var(--ink)"
                fontSize={11}
                fontWeight={600}
              />
            )}
          </ReferenceDot>
        </LineChart>
      </ResponsiveContainer>
      </div>

      {narrow && (
        <ul className="mt-2 grid list-none grid-cols-2 gap-x-4 gap-y-1 p-0">
          {[
            ...SERIES.map((entry) => ({
              key: entry.key as string,
              color: entry.color,
              value: last[entry.key],
              dashed: false,
            })),
            {
              key: "Group",
              color: "var(--ink)",
              value: last.group,
              dashed: true,
            },
          ].map((entry) => (
            <li
              key={entry.key}
              className="flex items-baseline gap-2 text-[11px]"
            >
              <span
                aria-hidden="true"
                className="h-0.5 w-3.5 shrink-0 self-center"
                style={
                  entry.dashed
                    ? {
                        // Matches the dashed group line in the plot. A dashed
                        // border rather than a repeating gradient, because the
                        // brief rules gradients out.
                        borderTop: `2px dashed ${entry.color}`,
                        height: 0,
                      }
                    : { background: entry.color }
                }
              />
              <span className="text-muted">{entry.key}</span>
              <span className="fig ml-auto text-ink">{pct(entry.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
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
