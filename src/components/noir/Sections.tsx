import { ThemeToggle } from "../ThemeToggle";
import { MediaSlot } from "../MediaSlot";
import { Words } from "../Words";
import { Vault } from "./Vault";
import { AwakenButton, SilenceButton } from "./Buttons";

export function Nav() {
  return (
    <header className="nav">
      <a href="#silence" className="nav__brand" aria-label="Noir, back to the top">
        NOIR
      </a>
      <nav className="nav__links" aria-label="Chapters">
        <a href="#discovery">Collection</a>
        <a href="#vault">The Vault</a>
      </nav>
      <ThemeToggle />
    </header>
  );
}

/** I. Silence: a white room and a single breathing drop. */
export function Silence() {
  return (
    <section className="silence" id="silence" data-scene="silence">
      <h1 className="silence__title blend" data-intro>
        Every piece begins as one drop of black.
      </h1>
      <div className="silence__foot blend" data-intro>
        <span>Touch it, or keep scrolling.</span>
        <span className="silence__line" />
      </div>
    </section>
  );
}

/** II. Tension: it notices you. */
export function Tension() {
  const lines = ["This is the whole collection.", "Four objects, one drop of black.", "It moves when you do."];
  return (
    <section className="tension" data-scene="tension">
      {/* sticky boxes isolate blending, so the whole box blends, not each line */}
      <div className="tension__sticky blend">
        {lines.map((l, i) => (
          <p key={l} className="tension__line" data-line={i}>
            {l}
          </p>
        ))}
      </div>
    </section>
  );
}

/** III. Chaos: the letters break, the liquid splits, the world floods. */
export function Chaos() {
  return (
    <section className="chaos" data-scene="chaos">
      <div className="chaos__sticky blend">
        <h2 className="chaos__word" aria-label="Spill">
          {"SPILL".split("").map((c, i) => (
            <span key={i} className="chaos__letter">
              {c}
            </span>
          ))}
        </h2>
      </div>
      {/* a second sticky layer, unblended, so the button keeps its own colours */}
      <div className="chaos__sticky chaos__sticky--ui">
        <div className="chaos__cta" data-chaos-cta>
          <AwakenButton />
        </div>
      </div>
    </section>
  );
}

type Chapter = {
  kind: string;
  /** each name comes from a fact about the piece */
  title: string;
  copy: string;
  specs: [string, string][];
  media: string;
  side: "left" | "right";
};

const CHAPTERS: Chapter[] = [
  {
    kind: "Hypercar",
    title: "Type 12",
    copy: "1,080 horsepower and no chrome anywhere on it. The body is one piece of carbon, so there are no panel gaps to look at. We built twelve. Eleven have owners.",
    specs: [
      ["0 to 100", "2.1 s"],
      ["Power", "1,080 hp"],
      ["Built", "12"],
    ],
    media: "/media/hypercar.mp4",
    side: "left",
  },
  {
    kind: "Watch",
    title: "Calibre 40",
    copy: "The tourbillon sits in a black sapphire case, so from the side the movement looks like it is floating in ink. It drifts about one second every forty years, which is where the name comes from.",
    specs: [
      ["Parts", "1,212"],
      ["Reserve", "120 h"],
      ["Edition", "1 of 1"],
    ],
    media: "/media/horology.mp4",
    side: "right",
  },
  {
    kind: "Ring",
    title: "Thirty-Two",
    copy: "A 32 carat black diamond. Most stones are cut to throw light back at you. This one took 900 hours of cutting to keep it in.",
    specs: [
      ["Stone", "32 ct"],
      ["Cutting", "900 h"],
      ["Setting", "Pt 950"],
    ],
    media: "/media/jewellery.mp4",
    side: "left",
  },
  {
    kind: "Private jet",
    title: "N-14",
    copy: "Fourteen seats and a ceiling that opens onto the night sky instead of side windows. It flies 7,700 nautical miles, far enough that you stop checking the time.",
    specs: [
      ["Range", "7,700 nm"],
      ["Guests", "14"],
      ["Cruise", "Mach 0.92"],
    ],
    media: "/media/travel.mp4",
    side: "right",
  },
];

/** IV. Discovery: the liquid becomes each object. */
export function Discovery() {
  return (
    <section className="discovery" id="discovery">
      <div className="discovery__intro">
        <h2 className="discovery__title blend">
          <Words text="Here is what it turns into." />
        </h2>
      </div>
      {CHAPTERS.map((c, i) => (
        <article
          key={c.kind}
          className={`chapter chapter--${c.side}`}
          data-scene="chapter"
          data-shape={i + 1}
          data-side={c.side}
        >
          <div className="chapter__text">
            <p className="label">{c.kind}</p>
            <h3 className="chapter__title blend">{c.title}</h3>
            <p className="chapter__copy">{c.copy}</p>
            <dl className="chapter__specs">
              {c.specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <a href="#vault" className="chapter__link" data-cursor="Ask">
              Ask to see it
            </a>
          </div>
          <div className="chapter__media">
            <MediaSlot src={c.media} label={`${c.title} film`} />
          </div>
        </article>
      ))}
    </section>
  );
}

/** V. The Vault: hold to open. */
export function VaultSection() {
  return (
    <section className="vault" id="vault" data-scene="vault">
      <h2 className="vault__title blend">The vault opens for one person at a time.</h2>
      <Vault />
    </section>
  );
}

/** VI. Calm. */
export function Calm() {
  return (
    <footer className="calm" data-scene="calm">
      <div className="calm__mark blend" aria-hidden>
        NOIR
      </div>
      <div className="calm__row">
        <p className="calm__tag blend">That was the whole collection.</p>
        <SilenceButton />
      </div>
      <div className="calm__legal">
        <span>© 2026 Maison Noir</span>
        <span>Maison Noir is made up. Nothing here is for sale.</span>
        <a href="#silence">Back to the top</a>
      </div>
    </footer>
  );
}
