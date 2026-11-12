"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { useHydratedPathname } from "@/hooks/useHydratedPathname";

interface NavLinkItem {
  href: string;
  label: string;
  match: (path: string) => boolean;
}

interface NavGroup {
  id: string;
  label?: string;
  links: NavLinkItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    links: [{ href: "/", label: "Home", match: (path) => path === "/" }],
  },
  {
    id: "read",
    label: "READ",
    links: [
      {
        href: "/library",
        label: "Library",
        match: (path) => path.startsWith("/library") || path.startsWith("/session"),
      },
      { href: "/reader", label: "Reader", match: (path) => path.startsWith("/reader") },
      { href: "/marginalia", label: "Marginalia", match: (path) => path.startsWith("/marginalia") },
      { href: "/ask", label: "Ask", match: (path) => path === "/ask" || path.startsWith("/ask/") },
      { href: "/atlas", label: "Atlas", match: (path) => path.startsWith("/atlas") },
    ],
  },
  {
    id: "notes",
    label: "NOTES",
    links: [
      { href: "/til", label: "TIL", match: (path) => path.startsWith("/til") },
      { href: "/scratch", label: "Scratch", match: (path) => path.startsWith("/scratch") },
      { href: "/notebooks", label: "Notebooks", match: (path) => path.startsWith("/notebooks") },
      { href: "/todos", label: "Todos", match: (path) => path.startsWith("/todos") },
    ],
  },
  {
    id: "tools",
    label: "LABS",
    links: [
      { href: "/ledger", label: "Ledger", match: (path) => path.startsWith("/ledger") },
      { href: "/studio", label: "Studio", match: (path) => path.startsWith("/studio") },
      {
        href: "/channel100",
        label: "CH·100",
        match: (path) => path.startsWith("/channel100") || path.startsWith("/ch100"),
      },
      { href: "/stats", label: "Stats", match: (path) => path.startsWith("/stats") },
    ],
  },
];

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useHydratedPathname();
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector<HTMLElement>("a.on");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [pathname]);

  return (
    <nav ref={navRef} className="app-nav" aria-label="Primary" suppressHydrationWarning>
      {NAV_GROUPS.map((group, groupIdx) => {
        const groupActive = pathname
          ? group.links.some((link) => link.match(pathname))
          : false;

        return (
          <div
            key={group.id}
            className={`app-nav-group ${groupActive ? "is-group-active" : ""}`}
            data-group={group.id}
          >
            {groupIdx > 0 && <span className="app-nav-sep" aria-hidden="true" />}
            {group.label && (
              <span className="app-nav-group-lbl" aria-hidden="true">
                {group.label}
              </span>
            )}
            <div className="app-nav-group-links">
              {group.links.map((link) => {
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
            </div>
          </div>
        );
      })}
    </nav>
  );
}
