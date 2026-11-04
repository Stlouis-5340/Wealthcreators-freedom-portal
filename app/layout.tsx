import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Freedom Portal",
    template: "%s · Freedom Portal",
  },
  description:
    "Wealth Creators Freedom Portal. Track Freedom Score, yield on assets, net worth, and the goals on the way there.",
  applicationName: "Wealth Creators Freedom Portal",
};

export const viewport: Viewport = {
  themeColor: "#0B3312",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-ink">{children}</body>
    </html>
  );
}
