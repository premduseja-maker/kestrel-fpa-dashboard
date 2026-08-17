import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kestrel · Finance dashboard",
  description:
    "Monthly P&L against budget, cash, SKU margin and AR ageing for Kestrel.",
};

/**
 * Sections that don't exist yet are rendered as plain text rather than links —
 * a nav that 404s is worse than a nav that admits what isn't built.
 */
const SECTIONS = [
  { label: "Overview", href: "/" },
  { label: "P&L vs budget" },
  { label: "Cash & working capital" },
  { label: "SKU margin" },
  { label: "AR ageing" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-hairline bg-surface-1">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
            <span className="text-[15px] font-semibold tracking-tight text-ink-primary">
              Kestrel
            </span>
            <nav aria-label="Sections">
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
                {SECTIONS.map((section) =>
                  "href" in section ? (
                    <li key={section.label}>
                      <Link
                        href={section.href}
                        aria-current="page"
                        className="font-medium text-ink-primary"
                      >
                        {section.label}
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={section.label}
                      className="flex items-center gap-1.5 text-ink-muted"
                    >
                      {section.label}
                      <span className="rounded-sm border border-hairline px-1 py-px text-[10px] uppercase tracking-wide">
                        soon
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
