"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  DEFAULT_INK,
  EDGE_SHARPNESS,
  inkEase,
  renderInkField,
  thresholdMatrix,
  type InkField,
  type InkSettings,
} from "@/lib/venomInk";

export type Theme = "light" | "dark";

type Ctx = {
  theme: Theme;
  /** flip the theme; the ink pours from `from` (defaults to the nav toggle) */
  toggle: (from?: InkOrigin) => void;
  ink: InkSettings;
  setInk: (s: InkSettings) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("theme", t);
  } catch {}
}

/** centre of the toggle button: where the ink is poured from */
/** where the ink pours from: an element's centre, a point, or the nav toggle */
export type InkOrigin = HTMLElement | { x: number; y: number } | null | undefined;

function toggleOrigin(from?: InkOrigin) {
  if (from && !(from instanceof HTMLElement)) return from;
  const el = from ?? document.querySelector<HTMLElement>("[data-theme-toggle]");
  const r = el?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth - 40, y: 32 };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ink, setInk] = useState<InkSettings>(DEFAULT_INK);
  const busy = useRef(false);
  const field = useRef<(InkField & { key: string }) | null>(null);
  const pending = useRef<Promise<InkField | null> | null>(null);

  const maskRef = useRef<SVGMaskElement>(null);
  const imageRef = useRef<SVGImageElement>(null);
  const matrixRef = useRef<SVGFEColorMatrixElement>(null);

  // pick up the theme the inline boot script already applied
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with pre-hydration theme
    if (t === "dark" || t === "light") setTheme(t);
  }, []);

  /** (re)build the arrival field for the current viewport + toggle position */
  const prepare = useCallback(
    (force = false, from?: InkOrigin) => {
      const o = toggleOrigin(from);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const key = [w, h, Math.round(o.x), Math.round(o.y), JSON.stringify(ink)].join("|");
      if (!force && field.current?.key === key) return Promise.resolve(field.current);
      const job = renderInkField(o.x, o.y, w, h, ink).then((f) => {
        if (!f) return null;
        if (field.current) URL.revokeObjectURL(field.current.url);
        field.current = { ...f, key };
        return f;
      });
      pending.current = job;
      return job;
    },
    [ink],
  );

  // warm the field up front, and whenever layout or settings change
  useEffect(() => {
    const id = setTimeout(() => prepare(), 120);
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => prepare(), 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(id);
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [prepare]);

  const toggle = useCallback(async (from?: InkOrigin) => {
    if (busy.current) return;
    const next: Theme = theme === "light" ? "dark" : "light";
    const commit = () => {
      flushSync(() => setTheme(next));
      applyTheme(next);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      commit();
      return;
    }

    busy.current = true;
    const root = document.documentElement;
    try {
      const f = await prepare(false, from);
      if (!f || !maskRef.current || !imageRef.current || !matrixRef.current) {
        commit();
        return;
      }

      // point the SVG mask at this splash's field, fully hidden to start
      for (const el of [maskRef.current, imageRef.current]) {
        el.setAttribute("width", String(f.width));
        el.setAttribute("height", String(f.height));
      }
      imageRef.current.setAttribute("href", f.url);
      matrixRef.current.setAttribute("values", thresholdMatrix(0));
      root.classList.add("ink-vt");

      const vt = document.startViewTransition(commit);
      await vt.ready;

      // keeps the transition alive for the duration; we drive the mask from its clock
      const clock = root.animate(
        { opacity: [1, 1] },
        { duration: ink.duration, pseudoElement: "::view-transition-new(root)" },
      );
      const end = 1 + 3 / EDGE_SHARPNESS;
      await new Promise<void>((resolve) => {
        const tick = () => {
          const p = Math.min(1, Number(clock.currentTime ?? 0) / ink.duration);
          matrixRef.current?.setAttribute("values", thresholdMatrix(inkEase(p) * end));
          if (p < 1 && clock.playState !== "finished") requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
        clock.finished.then(() => resolve(), () => resolve());
      });
      await vt.finished.catch(() => {});
    } catch {
      // never leave the user stuck in the old theme
      if (root.dataset.theme !== next) commit();
    } finally {
      root.classList.remove("ink-vt");
      busy.current = false;
      prepare(true); // fresh splash pattern for next time
    }
  }, [theme, ink, prepare]);

  return (
    <ThemeCtx.Provider value={{ theme, toggle, ink, setInk }}>
      {children}
      {/* The ink mask: arrival field thresholded at time t. Used by ::view-transition-new(root). */}
      <svg aria-hidden width="0" height="0" style={{ position: "fixed", pointerEvents: "none" }}>
        <defs>
          <filter id="ink-threshold" colorInterpolationFilters="sRGB" x="0" y="0" width="1" height="1">
            <feColorMatrix ref={matrixRef} type="matrix" values={thresholdMatrix(0)} />
          </filter>
          <mask
            ref={maskRef}
            id="ink-mask"
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100"
            height="100"
          >
            <image ref={imageRef} x="0" y="0" width="100" height="100" preserveAspectRatio="none" filter="url(#ink-threshold)" />
          </mask>
        </defs>
      </svg>
    </ThemeCtx.Provider>
  );
}
