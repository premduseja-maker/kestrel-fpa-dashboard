"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PLMonth } from "@/lib/data";
import { monthLong, monthShort, pctChange, usd, usdFull } from "@/lib/format";
import { relativeChange, shiftMonth, ttm } from "@/lib/metrics/core";
import { niceTicks } from "@/lib/ticks";
import { useIsNarrow, usePrefersReducedMotion } from "./hooks";

import { REVENUE_EBITDA_HEIGHT } from "./chart-heights";

const AXIS = {
  stroke: "var(--rule)",
  tick: { fill: "var(--muted)", fontSize: 10 },
};

/**
 * The chart that carries the whole story: revenue climbing while EBITDA
 * collapses.
 *
 * Two measures three orders of magnitude apart share this plot, so it runs two
 * y-scales as the brief specifies. Note that where the two lines cross is a
 * function of how the scales are aligned, not a fact about the business — so the
 * annotation states the two movements in percentage terms, which is scale-free,
 * rather than inviting the reader to draw meaning from the intersection itself.
 *
 * Series are labelled directly at their right-hand ends; there is no legend.
 */
export function RevenueEbitdaChart({ pl }: { pl: PLMonth[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const narrow = useIsNarrow();

  const model = useMemo(() => {
    if (pl.length === 0) return null;

    const rows = pl.map((row) => ({
      month: row.month,
      net_revenue: row.net_revenue,
      ebitda: row.ebitda,
    }));

    const last = rows[rows.length - 1];

    /**
     * The divergence is a trailing-twelve-month story, not a month-to-month one.
     * Anchoring it on the peak EBITDA month reads "revenue -11.5%", because that
     * month happened to be a revenue spike — true of those two points, and
     * exactly the wrong conclusion about the business. TTM against the prior TTM
     * is the comparison the narrative actually rests on.
     */
    const priorAnchor = shiftMonth(last.month, -12);
    const revenueNow = ttm(pl, last.month, (row) => row.net_revenue);
    const revenueThen = ttm(pl, priorAnchor, (row) => row.net_revenue);
    const ebitdaNow = ttm(pl, last.month, (row) => row.ebitda);
    const ebitdaThen = ttm(pl, priorAnchor, (row) => row.ebitda);

    const revenueMove =
      revenueNow !== null && revenueThen !== null
        ? relativeChange(revenueNow, revenueThen)
        : null;
    const ebitdaMove =
      ebitdaNow !== null && ebitdaThen !== null
        ? relativeChange(ebitdaNow, ebitdaThen)
        : null;

    const comparable = revenueMove !== null && ebitdaMove !== null;

    /**
     * The phone variant. Two y-scales need two axis gutters, and at 390px those
     * gutters plus the direct labels leave under half the width for the plot —
     * but the deeper problem is that a dual axis only works when the reader can
     * see which line belongs to which side, and on a phone they cannot.
     *
     * Rebasing both series to 100 at the first month puts them on one scale
     * honestly: the lines start together and the gap between them *is* the
     * divergence, with no alignment chosen by the chart. Zero base months are
     * left null rather than dividing by zero.
     */
    const base = rows[0];
    const indexed = rows.map((row) => ({
      month: row.month,
      // The dollars ride along so the tooltip can still answer "how much?"
      net_revenue: row.net_revenue,
      ebitda: row.ebitda,
      revenueIndex:
        base.net_revenue === 0 ? null : (row.net_revenue / base.net_revenue) * 100,
      ebitdaIndex:
        base.ebitda === 0 ? null : (row.ebitda / base.ebitda) * 100,
    }));
    const indexValues = indexed
      .flatMap((row) => [row.revenueIndex, row.ebitdaIndex])
      .filter((value): value is number => value !== null);

    return {
      rows,
      last,
      indexed,
      indexScale: niceTicks(
        Math.min(0, ...indexValues),
        Math.max(...indexValues),
        4,
      ),
      lastIndexed: indexed[indexed.length - 1],
      regionStart: rows[Math.max(0, rows.length - 12)].month,
      // Revenue is a magnitude, so its axis holds zero; EBITDA goes negative and
      // fits its own range. Both get round ticks rather than Recharts' defaults.
      revenueScale: niceTicks(0, Math.max(...rows.map((r) => r.net_revenue))),
      ebitdaScale: niceTicks(
        Math.min(0, ...rows.map((r) => r.ebitda)),
        Math.max(0, ...rows.map((r) => r.ebitda)),
      ),
      annotation: comparable
        ? `Last 12 months vs prior 12 — revenue ${pctChange(
            revenueMove,
          )}, EBITDA ${pctChange(ebitdaMove)}`
        : null,
    };
  }, [pl]);

  if (!model) return <div style={{ height: REVENUE_EBITDA_HEIGHT }} />;

  const {
    rows,
    last,
    regionStart,
    annotation,
    revenueScale,
    ebitdaScale,
    indexed,
    indexScale,
    lastIndexed,
  } = model;

  if (narrow) {
    return (
      <div>
        <div style={{ height: REVENUE_EBITDA_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={indexed}
              margin={{ top: 12, right: 54, bottom: 8, left: 0 }}
            >
              <CartesianGrid stroke="var(--rule)" vertical={false} />

              <XAxis
                dataKey="month"
                tickFormatter={monthShort}
                interval={5}
                axisLine={AXIS}
                tickLine={false}
                tick={AXIS.tick}
                minTickGap={4}
              />
              <YAxis
                domain={[indexScale.lo, indexScale.hi]}
                ticks={indexScale.ticks}
                axisLine={false}
                tickLine={false}
                tick={AXIS.tick}
                width={34}
              />

              {/* The common base. Both series start here by construction. */}
              <ReferenceLine y={100} stroke="var(--muted)" strokeWidth={1} />

              <Tooltip
                content={<IndexedTooltip />}
                cursor={{ stroke: "var(--rule)" }}
              />

              <Line
                type="monotone"
                dataKey="revenueIndex"
                stroke="var(--ink)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3.5, fill: "var(--ink)", stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={!reducedMotion}
                animationDuration={400}
              />
              <Line
                type="monotone"
                dataKey="ebitdaIndex"
                stroke="var(--signal)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3.5, fill: "var(--signal)", stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={!reducedMotion}
                animationDuration={400}
              />

              {/* Direct labels, no legend — as on the desktop variant. */}
              {lastIndexed.revenueIndex !== null && (
                <ReferenceDot
                  x={lastIndexed.month}
                  y={lastIndexed.revenueIndex}
                  r={3}
                  fill="var(--ink)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                >
                  <Label
                    value="Revenue"
                    position="right"
                    offset={7}
                    fill="var(--ink)"
                    fontSize={11}
                    fontWeight={600}
                  />
                </ReferenceDot>
              )}
              {lastIndexed.ebitdaIndex !== null && (
                <ReferenceDot
                  x={lastIndexed.month}
                  y={lastIndexed.ebitdaIndex}
                  r={3}
                  fill="var(--signal)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                >
                  <Label
                    value="EBITDA"
                    position="right"
                    offset={7}
                    fill="var(--signal)"
                    fontSize={11}
                    fontWeight={600}
                  />
                </ReferenceDot>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-2 text-[11px] leading-snug text-muted">
          Both series rebased to 100 at {monthLong(rows[0].month)}, so one scale
          carries both.{annotation ? ` ${annotation}.` : ""}
        </p>
      </div>
    );
  }

  return (
    <div style={{ height: REVENUE_EBITDA_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 28, right: 78, bottom: 8, left: 4 }}
        >
          <CartesianGrid stroke="var(--rule)" vertical={false} />

          {/* The divergence, shaded and named on the plot itself. */}
          {annotation && !narrow && (
            <ReferenceArea
              yAxisId="revenue"
              x1={regionStart}
              x2={last.month}
              fill="var(--signal)"
              fillOpacity={0.06}
              stroke="none"
            >
              <Label
                value={annotation}
                position="insideTop"
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
            interval={narrow ? 5 : 2}
            axisLine={AXIS}
            tickLine={false}
            tick={AXIS.tick}
            minTickGap={4}
          />

          <YAxis
            yAxisId="revenue"
            domain={[revenueScale.lo, revenueScale.hi]}
            ticks={revenueScale.ticks}
            tickFormatter={usd}
            axisLine={false}
            tickLine={false}
            tick={AXIS.tick}
            width={54}
          />
          <YAxis
            yAxisId="ebitda"
            orientation="right"
            domain={[ebitdaScale.lo, ebitdaScale.hi]}
            ticks={ebitdaScale.ticks}
            tickFormatter={usd}
            axisLine={false}
            tickLine={false}
            tick={AXIS.tick}
            width={58}
          />

          <Tooltip
            content={<RevenueEbitdaTooltip />}
            cursor={{ stroke: "var(--rule)" }}
          />

          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="net_revenue"
            stroke="var(--ink)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5, fill: "var(--ink)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />
          <Line
            yAxisId="ebitda"
            type="monotone"
            dataKey="ebitda"
            stroke="var(--signal)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5, fill: "var(--signal)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />

          {/* Direct end labels in place of a legend. */}
          <ReferenceDot
            yAxisId="revenue"
            x={last.month}
            y={last.net_revenue}
            r={3}
            fill="var(--ink)"
            stroke="var(--surface)"
            strokeWidth={2}
          >
            <Label
              value="Net revenue"
              position="right"
              offset={8}
              fill="var(--ink)"
              fontSize={11}
              fontWeight={600}
            />
          </ReferenceDot>
          <ReferenceDot
            yAxisId="ebitda"
            x={last.month}
            y={last.ebitda}
            r={3}
            fill="var(--signal)"
            stroke="var(--surface)"
            strokeWidth={2}
          >
            <Label
              value="EBITDA"
              position="right"
              offset={8}
              fill="var(--signal)"
              fontSize={11}
              fontWeight={600}
            />
          </ReferenceDot>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipPayloadEntry {
  dataKey?: string | number;
  value?: number;
}

/**
 * Phone tooltip. Shows the index — which is what the plot is drawn in — and the
 * dollars behind it, so rebasing never costs the reader the actual number.
 */
function IndexedTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: { payload?: Record<string, number | null> }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div
      className="border border-rule bg-surface px-2.5 py-2 text-[11px]"
      style={{ borderRadius: 2 }}
    >
      <p className="text-muted">{label ? monthLong(label) : ""}</p>
      <dl className="mt-1 space-y-0.5">
        <Row
          color="var(--ink)"
          value={`${indexText(row.revenueIndex)} · ${usdFull(row.net_revenue ?? 0)}`}
          name="Revenue"
        />
        <Row
          color="var(--signal)"
          value={`${indexText(row.ebitdaIndex)} · ${usdFull(row.ebitda ?? 0)}`}
          name="EBITDA"
        />
      </dl>
    </div>
  );
}

function indexText(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(0);
}

function RevenueEbitdaTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const revenue = payload.find((entry) => entry.dataKey === "net_revenue")?.value;
  const ebitda = payload.find((entry) => entry.dataKey === "ebitda")?.value;

  return (
    <div
      className="border border-rule bg-surface px-2.5 py-2 text-[11px]"
      style={{ borderRadius: 2 }}
    >
      <p className="text-muted">{label ? monthLong(label) : ""}</p>
      <dl className="mt-1 space-y-0.5">
        {revenue !== undefined && (
          <Row color="var(--ink)" value={usdFull(revenue)} name="Net revenue" />
        )}
        {ebitda !== undefined && (
          <Row color="var(--signal)" value={usdFull(ebitda)} name="EBITDA" />
        )}
      </dl>
    </div>
  );
}

function Row({
  color,
  value,
  name,
}: {
  color: string;
  value: string;
  name: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-0.5 w-3 shrink-0"
        style={{ background: color }}
      />
      <dd className="fig m-0 font-semibold text-ink">{value}</dd>
      <dt className="text-muted">{name}</dt>
    </div>
  );
}
