"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/** Counter 000 to 100 with the wordmark rising, then the curtain lifts. */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("is-loading");
    const finish = () => {
      document.documentElement.classList.remove("is-loading");
      window.dispatchEvent(new Event("venom:loaded"));
      setDone(true);
    };
    if (reduced) {
      finish();
      return;
    }

    const counter = { v: 0 };
    const tl = gsap.timeline({ onComplete: finish });
    tl.from(".preloader__letter", { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.06 }, 0.1)
      .to(
        counter,
        {
          v: 100,
          duration: 1.8,
          ease: "power2.inOut",
          onUpdate: () => {
            if (count.current) count.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
          },
        },
        0,
      )
      .to(".preloader__line", { scaleX: 1, duration: 1.8, ease: "power2.inOut" }, 0)
      .to(".preloader__letter", { yPercent: -110, duration: 0.7, ease: "expo.in", stagger: 0.04 }, 2.0)
      .to(root.current, { yPercent: -100, duration: 1.1, ease: "expo.inOut" }, 2.5);
    return () => {
      tl.kill();
    };
  }, []);

  if (done) return null;
  return (
    <div ref={root} className="preloader" aria-hidden>
      <div className="preloader__mark">
        {"NOIR".split("").map((c, i) => (
          <span key={i} className="preloader__mask">
            <span className="preloader__letter">{c}</span>
          </span>
        ))}
      </div>
      <div className="preloader__foot">
        <span>Maison Noir</span>
        <span ref={count} className="preloader__count">
          000
        </span>
      </div>
      <div className="preloader__line" />
    </div>
  );
}
