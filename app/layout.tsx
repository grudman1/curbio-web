import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Lora, Libre_Franklin } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ClarityLoader from "@/components/ClarityLoader";
import "./globals.css";

// Analytics run only in production builds and only when the ID is configured —
// dev/preview without env vars renders nothing and errors nowhere.
const IS_PROD = process.env.NODE_ENV === "production";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
// From the CookieYes dashboard → sell.curbio.com site entry → "Custom-coded
// site" install snippet. Renders the consent banner; see lib/consent.ts for
// how the rest of the app reads its decision.
const COOKIEYES_ID = process.env.NEXT_PUBLIC_COOKIEYES_ID;

const lora = Lora({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  variable: "--font-serif",
});

const libre = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // allow zoom for accessibility — never 1 / user-scalable=no
};

export const metadata: Metadata = {
  title: "Curbio — Get your home market-ready",
  description:
    "Curbio is the pre-listing home improvement partner real estate agents trust. Repairs, refreshes, and staging — fully managed, with pay-at-closing for qualified sellers.",
  openGraph: {
    title: "Curbio — Get your home market-ready",
    description:
      "Pre-listing home improvement, fully managed by a licensed general contractor. The one call that does it all.",
    type: "website",
  },
  icons: {
    icon: "/logo/curbio-icon.png",
    apple: "/logo/curbio-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lora.variable} ${libre.variable}`}>
      <head>
        {/* Preload the logo so it's in cache when PageSkeleton renders,
            making the skeleton's <img> paint immediately as FCP. */}
        <link rel="preload" href="/logo/curbio-white.svg" as="image" type="image/svg+xml" />
        {/* Warm the Calendly connection before the iframe is parsed so
            DNS + TLS are resolved by the time the request fires. */}
        <link rel="preconnect" href="https://app.curbio.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://app.curbio.com" />
        <link rel="preconnect" href="https://calendly.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://assets.calendly.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://calendly.com" />
        <link rel="dns-prefetch" href="https://assets.calendly.com" />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
        {/* CookieYes — banner UI + the consent cookie/GPC handling lib/consent.ts
            reads. NOT relied on for automatic script blocking: our own scripts
            gate themselves on consent state in their own code (Google Consent
            Mode v2 in lib/analytics.ts; ClarityLoader below).

            strategy="beforeInteractive": Next.js injects this into the actual
            server-rendered HTML <head> (present in the raw response, before
            any client JS runs), rather than adding it to the DOM via
            client-side JS after hydration the way afterInteractive/lazyOnload
            do. CookieYes's own installation checker does a plain HTTP fetch
            with no JS execution — it cannot see a script that only exists
            because client-side React inserted it, which is exactly why
            afterInteractive here read as "not installed" to that checker.
            beforeInteractive is Next.js's own documented pattern for consent
            managers specifically, for this reason.

            The fixed-position banner overlay causes no CLS — reverified after
            this change (id="cookieyes" is REQUIRED — CookieYes's own script
            looks for this exact element id). */}
        {IS_PROD && COOKIEYES_ID && (
          <Script
            id="cookieyes"
            src={`https://cdn-cookieyes.com/client_data/${COOKIEYES_ID}/script.js`}
            strategy="beforeInteractive"
          />
        )}
        {/* GA4 loader only — gtag init/config happens in lib/analytics.ts so
            the manual page_view (with explicit UTM params, captured before the
            URL strip) is always queued ahead of any event. send_page_view is
            disabled there. lazyOnload keeps it off the paint path entirely:
            the dataLayer queue is drained whenever gtag.js arrives, so
            attribution is timing-independent by design. Consent Mode v2
            defaults are pushed before "js"/"config" in that same file, so
            gtag.js respects the visitor's consent state from its first tick
            regardless of when this script actually finishes loading. GA4
            itself is NOT consent-gated at the script level — that's the
            point of Consent Mode: it always loads and runs cookieless/pinged
            when denied, rather than being blocked outright. */}
        {IS_PROD && GA_ID && (
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="lazyOnload"
          />
        )}
        {/* Microsoft Clarity has no consent-mode equivalent — it is only
            injected once analytics consent is true. See ClarityLoader. */}
        <ClarityLoader />
      </body>
    </html>
  );
}
