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
