"use client";

import { usePathname } from "next/navigation";
import { pageLabelFromPath } from "@/lib/chrome";
import { useChromeSlot } from "@/components/chrome/slots";

export function AppFooter() {
  const pathname = usePathname() || "/";
  const label = pageLabelFromPath(pathname);
  const custom = useChromeSlot("footer");

  if (custom) return <>{custom}</>;

  return (
    <div className="status-line-bar app-footer" role="status">
      <span>HOARD</span>
      <span className="sep">·</span>
      <span>{label}</span>
    </div>
  );
}
