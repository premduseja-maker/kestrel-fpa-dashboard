import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

/**
 * Datasets live as static JSON in public/data. They are read from disk on the
 * server rather than fetched over HTTP — no network hop, and the parsed value is
 * memoised per request with React.cache so several components can ask for the
 * same dataset without re-reading the file.
 *
 * public/data also contains kestrel.json, a bundle whose eight sections are
 * byte-identical to the individual files. We read the individual files so a page
 * only pays for the datasets it actually uses; loading both would double the
 * work for no gain.
 */

export type PlMonth = {
  month: string;
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
};

export type BudgetMonth = {
  month: string;
  net_revenue: number;
  gross_profit: number;
  ad_spend: number;
  total_opex: number;
  ebitda: number;
};

export type CashflowMonth = {
  month: string;
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
};

export type MarketingMonth = {
  month: string;
  sessions: number;
  conversion_rate: number;
  orders: number;
  aov: number;
  new_customers: number;
  ad_spend: number;
  blended_cac: number;
  return_rate: number;
  repeat_rate: number;
};

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readDataset<T>(name: string): Promise<T[]> {
  const raw = await readFile(path.join(DATA_DIR, `${name}.json`), "utf8");
  return JSON.parse(raw) as T[];
}

/** Sorted ascending by month so callers can rely on chronological order. */
function byMonth<T extends { month: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.month.localeCompare(b.month));
}

export const getPlMonthly = cache(async () =>
  byMonth(await readDataset<PlMonth>("pl_monthly")),
);

export const getBudgetMonthly = cache(async () =>
  byMonth(await readDataset<BudgetMonth>("budget_monthly")),
);

export const getCashflowMonthly = cache(async () =>
  byMonth(await readDataset<CashflowMonth>("cashflow_monthly")),
);

export const getMarketingMonthly = cache(async () =>
  byMonth(await readDataset<MarketingMonth>("marketing_monthly")),
);
