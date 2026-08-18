import { Suspense } from "react";
import { AppHeader } from "@/components/chrome/AppHeader";
import { AppFooter } from "@/components/chrome/AppFooter";

function HeaderFallback() {
  return <header className="app-header" />;
}

function FooterFallback() {
  return <div className="status-line-bar app-footer" />;
}

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Suspense fallback={<HeaderFallback />}>
        <AppHeader />
      </Suspense>
      <div className="app-shell-body">{children}</div>
      <Suspense fallback={<FooterFallback />}>
        <AppFooter />
      </Suspense>
    </div>
  );
}
