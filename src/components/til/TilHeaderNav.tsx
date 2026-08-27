"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, BookOpen, RotateCcw, Printer, Grid3x3, Network, Archive } from "lucide-react";

export type TilViewMode = "stream" | "codex" | "recall" | "press" | "wall" | "constellation" | "archive";

interface ViewConfig {
  mode: TilViewMode;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  hotkey: string;
  description: string;
}

export const TilHeaderNav: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = (searchParams.get("view") as TilViewMode) || "stream";

  const handleSwitchView = (view: TilViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`/til?${params.toString()}`);
  };

  const VIEWS: ViewConfig[] = [
    {
      mode: "stream",
      label: "STREAM",
      shortLabel: "STREAM",
      icon: <Layers size={13} strokeWidth={2.4} />,
      color: "var(--cyan, #00F0FF)",
      hotkey: "1",
      description: "Chronological daily learning stream",
    },
    {
      mode: "codex",
      label: "CODEX",
      shortLabel: "CODEX",
      icon: <BookOpen size={13} strokeWidth={2.4} />,
      color: "var(--yel, #FFE600)",
      hotkey: "2",
      description: "Organized topical knowledge library",
    },
    {
      mode: "recall",
      label: "RECALL",
      shortLabel: "RECALL",
      icon: <RotateCcw size={13} strokeWidth={2.4} />,
      color: "var(--lime, #B6FF3C)",
      hotkey: "3",
      description: "Spaced repetition flashcard review deck",
    },
    {
      mode: "press",
      label: "PRESS",
      shortLabel: "PRESS",
      icon: <Printer size={13} strokeWidth={2.4} />,
      color: "var(--pink, #FF3366)",
      hotkey: "4",
      description: "Monthly editorial zine & printable digest",
    },
    {
      mode: "wall",
      label: "WALL",
      shortLabel: "WALL",
      icon: <Grid3x3 size={13} strokeWidth={2.4} />,
      color: "var(--violet, #9D4EDD)",
      hotkey: "5",
      description: "365-day zoomable density overview",
    },
    {
      mode: "constellation",
      label: "CONSTELLATION",
      shortLabel: "ORBIT",
      icon: <Network size={13} strokeWidth={2.4} />,
      color: "#00E5FF",
      hotkey: "6",
      description: "Interactive force graph of knowledge connections",
    },
    {
      mode: "archive",
      label: "ARCHIVE",
      shortLabel: "VAULT",
      icon: <Archive size={13} strokeWidth={2.4} />,
      color: "#FF9100",
      hotkey: "7",
      description: "Searchable vault of all filed & superseded insights",
    },
  ];

  // Keyboard shortcut listener when not inside an input/textarea
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        e.metaKey ||
        e.ctrlKey
      ) {
        return;
      }

      if (e.altKey && e.key >= "1" && e.key <= "7") {
        const idx = parseInt(e.key, 10) - 1;
        if (VIEWS[idx]) {
          e.preventDefault();
          handleSwitchView(VIEWS[idx].mode);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchParams]);

  return (
    <div className="til-view-switcher-container">
      <nav
        className="til-view-switcher"
        role="tablist"
        aria-label="TIL views navigation"
      >
        {VIEWS.map((v) => {
          const isActive = currentView === v.mode;
          return (
            <button
              key={v.mode}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${v.label} view: ${v.description}`}
              title={`${v.label} (⌥${v.hotkey}) — ${v.description}`}
              className={`til-view-tab ${isActive ? "on" : ""}`}
              style={
                isActive
                  ? ({
                      "--tab-accent": v.color,
                    } as React.CSSProperties)
                  : undefined
              }
              onClick={() => handleSwitchView(v.mode)}
            >
              <span className="til-tab-icon">{v.icon}</span>
              <span className="til-tab-label">{v.label}</span>
              <span className="til-tab-pip" />
            </button>
          );
        })}
      </nav>
    </div>
  );
};
