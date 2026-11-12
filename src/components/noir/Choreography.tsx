"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { entity, flags, target, type EntityShape } from "@/lib/entity";
import { useTheme } from "../ThemeProvider";

gsap.registerPlugin(ScrollTrigger);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The mood arc: silence → tension → chaos → (the ink floods) → discovery → vault → calm.
 *
 * The liquid's target is resolved PURELY from the scroll position on every
 * scroll tick (see `resolve`), so jumping, link-gliding or scrolling backwards
 * can never leave it in a stale state. GSAP here only animates the type.
 */
export function Choreography() {
  const { toggle } = useTheme();
  // a ref, so changing the theme never rebuilds the scroll timeline
  const toggleRef = useRef(toggle);
  useEffect(() => {
    toggleRef.current = toggle;
  }, [toggle]);

  useEffect(() => {
    const mobile = () => window.matchMedia("(max-width: 900px)").matches;
    const q = <T extends Element>(s: string) => document.querySelector<T>(s);

    const resolve = () => {
      const vh = window.innerHeight;
      const y = window.scrollY;
      const m = mobile();
      const top = (el: Element | null) => (el ? el.getBoundingClientRect().top + y : Infinity);
      const tension = q<HTMLElement>(".tension");
      const chaos = q<HTMLElement>(".chaos");
      const intro = q<HTMLElement>(".discovery__intro");
      const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-scene="chapter"]'));
      const vault = q<HTMLElement>(".vault");
      const calm = q<HTMLElement>(".calm");
      if (!tension || !chaos) return;

      let t: EntityShape;
      const seen = (el: Element | null, at: number) => top(el) <= y + vh * at;

      if (seen(calm, 0.6)) {
        t = { shape: 0, x: 0.5, y: 0.3, size: m ? 0.1 : 0.06, spikes: 0, chaos: 0, reach: 0.5 };
      } else if (seen(vault, 0.55)) {
        t = flags.vaultOpen
          ? { shape: 0, x: 0.5, y: 0.2, size: 0.06, spikes: 0, chaos: 0, reach: 0.4 }
          : { shape: 5, x: 0.5, y: 0.42, size: m ? 0.17 : 0.11, spikes: 0.05 + flags.vaultHold * 0.9, chaos: 0, reach: 0.1 };
      } else if (chapters.some((c) => seen(c, 0.55))) {
        const i = chapters.filter((c) => seen(c, 0.55)).length - 1;
        const el = chapters[i];
        const shape = i + 1;
        t = {
          shape,
          x: m ? 0.5 : el.dataset.side === "left" ? 0.7 : 0.3,
          y: m ? 0.3 : 0.5,
          size: m ? 0.2 : shape === 1 || shape === 4 ? 0.17 : 0.18,
          spikes: 0,
          chaos: 0,
          reach: 0.12,
        };
      } else if (seen(intro, 0.6)) {
        t = { shape: 0, x: 0.5, y: 0.55, size: m ? 0.17 : 0.13, spikes: 0, chaos: 0, reach: 0.25 };
      } else {
        // silence → tension (scrubbed), then chaos (scrubbed) on top of it
        const tp = clamp01((y - (top(tension) - vh)) / tension.offsetHeight);
        const cp = clamp01((y - top(chaos)) / (chaos.offsetHeight - vh));
        const ce = cp * cp; // power2.in: the storm builds, then breaks
        t = {
          shape: 0,
          x: 0.5,
          y: lerp(0.52, 0.5, tp),
          size: lerp(lerp(m ? 0.13 : 0.085, m ? 0.2 : 0.16, tp), m ? 0.22 : 0.17, ce),
          spikes: lerp(lerp(0, 0.55, tp), 0.25, ce),
          chaos: ce,
          reach: lerp(lerp(0.35, 0.9, tp), 0.4, ce),
        };
      }
      t.size *= flags.intro;
      Object.assign(target, t);
    };

    // resolve on every scroll tick, resize, refresh — and once per frame while a hold is in progress
    const onScroll = () => resolve();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    ScrollTrigger.addEventListener("refresh", onScroll);
    const tick = () => resolve();
    gsap.ticker.add(tick);

    const ctx = gsap.context(() => {
      // intro after the loader: the type rises and the drop grows in
      const intro = () => {
        gsap.fromTo("[data-intro]", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.6, ease: "expo.out", stagger: 0.12 });
        gsap.to(flags, { intro: 1, duration: 0.01 });
        entity.pulse = 1;
      };
      if (document.documentElement.classList.contains("is-loading")) window.addEventListener("venom:loaded", intro, { once: true });
      else intro();

      // silence type fades as tension begins
      gsap.to("[data-scene='silence'] [data-intro]", {
        autoAlpha: 0,
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: '[data-scene="tension"]', start: "top bottom", end: "top 40%", scrub: 1 },
      });

      // tension lines, one at a time
      const lines = gsap.utils.toArray<HTMLElement>(".tension__line");
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '[data-scene="tension"]', start: "top top", end: "bottom bottom", scrub: 1 },
      });
      lines.forEach((l, i) => {
        tl.fromTo(l, { autoAlpha: 0, filter: "blur(14px)", y: 30 }, { autoAlpha: 1, filter: "blur(0px)", y: 0, duration: 1 }, i * 2);
        if (i < lines.length - 1) tl.to(l, { autoAlpha: 0, filter: "blur(10px)", y: -30, duration: 1 }, i * 2 + 1.4);
      });

      // chaos: the letters break apart
      const letters = gsap.utils.toArray<HTMLElement>(".chaos__letter");
      gsap
        .timeline({ scrollTrigger: { trigger: '[data-scene="chaos"]', start: "top top", end: "bottom bottom", scrub: 1 } })
        .fromTo(
          letters,
          { x: 0, y: 0, rotate: 0, autoAlpha: 1 },
          {
            x: () => gsap.utils.random(-window.innerWidth * 0.5, window.innerWidth * 0.5),
            y: () => gsap.utils.random(-window.innerHeight * 0.45, window.innerHeight * 0.45),
            rotate: () => gsap.utils.random(-90, 90),
            autoAlpha: 0.15,
            ease: "power2.in",
            duration: 1,
            stagger: 0.02,
          },
          0,
        )
        .fromTo("[data-chaos-cta]", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.7);

      // past the storm: if it is still quiet, the liquid floods the world on its own
      ScrollTrigger.create({
        trigger: '[data-scene="chaos"]',
        start: "bottom 70%",
        onEnter: () => {
          if (document.documentElement.dataset.theme === "light") {
            toggleRef.current({ x: entity.x * window.innerWidth, y: entity.y * window.innerHeight });
          }
        },
      });

      gsap.from(".discovery__title .w__i", {
        yPercent: 110,
        duration: 1.3,
        ease: "expo.out",
        stagger: 0.05,
        scrollTrigger: { trigger: ".discovery__title", start: "top 80%" },
      });

      gsap.utils.toArray<HTMLElement>('[data-scene="chapter"]').forEach((el) => {
        gsap.from(el.querySelectorAll(".label, .chapter__title, .chapter__copy, .chapter__specs > div, .chapter__link"), {
          autoAlpha: 0,
          y: 40,
          duration: 1.3,
          ease: "expo.out",
          stagger: 0.07,
          scrollTrigger: { trigger: el, start: "top 70%" },
        });
      });
    });

    resolve();
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ScrollTrigger.removeEventListener("refresh", onScroll);
      gsap.ticker.remove(tick);
      ctx.revert();
    };
  }, []);

  return null;
}
