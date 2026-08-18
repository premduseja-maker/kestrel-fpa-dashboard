"use client";

import { Card } from "./Card";
import { Sparkline } from "./Sparkline";
import type { Kpi, KpiChange, KpiUnit } from "@/lib/metrics/executive";
import { days, daysChange, pct, pctChange, pts, usd } from "@/lib/format";

/** Fixed so the loading skeleton occupies exactly the same space. */
export const KPI_CARD_HEIGHT = 148;

export function KpiStrip({
  kpis,
  markerIndex,
}: {
  kpis: Kpi[];
  markerIndex: number;
}) {
  return (
    <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <li key={kpi.id}>
          <KpiCard kpi={kpi} markerIndex={markerIndex} />
        </li>
      ))}
    </ul>
  );
}

function KpiCard({ kpi, markerIndex }: { kpi: Kpi; markerIndex: number }) {
  return (
    <Card className="flex flex-col justify-between p-4">
      <div style={{ minHeight: 64 }}>
        <p className="text-[11px] leading-tight text-muted">{kpi.label}</p>
        <p className="fig heading mt-1.5 text-[22px] leading-none text-ink">
          {formatValue(kpi.value, kpi.unit)}
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <ChangeRow
          period="MoM"
          change={kpi.mom}
          unit={kpi.unit}
          higherIsBetter={kpi.higherIsBetter}
        />
        <ChangeRow
          period="YoY"
          change={kpi.yoy}
          unit={kpi.unit}
          higherIsBetter={kpi.higherIsBetter}
        />
      </dl>

      <div className="mt-3">
        <Sparkline
          values={kpi.series.map((point) => point.value)}
          markerIndex={markerIndex}
        />
      </div>
    </Card>
  );
}

function ChangeRow({
  period,
  change,
  unit,
  higherIsBetter,
}: {
  period: string;
  change: KpiChange | null;
  unit: KpiUnit;
  higherIsBetter: boolean;
}) {
  if (!change) {
    return (
      <div className="contents">
        <dt className="text-muted">{period}</dt>
        <dd className="fig m-0 text-right text-muted">n/a</dd>
      </div>
    );
  }

  const improving = change.absolute === 0 ? null : change.absolute > 0 === higherIsBetter;

  // Favourable/unfavourable carry variance meaning here — direction against
  // what would be the good outcome for this measure — never decoration.
  const tone =
    improving === null
      ? "text-muted"
      : improving
        ? "text-favourable"
        : "text-unfavourable";

  return (
    <div className="contents">
      <dt className="text-muted">{period}</dt>
      <dd className={`fig m-0 text-right ${tone}`}>
        {formatChange(change, unit)}
      </dd>
    </div>
  );
}

function formatValue(value: number, unit: KpiUnit): string {
  if (unit === "percent") return pct(value);
  if (unit === "days") return days(value);
  return usd(value);
}

/**
 * A rate moves in points, a cycle moves in days, and a value moves in percent —
 * except when its base is negative, where a percentage is meaningless and the
 * dollar movement is shown instead.
 */
function formatChange(change: KpiChange, unit: KpiUnit): string {
  if (unit === "percent") return pts(change.absolute);
  if (unit === "days") return daysChange(change.absolute);
  if (change.relative === null) return usd(change.absolute);
  return pctChange(change.relative);
}

export function KpiStripSkeleton() {
  return (
    <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index}>
          <Card
            className="animate-pulse p-4"
            // Matches the real card so nothing shifts when data lands.
          >
            <div style={{ minHeight: 64 }}>
              <div className="h-3 w-24 rounded-sm bg-ink-wash" />
              <div className="mt-2.5 h-5 w-28 rounded-sm bg-ink-wash" />
            </div>
            <div className="mt-3 space-y-1">
              <div className="h-3 w-full rounded-sm bg-ink-wash" />
              <div className="h-3 w-full rounded-sm bg-ink-wash" />
            </div>
            <div className="mt-3 h-7 w-full rounded-sm bg-ink-wash" />
          </Card>
        </li>
      ))}
    </ul>
  );
}
