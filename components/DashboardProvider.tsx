"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { data } from "@/lib/data";
import type {
  BudgetMonth,
  CashflowMonth,
  MarketingMonth,
  Month,
  PLMonth,
} from "@/lib/data";
import { latestMonth } from "@/lib/metrics/core";

type Status = "loading" | "ready" | "error";

interface DashboardValue {
  status: Status;
  error: string | null;
  pl: PLMonth[];
  budget: BudgetMonth[];
  cashflow: CashflowMonth[];
  marketing: MarketingMonth[];
  /** Every month present in the P&L, oldest first. */
  months: Month[];
  selectedMonth: Month | null;
  setSelectedMonth: (month: Month) => void;
}

const EMPTY: DashboardValue = {
  status: "loading",
  error: null,
  pl: [],
  budget: [],
  cashflow: [],
  marketing: [],
  months: [],
  selectedMonth: null,
  setSelectedMonth: () => {},
};

const DashboardContext = createContext<DashboardValue>(EMPTY);

/**
 * Loads the four small monthly tables once, and owns the selected month for
 * every screen. The two ~200KB SKU-level tables are deliberately not fetched
 * here — screens that need them ask the adapter directly when they mount.
 */
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pl, setPl] = useState<PLMonth[]>([]);
  const [budget, setBudget] = useState<BudgetMonth[]>([]);
  const [cashflow, setCashflow] = useState<CashflowMonth[]>([]);
  const [marketing, setMarketing] = useState<MarketingMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Month | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      data.getPL(),
      data.getBudget(),
      data.getCashflow(),
      data.getMarketing(),
    ])
      .then(([plRows, budgetRows, cashflowRows, marketingRows]) => {
        if (cancelled) return;
        setPl(plRows);
        setBudget(budgetRows);
        setCashflow(cashflowRows);
        setMarketing(marketingRows);
        setSelectedMonth((current) => current ?? latestMonth(plRows));
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Could not load data");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<DashboardValue>(
    () => ({
      status,
      error,
      pl,
      budget,
      cashflow,
      marketing,
      months: pl.map((row) => row.month),
      selectedMonth,
      setSelectedMonth,
    }),
    [status, error, pl, budget, cashflow, marketing, selectedMonth],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardValue {
  return useContext(DashboardContext);
}
