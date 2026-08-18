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
            className="cursor-pointer border border-rule bg-surface px-2 py-1 text-[12px] text-ink"
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
        <p className="text-[11px] text-muted">
          {count(data.length)} of {count(rows.length)} SKUs · sorted by margin deterioration
          by default
        </p>
      </div>

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
    </div>
  );
}
