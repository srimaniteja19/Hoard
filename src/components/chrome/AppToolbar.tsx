import type { ReactNode } from "react";

export function AppToolbar({ children }: { children: ReactNode }) {
  return <div className="app-toolbar">{children}</div>;
}
