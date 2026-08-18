"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <div className="til-view-switcher" role="tablist" aria-label="TIL views">
      {VIEWS.map((v) => {
        const isActive = currentView === v.mode;
        return (
          <button
            key={v.mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? "til-view-tab on" : "til-view-tab"}
            onClick={() => handleSwitchView(v.mode)}
          >
            {v.icon}
            {v.label}
          </button>
        );
      })}
    </div>
  );
};
