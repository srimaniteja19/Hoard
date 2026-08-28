"use client";

import Link from "next/link";
import { useHydratedPathname } from "@/hooks/useHydratedPathname";

const LINKS = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  { href: "/library", label: "Library", match: (path: string) => path.startsWith("/library") || path.startsWith("/session") },
  { href: "/marginalia", label: "Marginalia", match: (path: string) => path.startsWith("/marginalia") },
  { href: "/ask", label: "Ask", match: (path: string) => path === "/ask" || path.startsWith("/ask/") },
  { href: "/scratch", label: "Scratch", match: (path: string) => path.startsWith("/scratch") },
  { href: "/todos", label: "Todos", match: (path: string) => path.startsWith("/todos") },
  { href: "/atlas", label: "Atlas", match: (path: string) => path.startsWith("/atlas") },
  { href: "/til", label: "TIL", match: (path: string) => path.startsWith("/til") },
  { href: "/stats", label: "Stats", match: (path: string) => path.startsWith("/stats") },
] as const;

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useHydratedPathname();

  return (
    <nav className="app-nav" aria-label="Primary" suppressHydrationWarning>
      {LINKS.map((link) => {
        const current = pathname ? link.match(pathname) : false;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={current ? "on" : undefined}
            onClick={onNavigate}
            suppressHydrationWarning
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
