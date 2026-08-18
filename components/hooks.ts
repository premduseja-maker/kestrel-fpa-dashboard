"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** The server has no media queries; assume motion is allowed and let the
 *  client's first snapshot correct it before paint. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks the OS reduced-motion setting so chart animation is switched off at
 * the source, rather than only being neutralised by CSS after the fact.
 *
 * Read through useSyncExternalStore: a media query is an external store, and
 * subscribing to it this way avoids the cascading render that setting state
 * inside an effect would cause.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* -------------------------------------------------------------------------- */

const NARROW_QUERY = "(max-width: 640px)";

function subscribeNarrow(onStoreChange: () => void): () => void {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getNarrowSnapshot(): boolean {
  return window.matchMedia(NARROW_QUERY).matches;
}

function getNarrowServerSnapshot(): boolean {
  return false;
}

/**
 * True on a phone-width viewport.
 *
 * Charts use this to switch to a simplified variant rather than shrink the
 * desktop one: at 390px, eight date labels along an axis collapse into an
 * unreadable smear, and per-bar value labels overlap each other. Thinning the
 * labels is a different chart, not a smaller one.
 */
export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    getNarrowSnapshot,
    getNarrowServerSnapshot,
  );
}
