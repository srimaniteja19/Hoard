import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HOARD — Bookmark Manager",
  description: "Neo-brutalist contextual bookmark manager for articles, videos, repos, papers, and apps.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFE600",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

