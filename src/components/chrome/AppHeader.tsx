"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ThemePicker } from "@/components/ThemePicker";
import { UserMenu } from "@/components/UserMenu";
import { pageLabelFromPath } from "@/lib/chrome";
import { AppToolbar } from "@/components/chrome/AppToolbar";
import { useChromeSlot } from "@/components/chrome/slots";

export function AppHeader() {
  const pathname = usePathname() || "/";
  const label = pageLabelFromPath(pathname);
  const leading = useChromeSlot("leading");
  const trailing = useChromeSlot("trailing");
  const toolbar = useChromeSlot("toolbar");

  return (
    <header className="app-header">
      <div className="app-header-row">
        <div className="app-header-brand">
          {leading ? <div className="app-header-leading">{leading}</div> : null}
          <Link href="/" className="app-wordmark">
            HOARD
          </Link>
          <span className="app-header-slash" aria-hidden="true">
            /
          </span>
          <h1 className="page-badge">{label}</h1>
        </div>
        <AppNav />
        <div className="app-header-actions">
          {trailing}
          <ThemePicker />
          <UserMenu variant="compact" />
        </div>
      </div>
      {toolbar ? <AppToolbar>{toolbar}</AppToolbar> : null}
    </header>
  );
}
