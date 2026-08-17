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
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-2.5">
            <span className="heading text-[15px] text-ink">
              Kestrel Outdoor Co.
            </span>
            <span className="hidden text-[11px] text-muted sm:inline">
              Management reporting
            </span>
          </div>

          <nav aria-label="Screens" className="order-3 w-full sm:order-none sm:w-auto">
            <ul className="flex items-center gap-1">
              {SCREENS.map((screen) => {
                const active = pathname === screen.href;
                return (
                  <li key={screen.href}>
                    <Link
                      href={screen.href}
                      aria-current={active ? "page" : undefined}
                      className={`block px-2.5 py-1 text-[12.5px] transition-colors ${
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

          <div className="ml-auto flex items-center gap-3">
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
