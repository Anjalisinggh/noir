"use client";

import { useTheme } from "./ThemeProvider";

/** Awaken / Silence switch — pours the venom ink from itself. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      data-theme-toggle
      className="toggle"
      aria-label={dark ? "Return to silence (light mode)" : "Awaken (dark mode)"}
      aria-pressed={dark}
      onClick={(e) => toggle(e.currentTarget)}
    >
      <span className="toggle__dot" aria-hidden />
      <span className="toggle__label">{dark ? "Silence" : "Awaken"}</span>
    </button>
  );
}
