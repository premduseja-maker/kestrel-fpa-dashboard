import type { DataSource } from "./adapter";
import { StaticAdapter } from "./static-adapter";

/**
 * The active data source, as a singleton so its cache is shared across every
 * component in the page.
 *
 * On a live engagement this is the one line that changes:
 *   export const data: DataSource = new SupabaseAdapter(client)
 */
export const data: DataSource = new StaticAdapter();

export type { DataSource } from "./adapter";
export * from "./types";
