import Image from "next/image";
import { CURBIO_URL } from "./links";

/**
 * The Curbio wordmark, linking to curbio.com in the SAME tab — a visitor who
 * taps it has finished with the giveaway page, not paused it. Used in the
 * header, the footer and the Official Rules.
 *
 * The eXp Solutions lockup beside it is deliberately NOT a link: it is a
 * co-brand mark on a page eXp does not run, and a click on it going anywhere
 * would imply an endorsement the Official Rules disclaim.
 */
export function CurbioLogoLink({ className, priority = false }: { className: string; priority?: boolean }) {
  return (
    <a
      href={CURBIO_URL}
      className="flex flex-none rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <Image
        src="/logo/curbio-white.svg"
        alt="Curbio"
        width={500}
        height={130}
        priority={priority}
        unoptimized
        className={`block w-auto ${className}`}
      />
    </a>
  );
}
