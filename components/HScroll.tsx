import type { ReactNode } from "react";

/**
 * A horizontally scrolling region that says so.
 *
 * On a phone several of these tables and grids are wider than the screen by
 * design — freezing a column and scrolling beats reflowing a P&L into cards.
 * What breaks is discoverability: nothing about a clipped table tells the owner
 * there is more to the right, and the usual fix (a gradient fade at the edge) is
 * both prohibited by the brief and invisible to a screen reader.
 *
 * So the affordance is written down. The hint is shown only at phone width,
 * where the clipping actually happens, and it is real text rather than an icon.
 */
export function HScroll({
  hint,
  children,
  className = "",
  labelledBy,
}: {
  /** What is off-screen, e.g. "Scroll sideways for all 24 months". */
  hint: string;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <div>
      {/* tabIndex makes the region keyboard-scrollable, which a plain
          overflow container is not. */}
      <div
        className={`hscroll ${className}`}
        tabIndex={0}
        role="region"
        aria-label={labelledBy ? undefined : hint}
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
      <p className="mt-1.5 text-[11px] text-muted sm:hidden" aria-hidden="true">
        {hint} <span aria-hidden="true">→</span>
      </p>
    </div>
  );
}
