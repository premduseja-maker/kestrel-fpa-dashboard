"use client";

import { useState, type ReactNode } from "react";
import { Card, CardHeader } from "./Card";
import { useIsNarrow } from "./hooks";

/**
 * A card that collapses on a phone and stays open on a desktop.
 *
 * The forecast screen is the one place where this matters: the drivers are the
 * control surface, and below them sit two charts, a tornado and a twelve-column
 * P&L. Left expanded, moving a slider means scrolling several screens to see
 * what it did and several back to move the next one. Collapsed, the outputs
 * become a short list of headings the owner opens one at a time, and the sliders
 * stay within reach.
 *
 * Open state is held in React rather than left on the DOM element: this screen
 * re-renders on every slider movement, and an uncontrolled `open` attribute
 * would be reasserted on each of those renders, snapping a panel the reader had
 * opened shut again.
 */
export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Whether the panel starts open on a phone. Desktop is always open. */
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const narrow = useIsNarrow();
  const [open, setOpen] = useState(defaultOpen);

  if (!narrow) {
    return (
      <Card>
        <CardHeader title={title} subtitle={subtitle} />
        {children}
      </Card>
    );
  }

  return (
    <Card>
      <details
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="flex min-h-[44px] cursor-pointer list-none items-start justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="heading text-[14px] text-ink">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                {subtitle}
              </p>
            )}
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 pt-0.5 text-[11px] text-muted"
          >
            {open ? "▴" : "▾"}
          </span>
        </summary>
        {children}
      </details>
    </Card>
  );
}
