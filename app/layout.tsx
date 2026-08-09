import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
