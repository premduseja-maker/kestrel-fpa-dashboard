"use client";

import { useMemo } from "react";
import { useDashboard } from "./DashboardProvider";
import { ebitdaBridge, findMonth } from "@/lib/metrics/core";
import { varianceRibbon } from "@/lib/metrics/executive";
import { monthLong, pct, usdFull } from "@/lib/format";

/** Fixed height so the ribbon never reflows the page when data lands. */
export const RIBBON_MIN_HEIGHT = 58;

/**
 * The signature element: one line, below the header, on every screen, naming the
 * single largest driver of this month's EBITDA variance in plain English.
 *
 * Everything else on the page is deliberately quiet so that this lands.
 */
export function VarianceRibbon() {
  const { pl, budget, selectedMonth, status } = useDashboard();

  const driver = useMemo(() => {
    if (!selectedMonth) return null;
    const actual = findMonth(pl, selectedMonth);
    const budgetRow = findMonth(budget, selectedMonth);
    if (!actual || !budgetRow) return null;
    return varianceRibbon(actual, budgetRow, ebitdaBridge(actual, budgetRow));
  }, [pl, budget, selectedMonth]);

  return (
    <div
      className="border-b border-rule bg-signal-wash"
      style={{ minHeight: RIBBON_MIN_HEIGHT }}
      aria-live="polite"
    >
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center gap-1 px-4 py-3 sm:px-6">
        {status === "loading" && (
          <div className="h-4 w-2/3 max-w-md animate-pulse rounded-sm bg-ink-wash" />
        )}

        {status === "error" && (
          <p className="text-[12px] text-unfavourable">
            Variance driver unavailable — data failed to load.
          </p>
        )}

        {status === "ready" && !driver && (
          <p className="text-[12px] text-muted">
            No budget comparison available for{" "}
            {selectedMonth ? monthLong(selectedMonth) : "this month"}.
          </p>
        )}

        {status === "ready" && driver && (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] leading-snug sm:text-[13px]">
              {/* Sentence case, not uppercase with wide tracking — letterspaced
                  caps read as a terminal banner rather than a finding. */}
              <span className="heading text-[13px] text-signal-ink sm:text-[14px]">
                {driver.category} margin
              </span>
              <Separator />
              <span className="fig text-ink">
                {pct(driver.margin)}
              </span>
              <span className="text-muted">
                vs {pct(driver.targetMargin)} budget
              </span>
              <Separator />
              <span
                className={`fig ${
                  driver.adverse ? "text-unfavourable" : "text-favourable"
                }`}
              >
                {usdFull(driver.impact)}
              </span>
              <span className="text-muted">EBITDA impact</span>
              <Separator />
              <span className="fig text-ink">{pct(driver.share)}</span>
              <span className="text-muted">of category margin movement</span>
            </p>

            {/* Stated so a viewer can audit the comparison rather than trust it. */}
            <p className="text-[10.5px] leading-snug text-muted">
              Category target is the group budget gross margin — the budget file
              carries no category split. Share is of the summed absolute category
              movement; the other categories offset to a net margin effect of{" "}
              <span className="fig">{usdFull(driver.netEffect)}</span>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-rule">
      —
    </span>
  );
}
