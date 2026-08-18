import Link from "next/link";
import type { ReactNode } from "react";

export function PublicHeader({
  badge = "PUBLIC COLLECTION",
  actions,
}: {
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="public-header">
      <div className="app-header-brand">
        <Link href="/" className="app-wordmark">
          HOARD
        </Link>
        <span className="app-header-slash" aria-hidden="true">
          /
        </span>
        <span className="page-badge">{badge}</span>
      </div>
      {actions ? <div className="public-header-actions">{actions}</div> : null}
    </header>
  );
}
