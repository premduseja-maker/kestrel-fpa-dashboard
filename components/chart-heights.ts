/**
 * Chart heights live apart from the chart components so a page can reserve the
 * right space in a skeleton without importing the component — and therefore
 * without pulling Recharts into the initial bundle.
 *
 * The charts are loaded on demand: nothing above the fold needs them, they only
 * render once the data has arrived anyway, and keeping the charting library out
 * of the hydration path is the single biggest lever on this dashboard's
 * time-to-interactive.
 */
export const REVENUE_EBITDA_HEIGHT = 320;
export const WATERFALL_HEIGHT = 320;
export const CATEGORY_MARGIN_HEIGHT = 340;
export const SCATTER_HEIGHT = 340;
export const CYCLE_HEIGHT = 360;
export const FORECAST_HEIGHT = 300;
export const AGEING_HEIGHT = 320;
export const ACTUAL_FORECAST_HEIGHT = 260;
