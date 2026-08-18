"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  { href: "/library", label: "Library", match: (path: string) => path.startsWith("/library") || path.startsWith("/session") },
  { href: "/todos", label: "Todos", match: (path: string) => path.startsWith("/todos") },
  { href: "/til", label: "TIL", match: (path: string) => path.startsWith("/til") },
  { href: "/stats", label: "Stats", match: (path: string) => path.startsWith("/stats") },
] as const;

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() || "/";

  return (
    <nav className="app-nav" aria-label="Primary">
      {LINKS.map((link) => {
        const current = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={current ? "on" : undefined}
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
