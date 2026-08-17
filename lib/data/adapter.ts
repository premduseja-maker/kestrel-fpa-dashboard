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
 * The seam between the UI and wherever the numbers live.
 *
 * Components depend on this interface only — never on JSON, never on a fetch
 * URL. Swapping the static files for Supabase on a live engagement means
 * writing one more implementation of this interface and changing the export in
 * ./index.ts; no component changes.
 *
 * The two heavy tables (sku_monthly, inventory_monthly — roughly 200KB each)
 * sit behind their own methods so a screen that doesn't need them never pays
 * for them.
 */
export interface DataSource {
  /** Eagerly loaded: the small monthly tables every screen leans on. */
  getPL(): Promise<PLMonth[]>;
  getBudget(): Promise<BudgetMonth[]>;
  getMarketing(): Promise<MarketingMonth[]>;
  getCashflow(): Promise<CashflowMonth[]>;
  getSkuMaster(): Promise<SkuMaster[]>;
  getArAgeing(): Promise<ArAgeingMonth[]>;

  /** Lazy: only fetched when a screen that needs SKU detail mounts. */
  getSkuMonthly(): Promise<SkuMonth[]>;
  getInventoryMonthly(): Promise<InventoryMonth[]>;
}
