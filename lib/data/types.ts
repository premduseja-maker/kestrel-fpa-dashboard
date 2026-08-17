/**
 * Interfaces mirroring the eight JSON files in public/data exactly.
 * Months are `YYYY-MM` strings, 2024-08 through 2026-07. All figures USD.
 */

export type Month = string;

export type Category = "Apparel" | "Hardgoods" | "Accessories";

export interface PLMonth {
  month: Month;
  net_revenue: number;
  revenue_dtc: number;
  revenue_wholesale: number;
  revenue_apparel: number;
  revenue_hardgoods: number;
  revenue_accessories: number;
  cogs: number;
  gross_profit: number;
  gp_apparel: number;
  gp_hardgoods: number;
  gp_accessories: number;
  payroll: number;
  rent: number;
  software: number;
  freight: number;
  processing_fees: number;
  ad_spend: number;
  g_and_a: number;
  total_opex: number;
  ebitda: number;
  depreciation: number;
  interest: number;
  profit_before_tax: number;
}

export interface BudgetMonth {
  month: Month;
  net_revenue: number;
  gross_profit: number;
  ad_spend: number;
  total_opex: number;
  ebitda: number;
}

export interface MarketingMonth {
  month: Month;
  sessions: number;
  conversion_rate: number;
  orders: number;
  aov: number;
  new_customers: number;
  ad_spend: number;
  blended_cac: number;
  return_rate: number;
  repeat_rate: number;
}

export interface SkuMaster {
  sku: string;
  category: Category;
  product_name: string;
  list_price: number;
  unit_cost: number;
  launch_month: Month;
}

export interface SkuMonth {
  month: Month;
  sku: string;
  category: Category;
  units_sold: number;
  discount_pct: number;
  gross_revenue: number;
  net_revenue: number;
  cogs: number;
  units_returned: number;
  gross_margin_pct: number;
}

export interface InventoryMonth {
  month: Month;
  sku: string;
  category: Category;
  opening_units: number;
  purchased_units: number;
  units_sold: number;
  closing_units: number;
  closing_value: number;
  months_on_hand: number;
}

export interface ArAgeingMonth {
  month: Month;
  customer: string;
  current: number;
  d_1_30: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  total_outstanding: number;
}

export interface CashflowMonth {
  month: Month;
  opening_cash: number;
  ebitda: number;
  working_capital_change: number;
  capex: number;
  interest_paid: number;
  net_change: number;
  closing_cash: number;
  dio: number;
  dso: number;
  dpo: number;
  cash_conversion_cycle: number;
}

export const CATEGORIES: readonly Category[] = [
  "Apparel",
  "Hardgoods",
  "Accessories",
];

/** Maps a category to its P&L column suffix, so category loops stay typed. */
export const CATEGORY_KEY: Record<
  Category,
  { revenue: keyof PLMonth; gp: keyof PLMonth }
> = {
  Apparel: { revenue: "revenue_apparel", gp: "gp_apparel" },
  Hardgoods: { revenue: "revenue_hardgoods", gp: "gp_hardgoods" },
  Accessories: { revenue: "revenue_accessories", gp: "gp_accessories" },
};
