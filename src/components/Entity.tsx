"use client";

import { useEffect, useRef } from "react";
import { entity, entityScreen, settle, target, flags } from "@/lib/entity";
import { ENTITY_FRAG, ENTITY_VERT } from "@/lib/entityShader";
import { useTheme } from "./ThemeProvider";

/**
 * The living liquid: a fixed full-screen WebGL canvas behind the content.
 * Touching it while the world is quiet awakens NOIR (the venom ink pours from
 * the touch point); touching it after dark makes it flinch.
 */
export function Entity() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { theme, toggle } = useTheme();
  const themeRef = useRef(theme);
  const toggleRef = useRef(toggle);

  useEffect(() => {
    themeRef.current = theme;
    toggleRef.current = toggle;
  }, [theme, toggle]);

  useEffect(() => {
    // dev-only hook so scroll tests can read the liquid's live state
    if (process.env.NODE_ENV !== "production") (window as unknown as { __noir?: object }).__noir = { entity, target, flags };
    const c = canvas.current!;
    const gl = c.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, ENTITY_VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, ENTITY_FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      res: U("uRes"),
      k: U("uK"),
      time: U("uTime"),
      pos: U("uPos"),
      scale: U("uScale"),
      mouse: U("uMouse"),
      shape: U("uShape"),
      spikes: U("uSpikes"),
      chaos: U("uChaos"),
      reach: U("uReach"),
      dark: U("uDark"),
      pulse: U("uPulse"),
    };

    // render below device resolution: the liquid is soft by nature
    let k = 1;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      k = Math.min(dpr * 0.75, 1400 / window.innerWidth);
      c.width = Math.round(window.innerWidth * k);
      c.height = Math.round(window.innerHeight * k);
      gl.viewport(0, 0, c.width, c.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // cursor, smoothed so the tendril has weight
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight * 2, tx: window.innerWidth / 2, ty: window.innerHeight * 2 };
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      const s = entityScreen();
      const over = Math.hypot(e.clientX - s.x, e.clientY - s.y) < s.r * 1.15;
      document.documentElement.classList.toggle("entity-hover", over);
    };
    const onLeave = () => {
      mouse.ty = window.innerHeight * 3;
    };
    const onClick = (e: MouseEvent) => {
      const s = entityScreen();
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > s.r * 1.15) return;
      entity.pulse = 1;
      if (themeRef.current === "light") toggleRef.current({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("click", onClick);

    let raf = 0;
    let dark = document.documentElement.dataset.theme === "dark" ? 1 : 0;
    const t0 = performance.now();
    let last = t0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 5);
      mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 5);
      const targetDark = document.documentElement.dataset.theme === "dark" ? 1 : 0;
      dark += (targetDark - dark) * Math.min(1, dt * 6);
      settle(dt);

      const s = entityScreen();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.res, c.width, c.height);
      gl.uniform1f(u.k, k);
      gl.uniform1f(u.time, (now - t0) / 1000);
      gl.uniform2f(u.pos, s.x, s.y);
      gl.uniform1f(u.scale, s.r);
      gl.uniform2f(u.mouse, mouse.x, mouse.y);
      gl.uniform1f(u.shape, entity.shape);
      gl.uniform1f(u.spikes, entity.spikes);
      gl.uniform1f(u.chaos, entity.chaos);
      gl.uniform1f(u.reach, entity.reach);
      gl.uniform1f(u.dark, dark);
      gl.uniform1f(u.pulse, entity.pulse);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return <canvas ref={canvas} className="entity" aria-hidden />;
}
