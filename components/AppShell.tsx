"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MonthSelector } from "./MonthSelector";
import { ThemeToggle } from "./ThemeToggle";
import { VarianceRibbon } from "./VarianceRibbon";

/**
 * Screens that exist. Entries are added as each one is built — a nav that links
 * to a route which 404s is worse than a nav that is still short.
 */
const SCREENS = [
  { href: "/", label: "Summary" },
  { href: "/margin", label: "Margin" },
  { href: "/cash", label: "Cash" },
  { href: "/forecast", label: "Forecast" },
] as const;

/**
 * Header, then the Variance Ribbon, then the screen. The ribbon is part of the
 * shell rather than the page, so it persists across every screen as specified.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      {/*
        Phone layout, top to bottom: brand and month on one row, then the screen
        tabs on their own row.

        The month selector is deliberately on the first row and right-aligned —
        it is the control the owner changes most often, and at the top-right it
        sits under the thumb rather than behind a menu. The tabs scroll
        horizontally instead of collapsing into a hamburger: four screens is few
        enough that hiding them behind a tap costs more than it saves, and a
        visible tab bar also shows which screen you are on without opening
        anything.
      */}
      <header className="sticky top-0 z-30 border-b border-rule bg-surface">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="heading truncate text-[15px] text-ink">
              Kestrel Outdoor Co.
            </span>
            <span className="hidden text-[11px] text-muted sm:inline">
              Management reporting
            </span>
          </div>

          <nav
            aria-label="Screens"
            className="order-3 -mx-4 w-[calc(100%+2rem)] sm:order-none sm:mx-0 sm:w-auto"
          >
            <ul className="hscroll flex items-center gap-1 px-4 sm:px-0">
              {SCREENS.map((screen) => {
                const active = pathname === screen.href;
                return (
                  <li key={screen.href} className="shrink-0">
                    <Link
                      href={screen.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[44px] items-center px-3 text-[12.5px] transition-colors sm:min-h-0 sm:px-2.5 sm:py-1.5 ${
                        active
                          ? "bg-ink-wash font-semibold text-ink"
                          : "text-muted hover:text-ink"
                      }`}
                      style={{ borderRadius: 5 }}
                    >
                      {screen.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <MonthSelector />
          </div>
        </div>
      </header>

      <VarianceRibbon />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        {children}
      </main>

      <footer className="border-t border-rule px-4 py-3 sm:px-6">
        <p className="mx-auto max-w-[1400px] text-[10.5px] text-muted">
          {/* The disclosure is the link: a viewer who wonders whether these are
              real numbers is already looking at this line. */}
          <Link href="/about" className="underline underline-offset-2 hover:text-ink">
            Synthetic demonstration data
          </Link>
          . Figures in USD.
        </p>
      </footer>
    </div>
  );
}
