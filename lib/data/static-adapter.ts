import type { DataSource } from "./adapter";
import type {
  ArAgeingMonth,
  BudgetMonth,
  CashflowMonth,
  InventoryMonth,
  MarketingMonth,
  PLMonth,
  SkuMaster,
  SkuMonth,
} from "./types";

/**
 * DataSource backed by the static JSON in public/data.
 *
 * Each table is fetched at most once per page load. The cache stores the
 * in-flight promise rather than the resolved value, so two components asking
 * for the same table on the same tick share one network request instead of
 * racing and firing two.
 */
export class StaticAdapter implements DataSource {
  private cache = new Map<string, Promise<unknown>>();

  private load<T>(file: string): Promise<T[]> {
    const existing = this.cache.get(file);
    if (existing) return existing as Promise<T[]>;

    const request = fetch(`/data/${file}.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Could not load /data/${file}.json (${response.status})`,
          );
        }
        return response.json() as Promise<T[]>;
      })
      .then((rows) => sortByMonth(rows))
      .catch((error: unknown) => {
        // Drop the failed promise so a retry can actually re-request.
        this.cache.delete(file);
        throw error;
      });

    this.cache.set(file, request);
    return request;
  }

  getPL(): Promise<PLMonth[]> {
    return this.load<PLMonth>("pl_monthly");
  }

  getBudget(): Promise<BudgetMonth[]> {
    return this.load<BudgetMonth>("budget_monthly");
  }

  getMarketing(): Promise<MarketingMonth[]> {
    return this.load<MarketingMonth>("marketing_monthly");
  }

  getCashflow(): Promise<CashflowMonth[]> {
    return this.load<CashflowMonth>("cashflow_monthly");
  }

  getSkuMaster(): Promise<SkuMaster[]> {
    return this.load<SkuMaster>("sku_master");
  }

  getArAgeing(): Promise<ArAgeingMonth[]> {
    return this.load<ArAgeingMonth>("ar_ageing");
  }

  /** ~200KB — deliberately behind its own method. */
  getSkuMonthly(): Promise<SkuMonth[]> {
    return this.load<SkuMonth>("sku_monthly");
  }

  /** ~200KB — deliberately behind its own method. */
  getInventoryMonthly(): Promise<InventoryMonth[]> {
    return this.load<InventoryMonth>("inventory_monthly");
  }
}

/**
 * Chronological order, so every consumer can rely on it. Rows without a month
 * (sku_master) are returned untouched.
 */
function sortByMonth<T>(rows: T[]): T[] {
  if (rows.length === 0 || !hasMonth(rows[0])) return rows;
  return [...(rows as (T & { month: string })[])].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
}

function hasMonth(row: unknown): row is { month: string } {
  return (
    typeof row === "object" &&
    row !== null &&
    typeof (row as { month?: unknown }).month === "string"
  );
}
