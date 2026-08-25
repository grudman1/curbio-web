"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Mobile-only sticky CTA.
//
// Appears once the reader is past the opening screen rather than immediately:
// a button that covers content before anyone has read a word is an
// interstitial, not an affordance. Hides again over the page's own closer, so
// it never sits on top of the same CTA it duplicates.

export function StickyCta({
  href,
  label,
  /** Selector for the section this must not overlap — usually the closer. */
  hideOver = ".c-closer",
}: {
  href: string;
  label: string;
  hideOver?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    const closer = document.querySelector(hideOver);

    const measure = () => {
      frame = 0;
      const past = window.scrollY > window.innerHeight * 0.6;
      const overCloser = closer
        ? closer.getBoundingClientRect().top < window.innerHeight
        : false;
      setShow(past && !overCloser);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [hideOver]);

  return (
    <div className={`c-stickycta${show ? " is-shown" : ""}`} aria-hidden={!show}>
      <Link className="c-cta" href={href} tabIndex={show ? undefined : -1}>
        {label}
      </Link>
    </div>
  );
}
