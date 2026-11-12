"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync. */
export function SmoothScroll() {
  useEffect(() => {
    // the story always begins in silence: never resume mid-scroll on reload
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __st?: typeof ScrollTrigger }).__st = ScrollTrigger;
    lenis.on("scroll", ScrollTrigger.update);
    // nav slides away while reading down, returns on the way up
    const nav = document.querySelector<HTMLElement>(".nav");
    // only an actual change of direction flips it; a pause (direction 0) leaves it as it is
    lenis.on("scroll", (l: Lenis) => {
      if (l.scroll < 240 || l.direction === -1) nav?.classList.remove("is-hidden");
      else if (l.direction === 1) nav?.classList.add("is-hidden");
    });
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // anchor links glide instead of jumping
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href")!;
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { duration: 1.6 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
