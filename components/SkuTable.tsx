"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { CATEGORIES, type Category } from "@/lib/data";
import { count, pct, pts, usdFull } from "@/lib/format";
import type { SkuMarginRow } from "@/lib/metrics/margin";
import { Sparkline } from "./Sparkline";
import { useIsNarrow } from "./hooks";

/* Feature set and column definitions live at module scope: rebuilding them each
   render would invalidate every data-dependent model. */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const helper = createColumnHelper<typeof features, SkuMarginRow>();

const NUMERIC = "text-right";

const columns = helper.columns([
  helper.accessor("sku", { header: "SKU" }),
  helper.accessor("product", { header: "Product" }),
  helper.accessor("category", { header: "Category" }),
  helper.accessor("revenueFy2", {
    header: "FY2 revenue",
    cell: (context) => usdFull(context.getValue()),
  }),
  helper.accessor("marginFy2", {
    header: "FY2 GM%",
    cell: (context) => pct(context.getValue()),
  }),
  helper.accessor("marginDelta", {
    header: "GM% vs FY1",
    cell: (context) => {
      const value = context.getValue();
      return (
        <span className={value < 0 ? "text-unfavourable" : "text-favourable"}>
          {pts(value)}
        </span>
      );
    },
  }),
  helper.accessor("discountFy2", {
    header: "Discount",
    cell: (context) => pct(context.getValue()),
  }),
  helper.accessor("returnRateFy2", {
    header: "Returns",
    cell: (context) => pct(context.getValue()),
  }),
  helper.display({
    id: "trend",
    header: "Monthly GM%",
    cell: (context) => (
      <div className="w-[120px]">
        <Sparkline
          values={context.row.original.marginSeries}
          markerIndex={context.row.original.marginSeries.length - 1}
        />
      </div>
    ),
  }),
]);

/** Right-align the figure columns; the first three are text. */
const NUMERIC_COLUMNS = new Set([
  "revenueFy2",
  "marginFy2",
  "marginDelta",
  "discountFy2",
  "returnRateFy2",
]);

/**
 * Sorts offered on the phone. A nine-column header row is where sorting lives on
 * desktop; that row does not exist in the card list, so the capability is
 * re-exposed as a select rather than dropped.
 */
const MOBILE_SORTS = [
  { id: "marginDelta", desc: false, label: "Margin deterioration" },
  { id: "marginFy2", desc: false, label: "Lowest GM%" },
  { id: "revenueFy2", desc: true, label: "Largest revenue" },
  { id: "discountFy2", desc: true, label: "Deepest discount" },
  { id: "returnRateFy2", desc: true, label: "Highest returns" },
] as const;

/** How many cards the phone list shows before asking. */
const MOBILE_PAGE = 12;

/**
 * SKU-level margin detail.
 *
 * Default sort is margin deterioration, not revenue: the biggest sellers are not
 * the question on this screen, the fastest-decaying margins are.
 *
 * The category filter is plain React state applied before the data reaches the
 * table. Registering the filtering feature for one select would add API surface
 * without adding behaviour.
 */
export function SkuTable({ rows }: { rows: SkuMarginRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "marginDelta", desc: false },
  ]);
  const [category, setCategory] = useState<Category | "All">("All");
  const narrow = useIsNarrow();
  const [expanded, setExpanded] = useState(false);

  const data = useMemo(
    () =>
      category === "All"
        ? rows
        : rows.filter((row) => row.category === category),
    [rows, category],
  );

  const table = useTable({
    features,
    columns,
    data,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <label className="flex items-center gap-2 text-[11px] text-muted">
          <span>Category</span>
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as Category | "All")
            }
            className="min-h-[44px] cursor-pointer border border-rule bg-surface px-2 py-1 text-[12px] text-ink sm:min-h-0"
            style={{ borderRadius: 5 }}
          >
            <option value="All">All</option>
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {narrow && (
          <label className="flex items-center gap-2 text-[11px] text-muted">
            <span>Sort</span>
            <select
              value={sorting[0]?.id ?? "marginDelta"}
              onChange={(event) => {
                const next = MOBILE_SORTS.find(
                  (option) => option.id === event.target.value,
                );
                if (next) setSorting([{ id: next.id, desc: next.desc }]);
              }}
              className="min-h-[44px] cursor-pointer border border-rule bg-surface px-2 py-1 text-[12px] text-ink"
              style={{ borderRadius: 5 }}
            >
              {MOBILE_SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <p className="text-[11px] text-muted">
          {count(data.length)} of {count(rows.length)} SKUs · sorted by margin deterioration
          by default
        </p>
      </div>

      {narrow ? (
        /* The desktop table caps its own height and scrolls inside itself. That
           is the wrong move on a phone — a scroll region nested in a scrolling
           page traps the gesture — so the list is truncated instead and the rest
           is one tap away. Forty-four cards unrolled is 2,600px of page. */
        <>
          <ul className="list-none space-y-2 p-0">
            {table
              .getRowModel()
              .rows.slice(0, expanded ? undefined : MOBILE_PAGE)
              .map((row) => (
                <SkuCard key={row.id} row={row.original} />
              ))}
          </ul>

          {table.getRowModel().rows.length > MOBILE_PAGE && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              className="mt-2 min-h-[44px] w-full border border-rule text-[12px] text-muted transition-colors hover:text-ink"
              style={{ borderRadius: 5 }}
            >
              {expanded
                ? `Show first ${MOBILE_PAGE}`
                : `Show all ${count(table.getRowModel().rows.length)} SKUs`}
            </button>
          )}
        </>
      ) : (
      <div className="max-h-[520px] overflow-auto border border-rule" style={{ borderRadius: 5 }}>
        <table className="w-full border-collapse text-[12px]">
          <caption className="sr-only">
            SKU margin detail for FY2 with the movement against FY1
          </caption>
          <thead className="sticky top-0 z-10 bg-surface">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-rule">
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={`whitespace-nowrap px-3 py-2 font-medium text-muted ${
                        NUMERIC_COLUMNS.has(header.column.id)
                          ? NUMERIC
                          : "text-left"
                      }`}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-ink"
                          aria-label={`Sort by ${String(header.column.id)}`}
                        >
                          <table.FlexRender header={header} />
                          <span aria-hidden="true" className="text-[9px]">
                            {sorted === "asc"
                              ? "▲"
                              : sorted === "desc"
                                ? "▼"
                                : "↕"}
                          </span>
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-rule last:border-0 hover:bg-ink-wash"
              >
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`whitespace-nowrap px-3 py-1.5 ${
                      NUMERIC_COLUMNS.has(cell.column.id)
                        ? `fig ${NUMERIC} text-ink`
                        : "text-ink"
                    }`}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

/**
 * One SKU as a card.
 *
 * Nine columns will not fit 390px, and a horizontally scrolling table hides the
 * two columns that matter — GM% and its movement — behind a swipe. The card
 * shows those four facts up front and puts the rest behind a tap.
 *
 * Built on <details>, so expand/collapse is native: keyboard-operable, exposed
 * to assistive tech, and searchable by the browser's own find-in-page.
 */
function SkuCard({ row }: { row: SkuMarginRow }) {
  const adverse = row.marginDelta < 0;

  return (
    <li>
      <details className="border border-rule bg-surface" style={{ borderRadius: 5 }}>
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
          <span className="min-w-0">
            <span className="fig block text-[12px] font-semibold text-ink">
              {row.sku}
            </span>
            <span className="block truncate text-[11px] text-muted">
              {row.category}
            </span>
          </span>

          <span className="flex shrink-0 items-baseline gap-2.5 text-right">
            <span className="fig text-[13px] text-ink">{pct(row.marginFy2)}</span>
            <span
              className={`fig text-[12px] ${
                adverse ? "text-unfavourable" : "text-favourable"
              }`}
            >
              {pts(row.marginDelta)}
            </span>
            <span aria-hidden="true" className="text-[10px] text-muted">
              ▾
            </span>
          </span>
        </summary>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-rule px-3 py-2.5 text-[12px]">
          <Detail label="Product" value={row.product} span />
          <Detail label="FY2 revenue" value={usdFull(row.revenueFy2)} />
          <Detail label="Discount" value={pct(row.discountFy2)} />
          <Detail label="Returns" value={pct(row.returnRateFy2)} />
          <div className="col-span-2">
            <dt className="text-[11px] text-muted">Monthly GM%</dt>
            <dd className="m-0 mt-1">
              <Sparkline
                values={row.marginSeries}
                markerIndex={row.marginSeries.length - 1}
              />
            </dd>
          </div>
        </dl>
      </details>
    </li>
  );
}

function Detail({
  label,
  value,
  span = false,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : undefined}>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="fig m-0 text-ink">{value}</dd>
    </div>
  );
}
