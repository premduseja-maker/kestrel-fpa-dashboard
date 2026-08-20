# Deviations from CLAUDE.md

Everything built that departs from the brief, and why. Grouped by whether the
change was requested, forced by the data, or a judgement call.

## 1. Requested changes (CLAUDE.md amended in place)

These were asked for after the brief was written. The amendments are dated in
CLAUDE.md itself so a later session cannot read the original spec and revert
them.

| Change | Was | Reason |
|---|---|---|
| Figures in IBM Plex **Sans** with `tabular-nums` | IBM Plex Mono | "Modern, not robotic." Monospaced figures at headline size read as console output. Column alignment is kept by the tabular numerals. |
| Card radius **6px** | 2px | Same instruction; near-square corners read as a terminal window. |
| Ribbon label sentence case | Letterspaced uppercase | Same instruction; caps read as a banner rather than a finding. |
| **Dark theme** added | Light only | Requested. Dark values are selected steps validated against the dark surface, not an inversion. |

## 2. Palette additions beyond the eight named colours

CLAUDE.md lists eight colours. Four more tokens exist. None is a new accent —
each is a derived step of an existing colour, added because one value could not
do two jobs.

| Token | Why |
|---|---|
| `--signal-ink` | `--signal` measures 3.07:1 on its own wash, so small text set in it fails WCAG. This is a darker step of the same hue at 5.10:1. **Marks still use `--signal`.** |
| `--mark-neutral` | Waterfall totals used `--ink`, which inverts to near-white in dark mode; a near-white slab is far too loud. Light `#12161C`, dark `#7A828C`. |
| `--ageing-1…5` | Receivables buckets are an *ordinal* scale. Five unrelated categorical hues would be wrong; these are one hue deepening, mixed from `--unfavourable`. |
| `--muted` darkened to `#63676D` | Was `#6B6F76`, which measured 4.48:1 on the ribbon wash — just under the 4.5 required. |

## 3. Forced by the data

The generated files carry inconsistencies. Each is surfaced on screen rather
than reconciled away.

- **No "returns" bar in the gross profit bridge.** Prompt 2 asked for volume,
  price, mix, discount and returns. In this data `net_revenue = gross_revenue ×
  (1 − discount_pct)` exactly and COGS follows units sold, so recorded gross
  profit is *independent* of `units_returned` — a returns effect would be
  structurally zero. Returns are quantified as an exposure instead.
- **A sixth effect, unit cost, was added** so the bridge foots with no plug. On
  the current data it is +$100,576 — the second largest bar on the chart — so
  dropping it would have left the bridge short by that much. (On an earlier data
  revision the same effect was −$3.82, which is a good illustration of why a
  named effect should never be dropped for looking small.)
- **The Variance Ribbon's share is of summed absolute category movement**, not a
  signed share of the net. Signed, apparel reads 165% of the total, because the
  other categories offset it.
- **Customer ageing sorts by balance, not by deterioration.** Prompt 3 asked to
  flag the fastest-worsening accounts. All ten sit at 49.0% past due having
  moved +1.02pts, identically — ranking them would rank a tie.
- **The cash forecast splits DTC from wholesale.** `ar_ageing` is the wholesale
  book while 68.6% of revenue is DTC. Ageing all revenue over DSO projects cash
  to −$280k, an artefact of the model.
- **The forecast collects on an AR-implied 27.8 days, not the stated 42.3 DSO.**
  The two do not reconcile; the model uses the balance that actually exists and
  the panel shows both.

## 4. Judgement calls

- **The cash conversion cycle is not a plain stacked area.** Prompt 3 asked for
  DIO/DSO/DPO stacked beneath the cycle, but CCC = DIO + DSO − DPO, so stacking
  all three sums to a meaningless quantity. Payable days extend below the zero
  rule instead.
- **Every chart has a table twin.** Not in the brief. A Recharts SVG is not
  keyboard-reachable and its values live in a pointer tooltip, so without one
  the numbers were gated behind a mouse.
- **Small text is floored at 12px below 640px.** This is in tension with
  "Layout: dense" — density is a desktop affordance, legibility is not
  negotiable.
- **Charts are lazy-loaded.** Not specified; keeps Recharts out of the
  hydration path.
- **The tornado swings ±10% of each driver's absolute value.** Multiplying by
  (1 ± 10%) inverts on the two negative growth drivers, so the chart would read
  backwards against every other row.
- **`/about` is linked from the footer disclosure, not the main nav.** The
  reader who wonders whether the numbers are real is already reading that line;
  the nav stays the four analysis screens.
- **The Variance Ribbon appears on `/about` too**, since it lives in the shell
  and CLAUDE.md says every screen.

## 5. Targets not met

- **Lighthouse performance: 63 desktop, 42 mobile-emulated. Target was 90+.**
  Accessibility and best practices are both 100. The gap is architectural:
  CLAUDE.md requires all calculation client-side from static JSON, so the page
  must hydrate, fetch four files, compute, and only then paint — which is
  inherently blocking-time heavy. Lazy-loading the charts was the largest
  available lever within the brief. Closing the rest means server-rendering the
  computed values, which contradicts "All calculation happens client-side"; that
  is a brief decision, not a code one. Note also that the measuring machine
  benchmarked at 442–788 against a typical 1000–2000, with a 4× CPU throttle
  applied on top for the mobile run.

## 6. Where the brief's narrative differs from the data

Stated because the screens report the data, not the brief.

| CLAUDE.md says | The data says |
|---|---|
| Apparel margin 42.8% → 33.5% | 41.0% → 35.4% |
| Hardgoods 47.1% → 51.3% | 47.9% → 50.6% |
| Blended CAC $28 → $45 | $32 → $42 |
| Cash conversion cycle 74 → 124 days | 79 → 120 days |
| Revenue +15.4%, EBITDA $155k → $13k | Exactly as stated |

Note the apparel and hardgoods figures now read the same on the P&L and on the
SKU data; an earlier data revision had them diverging, and the "(P&L basis)"
qualifier that used to sit in this table is no longer needed.
