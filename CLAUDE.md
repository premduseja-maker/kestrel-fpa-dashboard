# Kestrel Dashboard — Project Context

## What this is
A demo financial dashboard for a fictional DTC + wholesale outdoor gear brand,
built as a portfolio piece for a fractional FP&A practice. The audience is a US
small-business owner evaluating whether to hire the person who built it.

This is an **FP&A product**, not a BI tool. The difference: a BI tool shows what
happened; this explains why and quantifies the fix. Every screen must move the
viewer toward one conclusion.

## The narrative this dashboard exists to surface
Revenue grew 15.4% YoY. EBITDA fell from $155k to $13k.

Cause, invisible at group level:
- Apparel gross margin 42.8% -> 33.5% (discounting 5% -> 21%, returns rising)
- Hardgoods 47.1% -> 51.3%, which masks the apparel decay in the group number
- Blended CAC $28 -> $45
- Cash conversion cycle 74 -> 124 days as apparel inventory cover drifts up

If a viewer leaves without understanding that apparel discounting is eating the
business, the dashboard has failed regardless of how it looks.

## Data
Static JSON in `public/data/`. No database, no API, no auth. All calculation
happens client-side.

| File | Rows | Key fields |
|---|---|---|
| pl_monthly.json | 24 | net_revenue, revenue_dtc/wholesale, revenue_ + gp_ by category, cogs, gross_profit, opex lines, ebitda |
| budget_monthly.json | 24 | net_revenue, gross_profit, ad_spend, total_opex, ebitda |
| marketing_monthly.json | 24 | sessions, conversion_rate, orders, aov, new_customers, ad_spend, blended_cac, return_rate, repeat_rate |
| sku_master.json | 44 | sku, category, product_name, list_price, unit_cost, launch_month |
| sku_monthly.json | 1056 | month, sku, category, units_sold, discount_pct, gross_revenue, net_revenue, cogs, units_returned, gross_margin_pct |
| inventory_monthly.json | 1056 | month, sku, category, opening/purchased/sold/closing_units, closing_value, months_on_hand |
| ar_ageing.json | 240 | month, customer, current, d_1_30, d_31_60, d_61_90, d_90_plus, total_outstanding |
| cashflow_monthly.json | 24 | opening_cash, ebitda, working_capital_change, capex, interest_paid, net_change, closing_cash, dio, dso, dpo, cash_conversion_cycle |

Months are `YYYY-MM` strings, 2024-08 through 2026-07. Categories: Apparel,
Hardgoods, Accessories. All figures USD.

## Architecture — non-negotiable
Components must never import JSON directly. Everything goes through a data
adapter, so the same components later run against Supabase for real clients.

```
lib/data/
  types.ts            # PLMonth, SkuMonth, InventoryMonth, ... (mirror the JSON)
  adapter.ts          # interface DataSource { getPL(): Promise<PLMonth[]>; ... }
  static-adapter.ts   # fetches from /data/*.json
  index.ts            # exports the active adapter
lib/metrics/          # all derived calculations, pure functions, unit-testable
components/
app/
```

Rules:
- Every derived number lives in `lib/metrics/`, never inline in a component.
- Load small tables eagerly; lazy-load `sku_monthly` and `inventory_monthly`
  (~200KB each) only when their screen mounts.
- No `any`. Types mirror the JSON exactly.

## Number formatting — this is the tell that a CA built it
Put these in `lib/format.ts` and use them everywhere. Never raw JS numbers.

- Currency, large: `$3.1M`, `$221.4k`. Full dollars only in tables: `$221,410`
- Negatives in parentheses, never a minus sign: `($89,724)`
- Percentages to one decimal: `44.2%`
- Changes in percentage points, labelled: `-2.3pts` (never "-2.3%" for a margin move)
- Tabular numerals on every figure, so columns align
- Months as `Aug '25`, not `2025-08`

## Design direction

**Instrument, not dashboard.** This should feel like a precision financial
instrument a CFO keeps open all day — quiet, dense, confident. Not a SaaS
marketing page. No gradients, no glassmorphism, no decorative icons, no emoji.

Palette — the ledger tradition, reinterpreted:
- Ink (text, headers): `#12161C`
- Paper (page background): `#FAFAF7`
- Surface (cards): `#FFFFFF`
- Rule (borders, gridlines): `#E3E1DA`
- Muted (secondary text): `#6B6F76`
- Unfavourable: `#A8341F`
- Favourable: `#0F6E5C`
- Signal (attention, the one accent): `#C77700`

Favourable/unfavourable colour is reserved *only* for variance meaning — never
decoration. In FP&A those two colours carry information, and spending them
elsewhere destroys that.

Type:
- UI: IBM Plex Sans
- All figures: IBM Plex Sans with `font-variant-numeric: tabular-nums`
- Headings: IBM Plex Sans, weight 600, tight tracking. No display serif.

Load via `next/font/google`.

Layout: dense. 12-column grid, 16px gutters. Cards use a 1px rule, no shadow,
6px radius. Generous whitespace inside cards, tight spacing between them.

**Amended 2026-08-17 (supersedes the original type and radius spec).** Figures
were specified in IBM Plex Mono at 2px radius; the result read mechanical —
`$271.2k` in a monospace at headline size looks like console output rather than a
financial statement. Figures now use the UI sans with `tabular-nums`, which keeps
the column alignment that matters and drops the typewriter texture, and cards use
a 6px radius. Do not reintroduce a monospace for figures, letterspaced uppercase
labels, or near-square corners. The palette, the hairline rules, the absence of
shadows and the density are unchanged.

**Signature element — the Variance Ribbon.** A persistent full-width strip below
the header on every screen, stating the single largest driver of the current
month's EBITDA variance in plain English, computed from the data:

> `APPAREL MARGIN  —  33.5% vs 44.0% budget  —  ($47,200) EBITDA impact  —  78% of total variance`

This is the thing no BI tool does and every FP&A person does. It's the memorable
element. Keep everything else quiet so it lands.

Motion: almost none. Chart lines draw once on mount, 400ms. Nothing else moves.

## Quality floor
- Works at 390px width. Owners open these on phones.
- Visible keyboard focus states.
- `prefers-reduced-motion` respected.
- No layout shift on data load — skeletons match final dimensions.

## Stack
Next.js App Router, TypeScript, Tailwind, Recharts, TanStack Table.
Do not add other dependencies without asking.
