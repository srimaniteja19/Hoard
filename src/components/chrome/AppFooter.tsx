"use client";

import { pageLabelFromPath } from "@/lib/chrome";
import { useChromeSlot } from "@/components/chrome/slots";
import { useHydratedPathname } from "@/hooks/useHydratedPathname";

export function AppFooter() {
  const pathname = useHydratedPathname();
  const label = pathname ? pageLabelFromPath(pathname) : "\u00A0";
  const custom = useChromeSlot("footer");

  if (custom) return <>{custom}</>;

  return (
    <div className="status-line-bar app-footer" role="status">
      <span>HOARD</span>
      <span className="sep">·</span>
          <span suppressHydrationWarning>{label}</span>
    </div>
  );
}
