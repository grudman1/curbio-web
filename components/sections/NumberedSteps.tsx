import Image from "next/image";

// The numbered-step language from the homepage's how-it-works section,
// reusable in two layouts:
//
//   StepGrid  the homepage's 3-across photo grid (.c-how-grid) — for exactly
//             three steps with photography.
//   StepList  a vertical numbered rail (.c-steps) — for longer narratives
//             (the full how-it-works page runs seven beats, which cannot
//             share a 3-across grid without a ragged last row).
//
// Both reuse the same typography classes (.c-how-num / -title / -line).

export type Step = {
  num: string;
  title: string;
  line: React.ReactNode;
  src?: string;
  alt?: string;
};

export function StepGrid({ steps }: { steps: Step[] }) {
  return (
    <div className="c-how-grid">
      {steps.map((s) => (
        <div key={s.num} className="c-how-step">
          {s.src && (
            <div className="c-how-img">
              <Image
                src={s.src}
                alt={s.alt ?? ""}
                fill
                sizes="(max-width: 640px) 90vw, 30vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          )}
          <p className="c-how-num">{s.num}</p>
          <h3 className="c-how-title">{s.title}</h3>
          <p className="c-how-line">{s.line}</p>
        </div>
      ))}
    </div>
  );
}

export function StepList({ steps }: { steps: Step[] }) {
  return (
    <div className="c-steps">
      {steps.map((s) => (
        <div key={s.num} className="c-step">
          <p className="c-how-num">{s.num}</p>
          <div>
            <h3 className="c-how-title">{s.title}</h3>
            <p className="c-how-line">{s.line}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
