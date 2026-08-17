import type { ReactNode } from "react";

/**
 * The one card shape used everywhere: 1px rule, 2px radius, no shadow.
 * Generous inside, tight outside — the density CLAUDE.md asks for comes from
 * the gaps between cards, not from cramping their contents.
 */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-rule bg-surface ${className}`}
      style={{ borderRadius: 6 }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
      <div>
        <h2 className="heading text-[14px] text-ink">{title}</h2>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
