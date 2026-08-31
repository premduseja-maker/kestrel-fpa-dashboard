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
- **Small text is floored at 14px below 640px.** This is in tension with
  "Layout: dense" — density is a desktop affordance, legibility is not
  negotiable. (Was 12px; raised to 14px when the phone layouts were built.)
  Chart furniture is exempt and carries a `.furniture` class at 10–11px: axis
  ticks and in-plot value labels are not prose, and at body size they collide
  with each other, which is the problem the mobile chart variants exist to
  solve.
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
- **A discount/volume breakeven was added to the Recover banner.** Not in the
  brief. The Recover figure holds volume constant when price moves, which
  invites the obvious objection that stopping discounts would cost sales.
  Fitting a price elasticity would mean guessing a coefficient and presenting
  the guess as analysis; inverting the question instead gives an exact answer
  from the unit margins already in hand — apparel volume would have to fall more
  than 42.2% before the cut stops paying for itself. It is quoted on the strict
  gross-profit basis; freight, processing and acquisition spend would fall with
  the lost units too, which pushes the true threshold past 45.5%.

## 5. Phone layouts

CLAUDE.md's quality floor says "Works at 390px width. Owners open these on
phones." The screens now do. The rule followed throughout was **build a
simplified variant, never shrink the desktop one** — a chart with half its
labels removed is a different chart, not a smaller one.

| Screen | What changes below 640px |
|---|---|
| Shell | Tabs scroll horizontally rather than collapsing into a hamburger — four screens is few enough that hiding them costs more than it saves, and a visible bar also shows which screen you are on. Header is sticky and the month selector sits top-right, under the thumb. |
| Summary | KPI cards two across. **The dual-axis revenue/EBITDA chart becomes a single axis with both series rebased to 100** at the first month. |
| Summary, Margin | Both waterfalls rotate to horizontal bars. This *adds* information: laid out in rows there is room for each bar's figure, where stacked vertically at 390px seven value labels collided and were dropped. |
| Margin | Category margins default to 12 months with a 24-month toggle. The SKU table becomes a card list — SKU, category, GM% and the points movement on the face, the rest behind a tap — with sorting re-exposed as a select, since the header row that carried it no longer exists. |
| Cash | Inventory cover keeps all 24 months but opens scrolled to the right, so the last six are what you see. The 13-week forecast scrolls rather than dropping to every third week label — on a cash runway the week the line crosses zero is the whole question. Customer ageing becomes a card list. |
| Forecast | Outputs collapse into an accordion so the sliders stay in reach while adjusting. The tornado stacks: driver name, full-width bar, then the two figures at their ends. The forward P&L scrolls with the line column frozen. |

Three things are worth calling out as judgement calls rather than requirements:

- **The category margin chart drops its direct end labels on a phone** and gains
  a legend beneath instead. Direct labels are the house style, but "Accessories"
  needs 70px of right gutter — a third of the plot at 390px — and Hardgoods and
  Accessories finish close enough together that the two labels overlapped. The
  legend carries each line's closing value, so it is not a pure loss.
- **Scroll affordances are stated in words, not drawn as a fade.** The brief
  prohibits gradients, and a fade is invisible to a screen reader regardless.
- **Touch targets are enforced below 640px, by width.** `pointer: coarse` is the
  more correct signal — it would also cover a 768px tablet, which currently gets
  the desktop layout and its smaller controls — but it cannot be verified in a
  headless harness, so the tested rule was kept over the untested one.

## 6. Lighthouse

**Desktop: performance 86–97, accessibility 100, best practices 100, SEO 100.**
The 90+ target is met on a machine that is not otherwise busy — three
consecutive runs scored 86, 97 and 94, tracking the harness's own benchmark
index (817, 1222, 1459).

That variance is worth stating plainly, because an earlier pass recorded 42–63
and attributed the shortfall to the architecture. That attribution was wrong.
The low scores came from measuring against stale local servers while several
headless browser instances were competing for the CPU; one of those servers was
also returning 500s for chunk filenames a rebuild had replaced, which polluted
the console-errors audit too. Measured cleanly, the app is fine.

**Mobile emulation: performance 58**, with accessibility, best practices and SEO
all 100. Lighthouse applies a 4× CPU slowdown for the mobile run, and this is a
client-rendered charting dashboard: the page hydrates, fetches four files,
computes, then paints. Charts are lazy-loaded so the charting library stays out
of the hydration path, which was the largest lever available inside the brief.
Closing the remaining gap means server-rendering the computed values, which
contradicts CLAUDE.md's "All calculation happens client-side" — a brief
decision, not a code one.

Two accessibility defects were found only by auditing `/forecast` specifically
rather than the home page, and both are fixed: the Apply Recover button was
white on amber at 3.46:1, and the nav and theme controls were a pixel under the
24px touch-target minimum.

## 7. Where the brief's narrative differs from the data

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
