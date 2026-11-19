"use client";

import { useTheme } from "./ThemeProvider";

/** Ink / Paper switch: pours the venom ink from itself. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      data-theme-toggle
      className="toggle"
      aria-label={dark ? "Switch to paper (light mode)" : "Switch to ink (dark mode)"}
      aria-pressed={dark}
      onClick={(e) => toggle(e.currentTarget)}
    >
      <span className="toggle__dot" aria-hidden />
      <span className="toggle__label">{dark ? "Paper" : "Ink"}</span>
    </button>
  );
}
