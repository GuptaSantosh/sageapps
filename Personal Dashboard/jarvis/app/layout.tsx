import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground antialiased flex">
        <Sidebar />
        <main className="flex-1 min-h-screen overflow-auto pl-[220px]">
          <div className="max-w-[1400px] mx-auto px-8 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
