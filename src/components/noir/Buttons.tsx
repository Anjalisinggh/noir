"use client";

import { useTheme } from "../ThemeProvider";

/** Floods the world with the ink, from the button itself. */
export function AwakenButton() {
  const { theme, toggle } = useTheme();
  if (theme === "dark") return <p className="chaos__done label">Too late to mop up.</p>;
  return (
    <button type="button" className="pill pill--solid" onClick={(e) => toggle(e.currentTarget)}>
      Spill it
    </button>
  );
}

export function SilenceButton() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" className="pill" onClick={(e) => toggle(e.currentTarget)}>
      {theme === "dark" ? "Back to paper" : "Spill it again"}
    </button>
  );
}
