import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeHound — the apartment agent that knows your neighborhood",
  description:
    "An AI-powered search agent that finds neighborhoods first, then the apartments inside them. Scores listings against safety, commute, food, and vibe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="bg-ink-50 text-ink-900 antialiased">{children}</body>
    </html>
  );
}
