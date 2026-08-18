"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemePicker } from "@/components/ThemePicker";
import { UserMenu } from "@/components/UserMenu";
import { AppNav } from "@/components/AppNav";
import { Layers, BookOpen, RotateCcw, Printer, Grid3x3, Network, Archive } from "lucide-react";

export type TilViewMode = "stream" | "codex" | "recall" | "press" | "wall" | "constellation" | "archive";

export const TilHeaderNav: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = (searchParams.get("view") as TilViewMode) || "stream";

  const handleSwitchView = (view: TilViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`/til?${params.toString()}`);
  };

  const VIEWS: Array<{ mode: TilViewMode; label: string; icon: React.ReactNode }> = [
    { mode: "stream", label: "STREAM", icon: <Layers size={12} /> },
    { mode: "codex", label: "CODEX", icon: <BookOpen size={12} /> },
    { mode: "recall", label: "RECALL", icon: <RotateCcw size={12} /> },
    { mode: "press", label: "PRESS", icon: <Printer size={12} /> },
    { mode: "wall", label: "WALL", icon: <Grid3x3 size={12} /> },
    { mode: "constellation", label: "CONSTELLATION", icon: <Network size={12} /> },
    { mode: "archive", label: "ARCHIVE", icon: <Archive size={12} /> },
  ];

  return (
    <header className="til-header-nav">
      <div className="til-header-brand">
        <Link href="/" className="app-wordmark">
          HOARD
        </Link>
        <span className="til-wordmark" style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.5, color: "var(--ink)" }}>/</span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "12px",
            fontWeight: 900,
            background: "var(--yel, #FFE600)",
            color: "#000",
            padding: "2px 6px",
            border: "1.5px solid var(--ink)",
          }}
        >
          TIL
        </span>
      </div>

      <AppNav />

      <div className="til-view-switcher" role="tablist" aria-label="TIL views">
        {VIEWS.map((v) => {
          const isActive = currentView === v.mode;
          return (
            <button
              key={v.mode}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSwitchView(v.mode)}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                padding: "0 8px",
                height: "100%",
                minHeight: "32px",
                border: isActive ? "1.5px solid var(--ink)" : "1px solid transparent",
                background: isActive ? "var(--yel, #FFE600)" : "transparent",
                color: isActive ? "#000" : "var(--ink)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: isActive ? "1px 1px 0 var(--ink)" : "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {v.icon}
              {v.label}
            </button>
          );
        })}
      </div>

      <div className="til-header-actions">
        <ThemePicker />
        <UserMenu variant="compact" />
      </div>
    </header>
  );
};
