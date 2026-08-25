import Image from "next/image";

// "Seven markets. A manager in each." — market list plus the four Home
// Services Managers. Headshots already live under public/hsm/.

const MARKETS = [
  { name: "Atlanta", state: "GA" },
  { name: "Washington", state: "DC" },
  { name: "Dallas", state: "TX" },
  { name: "Maryland", state: "MD" },
  { name: "Los Angeles", state: "CA" },
  { name: "Northern Virginia", state: "VA" },
  { name: "Riverside", state: "CA" },
];

const HSMS = [
  { src: "/hsm/christine-harvey.jpg", name: "Christine Harvey", area: "Atlanta" },
  { src: "/hsm/joshua-collins.jpg", name: "Joshua Collins", area: "DC · Maryland · NoVA" },
  { src: "/hsm/miguel-picart.jpg", name: "Miguel Picart", area: "Dallas" },
  { src: "/hsm/trevor-laramee.jpg", name: "Trevor Laramee", area: "Los Angeles · Riverside" },
];

export function MarketsManagers() {
  return (
    <section className="c-sect--markets">
      <div className="c-container c-mkt-grid">
        <div>
          <h2 className="c-h2">
            Seven markets.
            <br />A manager in each.
          </h2>
          <div>
            {MARKETS.map((m) => (
              <div key={m.name} className="c-mkt-row">
                <span className="c-mkt-name">{m.name}</span>
                <span className="c-mkt-state">{m.state}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="c-mkt-people">
          <div className="c-mkt-hsms">
            {HSMS.map((h) => (
              <figure key={h.name}>
                <Image
                  src={h.src}
                  alt={h.name}
                  width={96}
                  height={96}
                  style={{ objectFit: "cover", objectPosition: "center top", display: "block" }}
                />
                <figcaption>
                  <span className="c-mkt-hsm-name">{h.name}</span>
                  <span className="c-mkt-hsm-area">{h.area}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="c-mkt-note">
            Your ZIP routes to one of these four people. Not a call center.
          </p>
        </div>
      </div>
    </section>
  );
}
