"use client";

import { usd, usdFull } from "@/lib/format";
import type { TornadoRow } from "@/lib/metrics/forecast";
import { niceTicks } from "@/lib/ticks";
import { useIsNarrow } from "./hooks";

/**
 * Drivers ranked by the EBITDA swing each produces at plus and minus ten percent
 * of its own value.
 *
 * Hand-drawn rather than a Recharts bar chart: a tornado is a diverging bar per
 * row measured from a shared centre, and laying it out directly is both simpler
 * and gives exact control over the zero rule and the direct labels.
 */
export function TornadoChart({ rows }: { rows: TornadoRow[] }) {
  const narrow = useIsNarrow();

  if (rows.length === 0) return null;

  const extent = Math.max(
    ...rows.flatMap((row) => [Math.abs(row.low), Math.abs(row.high)]),
  );
  const scale = niceTicks(-extent, extent, 4);
  const span = scale.hi - scale.lo || 1;

  /** Value -> percentage position across the plot. */
  const position = (value: number) => ((value - scale.lo) / span) * 100;
  const zero = position(0);

  return (
    <div>
      {/*
        At 390px the desktop layout leaves about 186px of plot after the 128px
        label gutter, and the value labels — "($17,473) at +10%" — are wider than
        that on their own, so they ran off the card and over each other.

        The phone stacks instead: the driver name gets its own line, the bar gets
        the full width, and the two figures sit beneath it at the ends they
        belong to. Same information, three rows instead of one.
      */}
      <ul className={`list-none p-0 ${narrow ? "space-y-3" : "space-y-2"}`}>
        {rows.map((row) => {
          const lowPos = position(row.low);
          const highPos = position(row.high);
          return (
            <li
              key={row.key}
              className={
                narrow
                  ? "space-y-1"
                  : "grid grid-cols-[128px_1fr] items-center gap-3"
              }
            >
              <span
                className={
                  narrow
                    ? "block text-[12px] text-ink"
                    : "truncate text-[11.5px] text-ink"
                }
                title={row.label}
              >
                {row.label}
              </span>

              <div>
              <div className="relative h-6">
                {/* The shared centre. */}
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-full border-l border-rule"
                  style={{ left: `${zero}%` }}
                />

                {row.magnitude < 1 ? (
                  /* A driver with no profit effect gets a stated nil rather than
                     an invisible bar, which would read as a rendering fault.
                     Stock cover is the case in point: it moves cash, not EBITDA. */
                  <span
                    className="furniture absolute top-1 leading-4 text-muted"
                    style={{ left: `calc(${zero}% + 6px)` }}
                  >
                    no EBITDA effect — moves cash only
                  </span>
                ) : (
                  <>
                    <Segment
                      from={zero}
                      to={lowPos}
                      value={row.low}
                      direction="−10%"
                      showLabel={!narrow}
                    />
                    <Segment
                      from={zero}
                      to={highPos}
                      value={row.high}
                      direction="+10%"
                      showLabel={!narrow}
                    />
                  </>
                )}
              </div>

              {narrow && row.magnitude >= 1 && (
                <div className="mt-1 flex justify-between gap-3">
                  <span className="fig furniture text-muted">
                    {usdFull(row.low)}{" "}
                    <span style={{ fontVariantNumeric: "normal" }}>at −10%</span>
                  </span>
                  <span className="fig furniture text-muted">
                    {usdFull(row.high)}{" "}
                    <span style={{ fontVariantNumeric: "normal" }}>at +10%</span>
                  </span>
                </div>
              )}
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className={
          narrow ? "mt-2" : "mt-2 grid grid-cols-[128px_1fr] gap-3"
        }
      >
        {!narrow && <span />}
        <div className="relative h-4">
          {scale.ticks.map((tick) => (
            <span
              key={tick}
              className="fig furniture absolute top-0 -translate-x-1/2 text-muted"
              style={{ left: `${position(tick)}%` }}
            >
              {usd(tick)}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
        Each driver moved ±10% of its own value, everything else held, measured on
        twelve-month EBITDA. Ten percent of the value rather than ten percentage
        points, so the drivers stay comparable — ten points on a 1.7% conversion
        rate would be a sevenfold change, while ten points off a 29% discount is
        barely a third of it.
      </p>
    </div>
  );
}

function Segment({
  from,
  to,
  value,
  direction,
  showLabel,
}: {
  from: number;
  to: number;
  value: number;
  /** Which way the driver was moved to produce this bar. */
  direction: string;
  /** False on a phone, where the figures are listed beneath the bar instead. */
  showLabel: boolean;
}) {
  if (Math.abs(to - from) < 0.01) return null;

  const left = Math.min(from, to);
  const width = Math.abs(to - from);
  const favourable = value >= 0;

  return (
    <>
      <span
        aria-hidden="true"
        className="absolute top-1"
        style={{
          left: `${left}%`,
          width: `${width}%`,
          height: 16,
          background: favourable
            ? "var(--favourable)"
            : "var(--unfavourable)",
          borderRadius: 2,
        }}
      />
      {/* Direct label outside the bar end, so no value is hover-only. The
          direction is stated because favourability is not the same as sign: a
          lower CAC helps EBITDA while a lower AOV hurts it, so a green bar alone
          does not tell the reader which way the driver moved. */}
      {showLabel && (
        <span
          className="fig furniture absolute top-1 whitespace-nowrap leading-4 text-muted"
          style={
            to >= from
              ? { left: `calc(${left + width}% + 4px)` }
              : { right: `calc(${100 - left}% + 4px)` }
          }
        >
          {usdFull(value)}{" "}
          <span style={{ fontVariantNumeric: "normal" }}>at {direction}</span>
        </span>
      )}
    </>
  );
}
