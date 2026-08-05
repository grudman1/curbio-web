import Image from "next/image";

// How it works — three steps, three words each, three images. This replaces
// the removed editorial paragraph; no prose block anywhere on the page.
// Photos are real project photography already in the library.

const STEPS = [
  {
    num: "01",
    title: "Walk the house",
    src: "/sold/northern-virginia/9420BianJac_GreatFalls.jpg",
    alt: "A Curbio-prepped listing at the walkthrough stage",
  },
  {
    num: "02",
    title: "Crews handle everything",
    src: "/home/how/caminito-herminia-kitchen.jpg",
    alt: "A kitchen renovated by Curbio crews — 5412 Caminito Herminia",
  },
  {
    num: "03",
    title: "Paid at closing",
    src: "/home/deal/395-meeting-st-after-dusk.jpg",
    alt: "A finished Curbio listing at dusk, sold",
  },
];

export function HowItWorks() {
  return (
    <section className="dp-sect" id="how-it-works">
      <div className="dp-container">
        <h2 className="dp-h2" style={{ maxWidth: "14em" }}>
          How it works.
        </h2>
        <div className="dp-how-grid">
          {STEPS.map((s) => (
            <div key={s.num} className="dp-how-step">
              <div className="dp-how-img">
                <Image src={s.src} alt={s.alt} fill sizes="(max-width: 640px) 90vw, 30vw" style={{ objectFit: "cover" }} />
              </div>
              <p className="dp-how-num">{s.num}</p>
              <h3 className="dp-how-title">{s.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
