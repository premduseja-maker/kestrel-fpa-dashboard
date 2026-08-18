"use client";

export type Theme = "auto" | "light" | "dark";

export const THEME_KEY = "kestrel-theme";

/**
 * The chosen theme is stored on <html data-theme> and mirrored to localStorage.
 * The DOM attribute is the single source of truth rather than React state,
 * because an inline script in the document head sets it before first paint to
 * avoid a flash of the wrong theme — so React must read what that script wrote,
 * not the other way round.
 */
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  if (typeof document === "undefined") return "auto";
  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" || value === "dark" ? value : "auto";
}

export function setTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === "auto") {
    root.removeAttribute("data-theme");
    try {
      localStorage.removeItem(THEME_KEY);
    } catch {
      // Private browsing or a blocked store: the in-session choice still holds.
    }
  } else {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // As above.
    }
  }

  for (const listener of listeners) listener();
}

export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** The server cannot know the stored choice; "auto" matches the pre-paint default. */
export function getServerTheme(): Theme {
  return "auto";
}

/**
 * Runs before first paint, inlined in <head>. Kept deliberately tiny and
 * dependency-free; anything that throws here would block the document.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;
