// Footer. Column entries are inert <p>s, not links — the destinations don't
// exist yet and nothing on this page may enter the site nav or sitemap.

const COLUMNS: { head: string; items: string[] }[] = [
  {
    head: "Company",
    items: ["About", "Careers", "News", "Press kit", "Awards", "Contact"],
  },
  {
    head: "Resources",
    items: ["On the Curb", "Webinars", "App", "Reviews", "Agent spotlights"],
  },
  {
    head: "Work with us",
    items: ["Agents", "Brokerages", "Trade partners", "Markets"],
  },
];

export function HomeFooter() {
  return (
    <footer data-dark="true" className="dp-foot">
      <div className="dp-container dp-foot-grid">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/curbio-white.svg" alt="Curbio" style={{ height: 24, display: "block" }} />
          <p className="dp-foot-tag">
            Pre-listing renovation for real estate agents. Paid at closing.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.head}>
            <p className="dp-foot-h">{col.head}</p>
            {col.items.map((item) => (
              <p key={item} className="dp-foot-link">
                {item}
              </p>
            ))}
          </div>
        ))}
      </div>
      <div className="dp-container dp-foot-bar">
        <span>© 2026 Curbio, Inc.</span>
        <span>Privacy Policy</span>
        <span>Terms</span>
        <span>Privacy request</span>
        <span className="dp-foot-stamp">DESIGN PREVIEW — NOT LINKED, NOT INDEXED</span>
      </div>
    </footer>
  );
}
