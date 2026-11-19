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

/**
 * How the ink is drawn:
 * - "svg": Chromium. A View Transition whose new snapshot is masked by an SVG mask, re-thresholded
 *   every frame.
 * - "raster": WebKit (Safari, and every browser on iPhone and iPad). WebKit can't apply an SVG mask
 *   to a View Transition, but it can apply a plain image mask. So the same arrival field is
 *   thresholded ahead of time into a strip of PNG frames, and the transition steps through them.
 *   It is still the real new page being revealed, so text, buttons and colours change with the ink.
 * - "canvas": no View Transitions at all (older phones). The ink is painted on a canvas that
 *   inverts what is under it, then the real theme takes over.
 */
type InkMode = "svg" | "raster" | "canvas";

function inkMode(): InkMode {
  if (!document.startViewTransition) return "canvas";
  const ua = navigator.userAgent;
  const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const safari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/.test(ua);
  return apple || safari ? "raster" : "svg";
}

/** field level by which every pixel has arrived */
const FULL = 1 + 1 / EDGE_SHARPNESS;

async function readField(f: InkField) {
  const img = new Image();
  img.src = f.url;
  await img.decode();
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx, w, h, field: ctx.getImageData(0, 0, w, h).data };
}

/** alpha = how far the ink has reached at field level t (soft edge, like thresholdMatrix) */
function fillAlpha(px: Uint8ClampedArray, field: Uint8ClampedArray, t: number) {
  const S = EDGE_SHARPNESS;
  for (let i = 0; i < px.length; i += 4) {
    const a = S * (t - field[i] / 255);
    px[i + 3] = a <= 0 ? 0 : a >= 1 ? 255 : a * 255;
  }
}

/**
 * Every threshold frame packed into one sprite sheet. WebKit loads an image asynchronously each
 * time a mask's url changes, so swapping urls per frame flickered on iPhone. With one decoded sheet
 * only mask-position moves, which repaints in the same frame.
 */
export type MaskFrames = {
  url: string;
  img: HTMLImageElement;
  count: number;
  cols: number;
  rows: number;
};

const SPRITE_FRAMES = 64;
/** longest side of one frame; the mask is scaled up to the screen and its edge is soft anyway */
const SPRITE_TILE = 420;

async function buildMaskFrames(f: InkField, count = SPRITE_FRAMES): Promise<MaskFrames | null> {
  const r = await readField(f);
  if (!r) return null;
  // shrink the field to the tile size first, then threshold that
  const k = Math.min(1, SPRITE_TILE / Math.max(r.w, r.h));
  const tw = Math.max(16, Math.round(r.w * k));
  const th = Math.max(16, Math.round(r.h * k));
  const small = document.createElement("canvas");
  small.width = tw;
  small.height = th;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  if (!sctx) return null;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(r.canvas, 0, 0, tw, th);
  const field = sctx.getImageData(0, 0, tw, th).data;

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const sheet = document.createElement("canvas");
  sheet.width = cols * tw;
  sheet.height = rows * th;
  const ctx = sheet.getContext("2d");
  if (!ctx) return null;
  const out = ctx.createImageData(tw, th);
  out.data.fill(255);
  for (let i = 0; i < count; i++) {
    fillAlpha(out.data, field, (i / (count - 1)) * FULL);
    ctx.putImageData(out, (i % cols) * tw, Math.floor(i / cols) * th);
  }
  const blob = await new Promise<Blob | null>((res) => sheet.toBlob(res, "image/png"));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
  return { url, img, count, cols, rows };
}

function freeFrames(m: MaskFrames | null | undefined) {
  if (m) URL.revokeObjectURL(m.url);
}

/**
 * Old browsers only: pour the ink on a full-screen canvas. The canvas is white and blends with
 * "difference", so wherever the ink has reached the page is shown inverted (background and text
 * flip together, nothing goes blank). The two themes are near inverses, so once the ink covers
 * everything the real theme is switched in and the canvas removed in the same frame.
 */
async function pourOverlay(f: InkField, duration: number, commit: () => void) {
  const r = await readField(f);
  if (!r) return commit();
  const { canvas, ctx } = r;
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed", inset: "0", width: "100%", height: "100%", zIndex: "2147483646",
    pointerEvents: "none", mixBlendMode: "difference",
  } satisfies Partial<CSSStyleDeclaration>);
  const out = ctx.createImageData(r.w, r.h);
  const px = out.data;
  px.fill(255);
  for (let i = 3; i < px.length; i += 4) px[i] = 0;
  ctx.putImageData(out, 0, 0);
  document.body.appendChild(canvas);

  const end = 1 + 3 / EDGE_SHARPNESS;
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const t = inkEase(p) * end;
      fillAlpha(px, r.field, t);
      ctx.putImageData(out, 0, 0);
      if (p < 1 && t < FULL) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
  commit();
  canvas.remove();
}

/** WebKit: a real View Transition, its new snapshot masked by one tile of the sprite sheet */
async function rasterTransition(m: MaskFrames, duration: number, commit: () => void) {
  const root = document.documentElement;
  // static part: the sheet, scaled so one tile covers the snapshot (percentages follow the
  // snapshot's real size, which on iPhone can be taller than innerHeight)
  const sheet = document.createElement("style");
  const base = `url("${m.url}") no-repeat`;
  const size = `${m.cols * 100}% ${m.rows * 100}%`;
  sheet.textContent =
    `html.ink-raster::view-transition-new(root){` +
    `-webkit-mask:${base};mask:${base};-webkit-mask-size:${size};mask-size:${size};}`;
  // moving part: which tile shows. Only the position changes, never the image.
  const style = document.createElement("style");
  const pct = (n: number, of: number) => (of > 1 ? (n / (of - 1)) * 100 : 0);
  const show = (i: number) => {
    if (i === m.count - 1) {
      // fully covered: drop the mask so no seam can show at the edges
      style.textContent = `html.ink-raster::view-transition-new(root){-webkit-mask:none;mask:none;}`;
      return;
    }
    const pos = `${pct(i % m.cols, m.cols)}% ${pct(Math.floor(i / m.cols), m.rows)}%`;
    style.textContent = `html.ink-raster::view-transition-new(root){-webkit-mask-position:${pos};mask-position:${pos};}`;
  };
  document.head.appendChild(sheet);
  show(0);
  document.head.appendChild(style);
  root.classList.add("ink-raster");
  try {
    const vt = document.startViewTransition(commit);
    await vt.ready;
    const clock = root.animate(
      { opacity: [1, 1] },
      { duration, pseudoElement: "::view-transition-new(root)" },
    );
    const end = 1 + 3 / EDGE_SHARPNESS;
    const last = m.count - 1;
    let shown = 0;
    await new Promise<void>((resolve) => {
      const tick = () => {
        const p = Math.min(1, Number(clock.currentTime ?? 0) / duration);
        const i = Math.min(last, Math.round(((inkEase(p) * end) / FULL) * last));
        if (i !== shown) show((shown = i));
        if (i === last) {
          clock.finish();
          resolve();
        } else if (clock.playState !== "finished") requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
      clock.finished.then(() => resolve(), () => resolve());
    });
    await vt.finished.catch(() => {});
  } finally {
    root.classList.remove("ink-raster");
    style.remove();
    sheet.remove();
  }
}

type Field = InkField & { key: string; frames: MaskFrames | null };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ink, setInk] = useState<InkSettings>(DEFAULT_INK);
  const busy = useRef(false);
  const field = useRef<Field | null>(null);
  const pending = useRef<{ key: string; job: Promise<Field | null> } | null>(null);

  const maskRef = useRef<SVGMaskElement>(null);
  const imageRef = useRef<SVGImageElement>(null);
  const matrixRef = useRef<SVGFEColorMatrixElement>(null);

  // pick up the theme the inline boot script already applied
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with pre-hydration theme
    if (t === "dark" || t === "light") setTheme(t);
  }, []);

  /** (re)build the arrival field (and on WebKit its mask frames) for the viewport + origin */
  const prepare = useCallback(
    (force = false, from?: InkOrigin): Promise<Field | null> => {
      const o = toggleOrigin(from);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const key = [w, h, Math.round(o.x), Math.round(o.y), JSON.stringify(ink)].join("|");
      if (!force && field.current?.key === key) return Promise.resolve(field.current);
      if (!force && pending.current?.key === key) return pending.current.job;
      const job = renderInkField(o.x, o.y, w, h, ink).then(async (f) => {
        if (!f) return null;
        const frames = inkMode() === "raster" ? await buildMaskFrames(f) : null;
        if (field.current) {
          URL.revokeObjectURL(field.current.url);
          freeFrames(field.current.frames);
        }
        field.current = { ...f, key, frames };
        return field.current;
      });
      pending.current = { key, job };
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
    if (reduced) {
      commit();
      return;
    }

    busy.current = true;
    const root = document.documentElement;

    const mode = inkMode();
    if (mode !== "svg") {
      try {
        const f = await prepare(false, from);
        if (f && mode === "raster" && f.frames) await rasterTransition(f.frames, ink.duration, commit);
        else if (f && mode === "canvas") await pourOverlay(f, ink.duration, commit);
        else commit();
      } catch {
        if (root.dataset.theme !== next) commit();
      } finally {
        busy.current = false;
        prepare(true);
      }
      return;
    }

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
