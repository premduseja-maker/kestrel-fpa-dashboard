"use client";

import { coverMonths, pct, ptsMagnitude, usdFull } from "@/lib/format";
import {
  AGEING_BUCKETS,
  type CustomerAgeingRow,
  type ExcessStockRow,
} from "@/lib/metrics/cash";
import { useIsNarrow } from "./hooks";
import { HScroll } from "./HScroll";

/**
 * The ten SKUs holding the most cash above target cover, and what returning them
 * to target would release.
 */
export function ExcessStockTable({
  rows,
  targetCover,
  total,
}: {
  rows: ExcessStockRow[];
  targetCover: number;
  /** Cash released across every over-covered SKU, not just the ten shown. */
  total: number;
}) {
  return (
    <HScroll hint="Scroll for stock value and cash released">
      <table className="w-full min-w-[520px] border-collapse text-[12px]">
        <caption className="sr-only">
          SKUs with the most cash tied up above target inventory cover
        </caption>
        <thead>
          <tr className="border-b border-rule text-muted">
            <th scope="col" className="px-2 py-2 text-left font-medium">
              SKU
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Product
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Cover
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Stock value
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Cash released at {coverMonths(targetCover)}
            </th>
          </tr>
        </thead>
        <tbody className="fig">
          {rows.map((row) => (
            <tr key={row.sku} className="border-b border-rule last:border-0">
              <th scope="row" className="px-2 py-1.5 text-left font-normal text-ink">
                {row.sku}
              </th>
              <td
                className="px-2 py-1.5 text-left text-muted"
                style={{ fontVariantNumeric: "normal" }}
              >
                {row.product}
              </td>
              <td className="px-2 py-1.5 text-right text-ink">
                {coverMonths(row.monthsOnHand)}
              </td>
              <td className="px-2 py-1.5 text-right text-muted">
                {usdFull(row.closingValue)}
              </td>
              <td className="px-2 py-1.5 text-right font-semibold text-favourable">
                {usdFull(row.cashReleased)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th
              scope="row"
              colSpan={4}
              className="px-2 py-2 text-left font-semibold text-ink"
            >
              Total across every over-covered SKU
            </th>
            <td className="fig px-2 py-2 text-right font-semibold text-favourable">
              {usdFull(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </HScroll>
  );
}

/**
 * Customer ageing for the reporting month, ordered by how fast the past-due
 * share is deteriorating rather than by balance — a small account going bad is
 * the earlier signal.
 */
export function CustomerAgeingTable({
  rows,
  comparisonLabel,
  uniformProfile,
}: {
  rows: CustomerAgeingRow[];
  comparisonLabel: string | null;
  /** When true, no account is deteriorating faster than any other. */
  uniformProfile: boolean;
}) {
  /* Flag the fastest deteriorations — but only when the accounts actually
     differ. Highlighting three rows out of a ten-way tie would manufacture a
     finding, so where the profile is uniform nothing is flagged and the note
     below says so. */
  const flagged = new Set(
    uniformProfile
      ? []
      : rows
          .filter((row) => (row.pastDueShift ?? 0) > 0.01)
          .slice(0, 3)
          .map((row) => row.customer),
  );

  const narrow = useIsNarrow();

  const note = (
    <>
      {uniformProfile && (
        <p className="mb-3 border-l-2 border-signal bg-signal-wash px-3 py-2 text-[11px] leading-relaxed text-muted">
          <span className="font-semibold text-ink">
            No account is ageing faster than the others.
          </span>{" "}
          All ten sit at the same past-due share and have moved by the same
          amount against {comparisonLabel ?? "the comparison month"} — the
          source data applies one ageing profile and varies only the balance. So
          there is no &ldquo;worst payer&rdquo; to name here: the exposure is
          simply the size of each balance, and the table is ordered that way.
        </p>
      )}
    </>
  );

  if (narrow) {
    return (
      <div>
        {note}
        {/* Nine columns — customer, five ageing buckets, total, past-due share
            and the shift — is roughly 900px of table. Scrolling it sideways
            would hide the two figures that matter most, so each account becomes
            a card: balance and past-due share on the face, the bucket split
            behind a tap. */}
        <ul className="list-none space-y-2 p-0">
          {rows.map((row) => (
            <AgeingCard
              key={row.customer}
              row={row}
              flagged={flagged.has(row.customer)}
              comparisonLabel={comparisonLabel}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {note}
      <table className="w-full border-collapse text-[12px]">
        <caption className="sr-only">
          Receivables ageing by customer for the reporting month
        </caption>
        <thead>
          <tr className="border-b border-rule text-muted">
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Customer
            </th>
            {AGEING_BUCKETS.map((bucket) => (
              <th
                key={bucket.key}
                scope="col"
                className="px-2 py-2 text-right font-medium"
              >
                {bucket.label}
              </th>
            ))}
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Total
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Past due
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              {comparisonLabel ? `Shift vs ${comparisonLabel}` : "Shift"}
            </th>
          </tr>
        </thead>
        <tbody className="fig">
          {rows.map((row) => {
            const isFlagged = flagged.has(row.customer);
            return (
              <tr
                key={row.customer}
                className="border-b border-rule last:border-0"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-2 py-1.5 text-left font-normal text-ink"
                  style={{ fontVariantNumeric: "normal" }}
                >
                  {row.customer}
                  {isFlagged && (
                    // Flag carries a word, never colour alone.
                    <span className="ml-1.5 text-[10px] font-semibold text-unfavourable">
                      worsening
                    </span>
                  )}
                </th>
                {AGEING_BUCKETS.map((bucket) => (
                  <td
                    key={bucket.key}
                    className="px-2 py-1.5 text-right text-muted"
                  >
                    {usdFull(row[bucket.key])}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right text-ink">
                  {usdFull(row.total)}
                </td>
                <td className="px-2 py-1.5 text-right text-ink">
                  {pct(row.pastDueShare)}
                </td>
                <td
                  className={`px-2 py-1.5 text-right ${
                    (row.pastDueShift ?? 0) > 0
                      ? "text-unfavourable"
                      : "text-favourable"
                  }`}
                >
                  {row.pastDueShift === null
                    ? "—"
                    : `${row.pastDueShift > 0 ? "+" : "-"}${ptsMagnitude(
                        row.pastDueShift,
                      )}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One customer's ageing as a card.
 *
 * The face carries the balance and the past-due share, which is what decides
 * whether the account needs a call. The five buckets sit behind a tap because
 * they explain the share rather than compete with it.
 */
function AgeingCard({
  row,
  flagged,
  comparisonLabel,
}: {
  row: CustomerAgeingRow;
  flagged: boolean;
  comparisonLabel: string | null;
}) {
  const worsening = (row.pastDueShift ?? 0) > 0;

  return (
    <li>
      <details className="border border-rule bg-surface" style={{ borderRadius: 5 }}>
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
          <span className="min-w-0">
            <span className="block truncate text-[12px] text-ink">
              {row.customer}
              {flagged && (
                // Flag carries a word, never colour alone.
                <span className="ml-1.5 text-[10px] font-semibold text-unfavourable">
                  worsening
                </span>
              )}
            </span>
            <span className="fig block text-[11px] text-muted">
              {usdFull(row.total)} outstanding
            </span>
          </span>

          <span className="flex shrink-0 items-baseline gap-2.5 text-right">
            <span className="fig text-[13px] text-ink">{pct(row.pastDueShare)}</span>
            <span
              className={`fig text-[12px] ${
                worsening ? "text-unfavourable" : "text-favourable"
              }`}
            >
              {row.pastDueShift === null
                ? "—"
                : `${row.pastDueShift > 0 ? "+" : "-"}${ptsMagnitude(row.pastDueShift)}`}
            </span>
            <span aria-hidden="true" className="text-[10px] text-muted">
              ▾
            </span>
          </span>
        </summary>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-rule px-3 py-2.5 text-[12px]">
          {AGEING_BUCKETS.map((bucket) => (
            <div key={bucket.key}>
              <dt className="text-[11px] text-muted">{bucket.label}</dt>
              <dd className="fig m-0 text-ink">{usdFull(row[bucket.key])}</dd>
            </div>
          ))}
          <div className="col-span-2">
            <dt className="text-[11px] text-muted">
              Past due{comparisonLabel ? ` vs ${comparisonLabel}` : ""}
            </dt>
            <dd className="fig m-0 text-ink">
              {pct(row.pastDueShare)}
              {row.pastDueShift !== null && (
                <span className={worsening ? "text-unfavourable" : "text-favourable"}>
                  {" "}
                  {row.pastDueShift > 0 ? "+" : "-"}
                  {ptsMagnitude(row.pastDueShift)}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </details>
    </li>
  );
}
