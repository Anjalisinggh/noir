"use client";

import { useTheme } from "../ThemeProvider";

/** Floods the world with the ink, from the button itself. */
export function AwakenButton() {
  const { theme, toggle } = useTheme();
  if (theme === "dark") return <p className="chaos__done label">It is awake.</p>;
  return (
    <button type="button" className="pill pill--solid" onClick={(e) => toggle(e.currentTarget)}>
      Let it in
    </button>
  );
}

export function SilenceButton() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" className="pill" onClick={(e) => toggle(e.currentTarget)}>
      {theme === "dark" ? "Return to silence" : "Awaken again"}
    </button>
  );
}
