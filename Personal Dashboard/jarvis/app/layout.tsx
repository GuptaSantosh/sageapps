/**
 * Root layout — global document shell only.
 *
 * Contains only: HTML structure, fonts, global CSS, forced dark mode.
 * Does NOT render the Sidebar — that lives in app/(private)/layout.tsx
 * so the login page (app/(public)/login/page.tsx) does not inherit it.
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Jarvis — Command Center",
  description: "Private founder dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground antialiased flex">
        {children}
      </body>
    </html>
  );
}
