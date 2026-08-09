import type { Metadata } from "next";
import { Barlow_Condensed, Frank_Ruhl_Libre } from "next/font/google";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import "./globals.css";

// The Steward Design Schema's two-font system: Barlow Condensed is the
// authority font (headings, labels, buttons — always 700), Frank Ruhl Libre
// is the humanity font (body copy — 300/400/500, never bold).
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-frank-ruhl-libre",
  weight: ["300", "400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UNSTUCK — Private Library",
  description: "The private UNSTUCK course library — for attendees who acted before we closed the doors.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${frankRuhlLibre.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
