import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAProvider } from "@/components/PWAProvider";
import { TodoReminderProvider } from "@/components/TodoReminderProvider";
import { DuotoneFilters } from "@/components/covers/DuotoneFilters";
import { CommandPalette } from "@/components/library/CommandPalette";

export const metadata: Metadata = {
  title: "HOARD — Contextual Bookmark Manager",
  description: "Neo-brutalist contextual bookmark manager for articles, videos, repos, papers, and apps.",
  manifest: "/manifest.json",
  applicationName: "HOARD",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HOARD",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFE600" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
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
        <PWAProvider>
          <TodoReminderProvider>{children}</TodoReminderProvider>
        </PWAProvider>
        <CommandPalette />
      </body>
    </html>
  );
}
