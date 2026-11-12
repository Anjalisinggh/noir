"use client";

import { useEffect, useRef, useState } from "react";

const N = 7;

/**
 * A gooey droplet cursor: a chain of circles that follow each other, melted
 * together by an SVG threshold filter. It inverts against whatever is below.
 * Hovering [data-cursor] shows a label; hovering the entity swells the drop.
 */
export function LiquidCursor() {
  const blobs = useRef<(SVGCircleElement | null)[]>([]);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection on mount
    setEnabled(fine);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-cursor");
    const pts = Array.from({ length: N }, () => ({ x: -100, y: -100 }));
    const target = { x: -100, y: -100 };
    let size = 9;
    let targetSize = 9;
    let label = "";

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor], a, button");
      const l = el?.dataset.cursor ?? "";
      const overEntity = document.documentElement.classList.contains("entity-hover");
      targetSize = overEntity ? 34 : l ? 46 : el ? 20 : 9;
      const nextLabel = overEntity ? (document.documentElement.dataset.theme === "light" ? "Touch" : "") : l;
      if (nextLabel !== label && labelRef.current) {
        label = nextLabel;
        labelRef.current.textContent = label;
        labelRef.current.classList.toggle("is-on", !!label);
      }
    };
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    const tick = () => {
      size += (targetSize - size) * 0.18;
      pts.forEach((p, i) => {
        const lead = i === 0 ? target : pts[i - 1];
        const k = i === 0 ? 0.35 : 0.42;
        p.x += (lead.x - p.x) * k;
        p.y += (lead.y - p.y) * k;
        const c = blobs.current[i];
        if (c) {
          c.setAttribute("cx", p.x.toFixed(1));
          c.setAttribute("cy", p.y.toFixed(1));
          c.setAttribute("r", (size * (1 - i / (N + 2))).toFixed(1));
        }
      });
      if (labelRef.current) labelRef.current.style.transform = `translate(${pts[0].x}px, ${pts[0].y}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="lcursor" aria-hidden>
      <svg width="100%" height="100%">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
          </filter>
        </defs>
        <g filter="url(#goo)" fill="#fff">
          {Array.from({ length: N }, (_, i) => (
            <circle key={i} ref={(el) => void (blobs.current[i] = el)} cx={-100} cy={-100} r={8} />
          ))}
        </g>
      </svg>
      <span ref={labelRef} className="lcursor__label" />
    </div>
  );
}
