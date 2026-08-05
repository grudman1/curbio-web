"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// The hero's media rectangle: the kitchen-transformation video.
//
// Behavior (per the written revisions):
//   • autoplay muted, playsinline, NO loop — plays once and holds the final
//     ("after") frame
//   • holds the "before" state ~1s before motion starts (done here in the
//     player, not baked into the file, so the encode stays clean)
//   • no controls, no sound; poster is the before frame
//   • prefers-reduced-motion → static before/after side-by-side
//   • ?hero=static forces the same static variant — the A/B alternate
//
// LCP: the poster renders as a priority next/image UNDER the video element,
// so the largest paint is an optimized image that arrives with the HTML; the
// video (preload=metadata) fills in over it and never gates first paint.
export function HeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [variant, setVariant] = useState<"video" | "static">("video");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forced = new URLSearchParams(window.location.search).get("hero") === "static";
    if (reduced || forced) {
      setVariant("static");
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    // Hold the "before" state ~1s, then run once and freeze on the last
    // frame. Browsers pause muted video in hidden pages (and may refuse the
    // play() outright) — in both cases the poster/before frame simply stays,
    // and the visibilitychange listener starts the run when the page is
    // actually being looked at.
    const start = () => {
      if (v.ended) return;
      v.play().catch(() => {
        /* autoplay refused → the before frame stays */
      });
    };
    const t = window.setTimeout(() => {
      if (document.visibilityState === "visible") start();
    }, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") window.setTimeout(start, 1000);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (variant === "static") {
    return (
      <div className="dp-hero-media">
        <div className="dp-hero-ba">
          <figure>
            <Image src="/home/hero/before-poster.jpg" alt="Kitchen before Curbio's renovation" fill priority sizes="(max-width: 1024px) 50vw, 28vw" style={{ objectFit: "cover" }} />
            <figcaption className="dp-hero-balabel">Before</figcaption>
          </figure>
          <figure>
            <Image src="/home/hero/after-still.jpg" alt="The same kitchen after Curbio's renovation" fill priority sizes="(max-width: 1024px) 50vw, 28vw" style={{ objectFit: "cover" }} />
            <figcaption className="dp-hero-balabel">After</figcaption>
          </figure>
        </div>
      </div>
    );
  }

  return (
    <div className="dp-hero-media">
      <Image
        src="/home/hero/before-poster.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 55vw"
        style={{ objectFit: "cover" }}
      />
      <video
        ref={videoRef}
        muted
        playsInline
        preload="metadata"
        poster="/home/hero/before-poster.jpg"
        aria-label="A dated kitchen transformed by Curbio's pre-listing renovation"
      >
        <source src="/home/hero/before-after.webm" type="video/webm" />
        <source src="/home/hero/before-after.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
