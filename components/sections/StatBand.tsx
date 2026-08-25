import { CountUp } from "./CountUp";

// The three-up stat band — its own section, on white.
//
// These cards used to be tacked onto the bottom of the agent-video section
// (MoveInStats), where they read as a footnote to the clip rather than as the
// argument they are. Pulled out (Gavin, Aug 25) so the numbers get their own
// ground and their own rhythm.
//
// Figures dial up from 0 on scroll — see CountUp.

export type Stat = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: React.ReactNode;
};

export function StatBand({
  stats,
  footnote,
  label,
  id,
}: {
  stats: Stat[];
  /** Fine print under the cards — sourcing, caveats. */
  footnote?: React.ReactNode;
  /** Accessible name for the section, since it carries no heading. */
  label: string;
  id?: string;
}) {
  return (
    <section id={id} className="c-sect c-sect--white" aria-label={label}>
      <div className="c-container">
        <div className="cs-grid cs-grid--band">
          {stats.map((s, i) => (
            <div key={i} className="cs-card">
              <p className="cs-num">
                <CountUp
                  value={s.value}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  decimals={s.decimals}
                />
              </p>
              <p className="cs-label">{s.label}</p>
            </div>
          ))}
        </div>
        {footnote && <p className="cs-foot">{footnote}</p>}
      </div>
    </section>
  );
}
