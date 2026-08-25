import Image from "next/image";

// "By address, not by adjective" — one featured sold listing bleeding to the
// right page edge, then a staggered gallery of four more. All photos are real
// sold-listing shots that already live under public/sold/.

const GALLERY = [
  {
    src: "/sold/washington-dc/1217DStreetNE_CapitolHill.jpeg",
    addr: "1217 D Street NE · Capitol Hill",
    sold: "Sold $996,500",
    height: 420,
    mod: "",
  },
  {
    src: "/sold/atlanta/680Smithstone_Marietta.webp",
    addr: "680 Smithstone · Marietta",
    sold: "Sold $365,000",
    height: 300,
    mod: " c-work-fig--2",
  },
  {
    src: "/sold/dallas/2913TrophyDrive_Plano.jpeg",
    addr: "2913 Trophy Drive · Plano",
    sold: "Sold $592,000",
    height: 360,
    mod: " c-work-fig--3",
  },
  {
    src: "/sold/northern-virginia/43170ParkersRidge_Leesburg.webp",
    addr: "43170 Parkers Ridge · Leesburg",
    sold: "Sold $1,225,000",
    height: 320,
    mod: " c-work-fig--4",
  },
];

export function OurWork() {
  return (
    <section className="c-sect--work-gallery">
      <div className="c-container">
        <h2 className="c-h2 c-work-h2">By address, not by adjective.</h2>
      </div>
      <div className="c-work-feature">
        <div className="c-work-featcopy">
          <h3 className="c-work-addr">8250 Buckspark</h3>
          <p className="c-work-sold">Potomac, MD — sold $1,610,000</p>
          <p className="c-work-desc">
            Whole-home refresh: paint, floors, kitchen, bath, landscaping. One walkthrough, invoiced at settlement.
          </p>
          {/* v2: the "[placeholder — archive photo]" before-box is cut per the
              no-placeholder rule; it returns when the archive photo exists. */}
        </div>
        <div className="c-work-featimg">
          <Image
            src="/sold/baltimore/8250Buckspark_Potomac.jpg"
            alt="8250 Buckspark, Potomac, Maryland — after Curbio's pre-listing refresh"
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>
      <div className="c-container c-work-gallery">
        {GALLERY.map((g) => (
          <figure key={g.addr} className={`c-work-fig${g.mod}`}>
            <div className="c-work-figimg" style={{ height: g.height }}>
              <Image
                src={g.src}
                alt={g.addr}
                fill
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
                style={{ objectFit: "cover" }}
              />
            </div>
            <figcaption>
              {g.addr}
              <br />
              <span>{g.sold}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="c-container c-work-all">
        <span className="c-ulink" style={{ fontSize: 16, fontWeight: 600 }}>
          All projects →
        </span>
      </div>
    </section>
  );
}
