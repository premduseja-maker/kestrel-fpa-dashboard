"use client";

import { coverMonths, pct, usd, usdFull, usdUnit } from "@/lib/format";
import {
  RECOVER_PRESET,
  type DiscountBreakeven,
  type RecoverOutcome,
} from "@/lib/metrics/forecast";

/**
 * The one hero figure on this screen: what apparel discipline is worth over the
 * next twelve months.
 *
 * The caveat sits directly beneath the number rather than in a footnote, because
 * it is the first thing a numerate reader will ask: the model holds volume
 * constant when the discount moves, so this is the value of the discount if
 * demand holds, not a promise that it will.
 */
export function RecoverBanner({
  outcome,
  breakeven,
  applied,
  onApply,
}: {
  outcome: RecoverOutcome;
  breakeven: DiscountBreakeven | null;
  applied: boolean;
  onApply: () => void;
}) {
  const worthwhile = outcome.ebitdaDelta > 0;

  return (
    <div className="border border-signal bg-signal-wash p-4 sm:p-5" style={{ borderRadius: 6 }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] text-muted">
            Apparel discount back to{" "}
            <span className="fig">{pct(RECOVER_PRESET.apparelDiscount)}</span>,
            stock cover back to{" "}
            <span className="fig">
              {coverMonths(RECOVER_PRESET.apparelCover)}
            </span>
          </p>

          {/* Hero figure: proportional numerals, sans, one per view. */}
          <p className="heading mt-1.5 text-[34px] leading-tight text-ink sm:text-[44px]">
            {worthwhile ? "+" : ""}
            {usd(outcome.ebitdaDelta)} EBITDA
          </p>
          <p className="heading text-[20px] leading-tight text-ink sm:text-[24px]">
            {outcome.cashDelta >= 0 ? "+" : ""}
            {usd(outcome.cashDelta)} cash
          </p>
          <p className="mt-1 text-[12px] text-muted">
            over the next twelve months, against the current trajectory
          </p>
        </div>

        <button
          type="button"
          onClick={onApply}
          disabled={applied}
          className="shrink-0 border border-signal bg-signal px-3.5 py-2 text-[12.5px] font-semibold text-on-signal transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderRadius: 5 }}
        >
          {applied ? "Recover applied" : "Apply Recover"}
        </button>
      </div>

      {breakeven?.applicable && (
        /* The answer to "but I would lose sales". It sits directly under the
           prize because it is the first challenge anyone numerate will make. */
        <p className="mt-4 border-t border-rule pt-3 text-[13px] leading-relaxed text-ink sm:text-[14px]">
          It stops paying for itself only if apparel volume falls more than{" "}
          <span className="fig font-semibold text-signal-ink">
            {pct(breakeven.volumeTolerance)}
          </span>
          .{" "}
          <span className="text-muted">
            Cutting the discount lifts gross profit per unit from{" "}
            <span className="fig">{usdUnit(breakeven.unitGpBefore)}</span> to{" "}
            <span className="fig">{usdUnit(breakeven.unitGpAfter)}</span>, so the
            same gross profit needs that many fewer units. Computed from the unit
            margins, with no assumption about how demand responds. This is the
            strict form — freight, processing and acquisition spend would fall
            with the lost units too, which pushes the true threshold past{" "}
            <span className="fig">{pct(breakeven.contributionTolerance)}</span>.
          </span>
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-rule pt-3 text-[11.5px] sm:grid-cols-4">
        <Figure label="EBITDA, current" value={usdFull(outcome.baseEbitda)} />
        <Figure
          label="EBITDA, recovered"
          value={usdFull(outcome.recoveredEbitda)}
        />
        <Figure
          label="Closing cash, current"
          value={usdFull(outcome.baseClosingCash)}
        />
        <Figure
          label="Closing cash, recovered"
          value={usdFull(outcome.recoveredClosingCash)}
        />
      </dl>

      <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
        <span className="font-semibold text-ink">What this assumes.</span> Volume
        is held constant when the discount changes — no price elasticity is
        modelled, because fitting one would mean guessing a coefficient and
        presenting the guess as analysis. The breakeven above answers the same
        challenge without needing that guess.
      </p>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="fig m-0 font-semibold text-ink">{value}</dd>
    </div>
  );
}
