# Kestrel Dashboard

A demonstration FP&A dashboard for a fictional DTC and wholesale outdoor gear
brand. Four screens carry one argument: revenue grew 15.4% while EBITDA fell from
$155k to $13k, apparel discounting is the cause, and recovering that discipline is
worth roughly $171k of EBITDA and $218k of cash over twelve months.

The data is synthetic. See [/about](https://kestrel-dashboard-mu.vercel.app/about) in the running app.

**Live:** https://kestrel-dashboard-mu.vercel.app

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Use `localhost`, not `127.0.0.1` — Next.js blocks cross-origin dev resources by
default, so on `127.0.0.1` the HTML loads but the scripts, fonts and hot reload
are refused and the page renders unstyled.

```bash
npm run build        # production build
npm start            # serve the production build
npx tsc --noEmit     # typecheck
npx eslint .         # lint
```

No environment variables, no database, no API keys. The eight datasets are
committed under `public/data`.

## Architecture

```
lib/data/          types, the DataSource interface, the static adapter, singleton
lib/metrics/       every derived number, as pure functions
lib/format.ts      every figure that reaches the screen
components/        presentation
app/               routes
```

**Components never import JSON.** They depend on the `DataSource` interface in
`lib/data/adapter.ts`, and the static files sit behind one implementation of it.
Pointing the same screens at a client's warehouse means writing a second
implementation and changing one export in `lib/data/index.ts`. Nothing in
`components/` or `app/` changes.

**Derived numbers live in `lib/metrics/`, never inline in a component.** Each
module is a set of pure functions with no React import, so they are testable in
isolation and the same calculation cannot drift between two screens.

**Every figure goes through `lib/format.ts`.** Negatives wear parentheses,
`($89,724)`, never a minus. Rate movements are stated in points and labelled
`pts`. Figures are set in tabular numerals so columns align.

**Loading.** The four small monthly tables load once in `DashboardProvider`. The
two ~200KB SKU-level tables are fetched only by the screens that need them, and
the adapter caches the in-flight promise so concurrent callers share one request.

### Screens

| Route | What it does |
|---|---|
| `/` | Executive summary — KPI strip, revenue against EBITDA, budget-to-actual bridge |
| `/margin` | Where the margin went — category margins, gross profit bridge, SKU detail, discount scatter |
| `/cash` | Cash conversion cycle, 13-week forecast, inventory cover, receivables ageing |
| `/forecast` | Driver model with a tornado and the Recover preset |
| `/about` | What the data is and how a live engagement differs |

The **Variance Ribbon** sits below the header on every screen and names the
largest driver of the current month's EBITDA variance, computed live.

## Analytical notes

These are the decisions a reviewer is most likely to want to check.

- **The gross profit bridge foots exactly.** Volume, mix, price, discount and
  unit cost sum to the movement with a residual of `$0.00`. The rate effects are
  a sequential substitution in the order price → discount → cost; a different
  order shifts value between those three bars but not the total.
- **COGS is driven by units, not revenue** — in the bridge and in the forecast.
  As a percentage of revenue, cutting a discount drags cost down with price and
  the discount effect cancels itself out entirely.
- **The forecast is calibrated.** At default driver values a zero-growth month
  reproduces the trailing three-month revenue and EBITDA to the cent, so every
  delta measures the change rather than a gap between model and record.
- **No price elasticity is modelled.** Volume is held constant when the discount
  moves, so the Recover figure is an upper bound. The caveat sits under the
  number in the UI, not in a footnote.
- **`capex` and `interest_paid` are positive outflows** in `cashflow_monthly`:
  `net_change = ebitda + working_capital_change − capex − interest_paid`.
- **`ar_ageing` is the wholesale book only** while 68.6% of revenue is DTC.
  Ageing all revenue over DSO projects cash to −$280k, which is an artefact of
  the model rather than anything in the business.

### Known inconsistencies in the source data

Surfaced in the UI rather than reconciled away.

| Inconsistency | Where it is stated |
|---|---|
| `pl_monthly` and `sku_monthly` disagree on category margin (apparel 41.0→35.4 vs 36.0→25.0; hardgoods rising vs flat) | Source note on `/margin` |
| Stated DSO (42.3d) does not tie to the AR balance, which implies 27.8d against wholesale revenue | Assumptions panel on `/cash` |
| All ten customers share one ageing profile — same past-due share, same shift, zero spread | Note above the customer table |
| Returns are not deducted from revenue or COGS, so recorded gross profit is independent of them | Returns note beside the gross profit bridge |
| `budget_monthly` is derived from actuals (`ad_spend` is exactly 0.86 × actual every month), so variance is one-sided by construction | — |

## Stack

Next.js App Router, TypeScript, Tailwind, Recharts, TanStack Table v9. TanStack
v9 is not the v8 API — `useTable` and `tableFeatures`, not `useReactTable`. The
package ships version-matched guidance under
`node_modules/@tanstack/react-table/skills/`.

## Accessibility

- Light and dark themes; the dark palette is a set of selected steps validated
  for contrast and colourblind separation against the dark surface, not an
  inversion of the light one.
- Every chart has a table twin, because an SVG chart is not keyboard-reachable
  and its values live in a pointer-driven tooltip.
- Visible focus rings on every interactive element.
- `prefers-reduced-motion` is respected at the source: chart animation is
  switched off, not merely overridden in CSS.
- Direction is never carried by colour alone — deltas pair a colour with a glyph
  or a word.
