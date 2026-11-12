import { ThemeToggle } from "../ThemeToggle";
import { MediaSlot } from "../MediaSlot";
import { Words } from "../Words";
import { Vault } from "./Vault";
import { AwakenButton, SilenceButton } from "./Buttons";

export function Nav() {
  return (
    <header className="nav">
      <a href="#silence" className="nav__brand" aria-label="NOIR — top">
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

/** I. Silence — a white room and a single breathing drop. */
export function Silence() {
  return (
    <section className="silence" id="silence" data-scene="silence">
      <p className="silence__kicker blend" data-intro>
        Maison NOIR — Est. nowhere
      </p>
      <h1 className="silence__title blend" data-intro>
        Luxury, <em>Awakened.</em>
      </h1>
      <div className="silence__foot blend" data-intro>
        <span>Touch it — or keep scrolling</span>
        <span className="silence__line" />
        <span>Sound off · Lights low</span>
      </div>
    </section>
  );
}

/** II. Tension — it notices you. */
export function Tension() {
  const lines = ["It has been waiting.", "Quiet things are rarely calm.", "Come closer."];
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

/** III. Chaos — the letters break, the liquid splits, the world floods. */
export function Chaos() {
  return (
    <section className="chaos" data-scene="chaos">
      <div className="chaos__sticky blend">
        <h2 className="chaos__word" aria-label="Awaken">
          {"AWAKEN".split("").map((c, i) => (
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
  n: string;
  kind: string;
  title: string;
  titleEm: string;
  copy: string;
  specs: [string, string][];
  media: string;
  side: "left" | "right";
};

const CHAPTERS: Chapter[] = [
  {
    n: "I",
    kind: "Hypercar",
    title: "Veloce",
    titleEm: "Noir",
    copy: "One thousand and eighty horses, poured into a single uninterrupted line of liquid carbon. Twelve exist. Eleven are spoken for.",
    specs: [
      ["0–100", "2.1 s"],
      ["Power", "1,080 hp"],
      ["Built", "12"],
    ],
    media: "/media/hypercar.mp4",
    side: "left",
  },
  {
    n: "II",
    kind: "Horology",
    title: "Calibre",
    titleEm: "Abyss",
    copy: "A tourbillon suspended in black sapphire, so the movement seems to float in ink. It loses one second every forty years.",
    specs: [
      ["Parts", "1,212"],
      ["Reserve", "120 h"],
      ["Edition", "1 of 1"],
    ],
    media: "/media/horology.mp4",
    side: "right",
  },
  {
    n: "III",
    kind: "Jewellery",
    title: "Obsidian",
    titleEm: "Heart",
    copy: "A thirty-two carat black diamond, cut for nine hundred hours to swallow light rather than return it.",
    specs: [
      ["Stone", "32 ct"],
      ["Cutting", "900 h"],
      ["Setting", "Pt 950"],
    ],
    media: "/media/jewellery.mp4",
    side: "left",
  },
  {
    n: "IV",
    kind: "Private Travel",
    title: "Nocturne",
    titleEm: "Air",
    copy: "No windows face the city — only the stars, and the dark between them. Fourteen guests, one crossing, no schedule.",
    specs: [
      ["Range", "7,700 nm"],
      ["Guests", "14"],
      ["Cruise", "Mach 0.92"],
    ],
    media: "/media/travel.mp4",
    side: "right",
  },
];

/** IV. Discovery — the liquid becomes each object. */
export function Discovery() {
  return (
    <section className="discovery" id="discovery">
      <div className="discovery__intro">
        <p className="label">IV — Discovery</p>
        <h2 className="discovery__title blend">
          <Words text="It becomes whatever you desire." />
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
            <p className="label">
              <span className="chapter__n">{c.n}</span> {c.kind}
            </p>
            <h3 className="chapter__title blend">
              {c.title} <em>{c.titleEm}</em>
            </h3>
            <p className="chapter__copy">{c.copy}</p>
            <dl className="chapter__specs">
              {c.specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <a href="#vault" className="chapter__link" data-cursor="Enquire">
              Request a private viewing <span aria-hidden>→</span>
            </a>
          </div>
          <div className="chapter__media">
            <MediaSlot src={c.media} label={`${c.title} ${c.titleEm} film`} />
          </div>
        </article>
      ))}
    </section>
  );
}

/** V. The Vault — hold to open. */
export function VaultSection() {
  return (
    <section className="vault" id="vault" data-scene="vault">
      <p className="label">V — The Vault</p>
      <h2 className="vault__title blend">
        Some things are not for sale.
        <br />
        <em>They are for you.</em>
      </h2>
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
        <p className="calm__tag blend">
          Luxury, <em>Awakened.</em>
        </p>
        <SilenceButton />
      </div>
      <div className="calm__legal">
        <span>© 2026 Maison NOIR</span>
        <span>A fictional maison — concept experience</span>
        <a href="#silence">Back to the beginning ↑</a>
      </div>
    </footer>
  );
}
