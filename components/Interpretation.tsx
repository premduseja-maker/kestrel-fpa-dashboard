import { pct, pctChange, pts, ptsMagnitude } from "@/lib/format";
import type { MarginNarrative } from "@/lib/metrics/margin";

/**
 * The read-this-first block. Every figure in the prose is computed, so the text
 * cannot drift from the charts beneath it.
 *
 * Written the way an analyst writes a commentary paragraph: the movement, then
 * the cause, then why the group number did not show it.
 */
export function Interpretation({
  narrative,
}: {
  narrative: MarginNarrative;
}) {
  const { worst, best, groupDelta, groupFy2, revenueGrowth } = narrative;
  const worsening = worst.delta < 0;

  return (
    <div className="border-l-2 border-signal bg-signal-wash px-4 py-3.5">
      <p className="text-[13px] leading-relaxed text-ink">
        Revenue{" "}
        {revenueGrowth === null ? (
          "moved"
        ) : (
          <>
            grew <Fig>{pctChange(revenueGrowth)}</Fig>
          </>
        )}{" "}
        over the last twelve months, while group gross margin{" "}
        {groupDelta < 0 ? "fell" : "rose"} <Fig>{ptsMagnitude(groupDelta)}</Fig>{" "}
        to <Fig>{pct(groupFy2)}</Fig>.{" "}
        <strong className="font-semibold">
          {worst.category} is the driver
        </strong>
        : its margin moved from <Fig>{pct(worst.marginFy1)}</Fig> to{" "}
        <Fig>{pct(worst.marginFy2)}</Fig> (<Fig>{pts(worst.delta)}</Fig>) on{" "}
        <Fig>{pct(worst.revenueShareFy2)}</Fig> of revenue, as SKU-level
        discounting rose from <Fig>{pct(narrative.worstDiscountFy1)}</Fig> to{" "}
        <Fig>{pct(narrative.worstDiscountFy2)}</Fig> of gross revenue.{" "}
        {best.delta > 0 && worsening ? (
          <>
            {best.category} improved <Fig>{pts(best.delta)}</Fig> over the same
            period, which is precisely why the group figure looks calmer than the
            business is — the two move in opposite directions and the average
            hides both.
          </>
        ) : (
          <>
            {best.category} moved <Fig>{pts(best.delta)}</Fig>, so the group
            figure understates the spread beneath it.
          </>
        )}
      </p>
    </div>
  );
}

function Fig({ children }: { children: React.ReactNode }) {
  return <span className="fig font-semibold">{children}</span>;
}
