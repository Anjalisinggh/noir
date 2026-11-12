# NOIR — Luxury, Awakened

A cinematic concept site for a fictional ultra-luxury maison, led by a living black liquid.

The page begins in silence — a white room and a single breathing drop — and moves through
**tension → chaos → discovery → calm**. When the world awakens, a venom-like ink floods the
page from the point you touched, turning it dark. The liquid then becomes each object in the
collection: a hypercar, a watch, a ring, a private jet and, finally, the vault.

## Highlights

- **Living liquid** — a real-time raymarched WebGL entity (wet obsidian by day, black chrome
  with a red rim by night) that reaches for the cursor, grows ferrofluid needles, boils into
  droplets and morphs between shapes.
- **Venom ink transition** — the light / dark switch uses the View Transitions API with a
  GPU-generated, domain-warped "arrival" field as an SVG mask, so the new theme spreads like
  ink in water.
- **Scroll-resolved choreography** — the liquid's state is computed purely from scroll
  position, so jumps, links and reverse scrolling never leave it stale.
- **The Vault** — press and hold to open.
- Smooth scrolling (Lenis), GSAP ScrollTrigger, a gooey liquid cursor and film grain.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Optional films

Drop clips into `public/media/` and they appear in their chapter automatically:
`hypercar.mp4`, `horology.mp4`, `jewellery.mp4`, `travel.mp4`.

## Stack

Next.js · React · TypeScript · WebGL (GLSL) · GSAP · Lenis

NOIR is fictional; all names, products and figures are invented.
