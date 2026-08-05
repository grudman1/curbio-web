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
    <section className="dp-sect--markets">
      <div className="dp-container dp-mkt-grid">
        <div>
          <h2 className="dp-h2">
            Seven markets.
            <br />A manager in each.
          </h2>
          <div>
            {MARKETS.map((m) => (
              <div key={m.name} className="dp-mkt-row">
                <span className="dp-mkt-name">{m.name}</span>
                <span className="dp-mkt-state">{m.state}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dp-mkt-people">
          <div className="dp-mkt-hsms">
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
                  <span className="dp-mkt-hsm-name">{h.name}</span>
                  <span className="dp-mkt-hsm-area">{h.area}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="dp-mkt-note">
            Your ZIP routes to one of these four people — a Home Services Manager who walks the
            property, scopes the work, and answers their own phone. Not a call center.
          </p>
        </div>
      </div>
    </section>
  );
}
