import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAProvider } from "@/components/PWAProvider";
import { DuotoneFilters } from "@/components/covers/DuotoneFilters";

export const metadata: Metadata = {
  title: "HOARD — Bookmark Manager",
  description: "Neo-brutalist contextual bookmark manager for articles, videos, repos, papers, and apps.",
  manifest: "/manifest.json",
  applicationName: "HOARD",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HOARD",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
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
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <DuotoneFilters />
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}


