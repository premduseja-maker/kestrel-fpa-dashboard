"use client";

import { useSyncExternalStore } from "react";
import {
  getServerTheme,
  getTheme,
  setTheme,
  subscribeToTheme,
  type Theme,
} from "./theme";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Theme control. Reads the DOM attribute through useSyncExternalStore rather
 * than holding its own copy in state, so it always agrees with what the pre-paint
 * script set.
 *
 * "Auto" is the default and follows the operating system.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getTheme,
    getServerTheme,
  );

  return (
    <div
      className="flex overflow-hidden border border-rule"
      role="group"
      aria-label="Colour theme"
      style={{ borderRadius: 5 }}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            className={`px-2 py-1.5 text-[11px] transition-colors ${
              active
                ? "bg-ink-wash font-semibold text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
