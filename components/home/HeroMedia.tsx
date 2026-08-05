"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// The hero's media rectangle: the kitchen-transformation video.
//
// Behavior:
//   • autoplay muted, playsinline, loops continuously — NOT the native
//     `loop` attribute, which would cut straight from the after-frame back
//     to before with no breathing room. Instead: hold ~1s on the before
//     frame, play through, hold ~1s on the after frame, seek back to 0,
//     repeat. Same hold on every cycle, not just the first.
//   • no controls, no sound; poster is the before frame
//   • prefers-reduced-motion → static before/after side-by-side
//   • ?hero=static forces the same static variant — the A/B alternate
//
// LCP: the poster renders as a priority next/image UNDER the video element,
// so the largest paint is an optimized image that arrives with the HTML; the
// video (preload=metadata) fills in over it and never gates first paint.
const HOLD_MS = 1000;

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

    let timer: number | undefined;
    // Browsers pause muted video in hidden pages (and may refuse play()
    // outright) — in both cases the current frame simply holds, and the
    // visibilitychange listener resumes the cycle once the page is actually
    // being looked at, instead of quietly freezing forever.
    const playNow = () => {
      if (document.visibilityState !== "visible") return;
      v.play().catch(() => {
        /* autoplay refused → the current frame stays */
      });
    };
    const holdThenPlay = () => {
      timer = window.setTimeout(playNow, HOLD_MS);
    };
    const onEnded = () => {
      v.currentTime = 0;
      holdThenPlay();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && v.paused) holdThenPlay();
    };

    v.addEventListener("ended", onEnded);
    document.addEventListener("visibilitychange", onVisible);
    holdThenPlay(); // first run: hold on the before frame, then play

    return () => {
      window.clearTimeout(timer);
      v.removeEventListener("ended", onEnded);
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
