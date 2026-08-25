import Image from "next/image";

// The before/after image pair from the deal timeline (.cl-ba) — two labelled
// shots side by side, stacking on mobile.

export function BeforeAfterPair({
  before,
  after,
  caption,
}: {
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  caption?: string;
}) {
  return (
    <figure className="cl-fig">
      <div className="cl-ba">
        <figure>
          <div className="cl-shot" style={{ aspectRatio: "4/3" }}>
            <Image src={before.src} alt={before.alt} fill sizes="(max-width: 640px) 90vw, 28vw" style={{ objectFit: "cover" }} />
          </div>
          <p className="cl-balabel">Before</p>
        </figure>
        <figure>
          <div className="cl-shot" style={{ aspectRatio: "4/3" }}>
            <Image src={after.src} alt={after.alt} fill sizes="(max-width: 640px) 90vw, 28vw" style={{ objectFit: "cover" }} />
          </div>
          <p className="cl-balabel">After</p>
        </figure>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
