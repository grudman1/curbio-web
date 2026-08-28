import { Inter } from "next/font/google";

// Self-hosted, scoped to whatever element carries `inter.variable` (Home's
// root wrapper — see page.tsx). Defines --ui2-font on that subtree only, so
// the rest of /admin keeps shipping Libre Franklin unchanged.
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--ui2-font",
});
