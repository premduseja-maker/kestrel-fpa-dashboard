import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { DashboardProvider } from "@/components/DashboardProvider";
import { THEME_BOOT_SCRIPT } from "@/components/theme";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Kestrel Outdoor Co. · Management reporting",
  description:
    "FP&A reporting for Kestrel Outdoor Co. — margin decomposition, cash and forecast. Synthetic demonstration data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    /* suppressHydrationWarning: the boot script below sets data-theme on <html>
       before React hydrates, so the server markup and the live DOM differ by
       that attribute by design. */
    <html
      lang="en"
      className={`${plexSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <DashboardProvider>
          <AppShell>{children}</AppShell>
        </DashboardProvider>
      </body>
    </html>
  );
}
