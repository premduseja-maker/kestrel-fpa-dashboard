"use client";

import type { ReactNode } from "react";
import { MonthSelector } from "./MonthSelector";
import { VarianceRibbon } from "./VarianceRibbon";

/**
 * Header, then the Variance Ribbon, then the screen. The ribbon is part of the
 * shell rather than the page, so it persists across every screen as specified.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-2.5">
            <span className="heading text-[15px] text-ink">
              Kestrel Outdoor Co.
            </span>
            <span className="text-[11px] text-muted">
              Management reporting
            </span>
          </div>
          <MonthSelector />
        </div>
      </header>

      <VarianceRibbon />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        {children}
      </main>

      <footer className="border-t border-rule px-4 py-3 sm:px-6">
        <p className="mx-auto max-w-[1400px] text-[10.5px] text-muted">
          Synthetic demonstration data. Figures in USD.
        </p>
      </footer>
    </div>
  );
}
