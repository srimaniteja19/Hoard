import type { ReactNode } from "react";

export type AppPageWidth = "sm" | "md" | "lg" | "xl" | "wide" | "full";

export function AppPage({
  children,
  variant = "document",
  width = "md",
}: {
  children: ReactNode;
  variant?: "document" | "flush";
  width?: AppPageWidth;
}) {
  if (variant === "flush") {
    return <div className="app-page-flush">{children}</div>;
  }

  return (
    <div className="page-scroll app-page">
      <div className={`app-page-inner app-page-${width}`}>{children}</div>
    </div>
  );
}
