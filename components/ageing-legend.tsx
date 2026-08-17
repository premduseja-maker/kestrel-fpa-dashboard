import { AGEING_BUCKETS } from "@/lib/metrics/cash";

/**
 * Ordinal ramp: one hue deepening with age. Order carries the meaning; hue
 * identity does not.
 *
 * Kept in its own module, free of Recharts, so the card header can show the
 * legend without dragging the charting library into the initial bundle.
 */
export const BUCKET_FILL: Record<string, string> = {
  current: "var(--ageing-1)",
  d_1_30: "var(--ageing-2)",
  d_31_60: "var(--ageing-3)",
  d_61_90: "var(--ageing-4)",
  d_90_plus: "var(--ageing-5)",
};

/** Ordered scale legend, since the buckets are a ramp rather than categories. */
export function AgeingLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-0 text-[11px] text-muted">
      {AGEING_BUCKETS.map((bucket) => (
        <li key={bucket.key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-sm border border-rule"
            style={{ background: BUCKET_FILL[bucket.key] }}
          />
          {bucket.label}
        </li>
      ))}
    </ul>
  );
}
