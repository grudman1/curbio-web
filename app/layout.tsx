import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Lora, Libre_Franklin } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Analytics run only in production builds and only when the ID is configured —
// dev/preview without env vars renders nothing and errors nowhere.
const IS_PROD = process.env.NODE_ENV === "production";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

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
        {/* GA4 loader only — gtag init/config happens in lib/analytics.ts so
            the manual page_view (with explicit UTM params, captured before the
            URL strip) is always queued ahead of any event. send_page_view is
            disabled there. */}
        {IS_PROD && GA_ID && (
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
        )}
        {/* Microsoft Clarity — default input masking stays ON (form collects
            PII; it must never appear in session recordings). */}
        {IS_PROD && CLARITY_ID && (
          <Script id="ms-clarity" strategy="lazyOnload">
            {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");`}
          </Script>
        )}
      </body>
    </html>
  );
}
