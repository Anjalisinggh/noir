"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { entity, flags } from "@/lib/entity";

const HOLD_MS = 1800;

/** Press and hold to open. The liquid strains, then bursts and the invitation appears. */
export function Vault() {
  const [open, setOpen] = useState(false);
  const ring = useRef<SVGCircleElement>(null);
  const holding = useRef<gsap.core.Tween | null>(null);
  const prog = useRef({ v: 0 });

  const draw = () => {
    const c = ring.current;
    if (!c) return;
    const len = 2 * Math.PI * 46;
    c.style.strokeDasharray = `${len}`;
    c.style.strokeDashoffset = `${len * (1 - prog.current.v)}`;
    flags.vaultHold = prog.current.v; // the scroll resolver turns this into spikes
  };

  const start = () => {
    if (open) return;
    holding.current?.kill();
    holding.current = gsap.to(prog.current, {
      v: 1,
      duration: (HOLD_MS / 1000) * (1 - prog.current.v),
      ease: "none",
      onUpdate: draw,
      onComplete: () => {
        setOpen(true);
        flags.vaultOpen = true;
        flags.vaultHold = 0;
        // a burst on the drawn state; it settles back toward the resolved target by itself
        entity.pulse = 1;
        entity.chaos = 1;
      },
    });
  };
  const stop = () => {
    if (open) return;
    holding.current?.kill();
    holding.current = gsap.to(prog.current, { v: 0, duration: 0.5, ease: "power2.out", onUpdate: draw });
  };

  useEffect(() => () => void holding.current?.kill(), []);

  if (open) {
    return (
      <div className="invite" role="status">
        <p className="label">Invitation № 0001</p>
        <p className="invite__title">You are on the list.</p>
        <p className="invite__copy">
          A private viewing of all four pieces, for one evening only. The location is revealed twenty-four hours
          before. Dress for the dark.
        </p>
        <p className="invite__code">NOIR · 0001 · ∞</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="hold"
      data-cursor="Hold"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && start()}
      onKeyUp={stop}
      aria-label="Press and hold to open the vault"
    >
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="46" className="hold__track" />
        <circle ref={ring} cx="50" cy="50" r="46" className="hold__ring" />
      </svg>
      <span>Hold to open</span>
    </button>
  );
}
