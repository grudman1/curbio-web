import type { Metadata, Viewport } from "next";
import { Lora, Libre_Franklin } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
