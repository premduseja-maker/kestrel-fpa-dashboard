"use client";

import { useDashboard } from "./DashboardProvider";
import { monthLong, monthShort } from "@/lib/format";

/**
 * A native select, deliberately: it is keyboard- and screen-reader-correct for
 * free, and on a phone it opens the OS picker rather than a custom menu the
 * owner has to fight.
 */
export function MonthSelector() {
  const { months, selectedMonth, setSelectedMonth, status } = useDashboard();

  return (
    <label className="flex items-center gap-2 text-[11px] text-muted">
      <span>Month</span>
      <select
        value={selectedMonth ?? ""}
        onChange={(event) => setSelectedMonth(event.target.value)}
        disabled={status !== "ready"}
        aria-label="Reporting month"
        className="fig cursor-pointer border border-rule bg-surface px-2 py-1 text-[12px] text-ink disabled:cursor-not-allowed disabled:text-muted"
        style={{ borderRadius: 5 }}
      >
        {months.length === 0 && <option value="">—</option>}
        {[...months].reverse().map((month) => (
          <option key={month} value={month} label={monthLong(month)}>
            {monthShort(month)}
          </option>
        ))}
      </select>
    </label>
  );
}
