"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usd, usdFull } from "@/lib/format";
import type { CashAssumptions, ForecastWeek } from "@/lib/metrics/cash";
import { niceTicks } from "@/lib/ticks";
import { useIsNarrow, usePrefersReducedMotion } from "./hooks";

import { FORECAST_HEIGHT } from "./chart-heights";

/**
 * Closing cash over the next thirteen weeks on the stated assumptions.
 *
 * Zero-based where the data allows, and the zero rule is drawn whenever the
 * projection approaches it — on a cash forecast, the distance to zero is the
 * whole question.
 */
export function CashForecastChart({
  weeks,
  assumptions,
}: {
  weeks: ForecastWeek[];
  assumptions: CashAssumptions;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const narrow = useIsNarrow();

  if (weeks.length === 0) return <div style={{ height: FORECAST_HEIGHT }} />;

  const values = [assumptions.openingCash, ...weeks.map((w) => w.closingCash)];
  const scale = niceTicks(Math.min(0, ...values), Math.max(0, ...values), 6);

  const rows = [
    {
      week: 0,
      label: "Now",
      closingCash: assumptions.openingCash,
      netChange: 0,
      collections: 0,
      supplierPayments: 0,
      opex: 0,
      capex: 0,
    },
    ...weeks,
  ];

  return (
    <div style={{ height: FORECAST_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 16, right: 20, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="var(--rule)" vertical={false} />

          <XAxis
            dataKey="label"
            axisLine={{ stroke: "var(--rule)" }}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            interval={narrow ? 2 : 0}
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

          <Tooltip content={<ForecastTooltip />} cursor={{ stroke: "var(--rule)" }} />

          {scale.lo <= 0 && (
            <ReferenceLine y={0} stroke="var(--unfavourable)" strokeWidth={1} />
          )}

          <Area
            dataKey="closingCash"
            stroke="var(--signal)"
            strokeWidth={2}
            fill="var(--signal)"
            fillOpacity={0.1}
            dot={false}
            activeDot={{
              r: 3.5,
              fill: "var(--signal)",
              stroke: "var(--surface)",
              strokeWidth: 2,
            }}
            isAnimationActive={!reducedMotion}
            animationDuration={400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ForecastTooltipPayload {
  payload?: ForecastWeek & { label: string };
}

function ForecastTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ForecastTooltipPayload[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div
      className="border border-rule bg-surface px-2.5 py-2 text-[11px]"
      style={{ borderRadius: 5 }}
    >
      <p className="text-muted">
        {row.week === 0 ? "Today" : `Week ${row.week}`}
      </p>
      <p className="fig mt-1 font-semibold text-ink">
        {usdFull(row.closingCash)}
      </p>
      <p className="text-muted">closing cash</p>
      {row.week > 0 && (
        <dl className="fig mt-1.5 space-y-0.5 border-t border-rule pt-1.5 text-muted">
          <div className="flex justify-between gap-3">
            <dt>Collections</dt>
            <dd className="m-0">{usdFull(row.collections)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Suppliers</dt>
            <dd className="m-0">{usdFull(-row.supplierPayments)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Opex</dt>
            <dd className="m-0">{usdFull(-row.opex)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Capex</dt>
            <dd className="m-0">{usdFull(-row.capex)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-rule pt-0.5 text-ink">
            <dt>Net</dt>
            <dd className="m-0 font-semibold">{usdFull(row.netChange)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
