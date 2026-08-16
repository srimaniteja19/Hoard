"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemePicker } from "@/components/ThemePicker";
import { UserMenu } from "@/components/UserMenu";
import { ArrowLeft, BarChart2, Layers, BookOpen, RotateCcw, Printer, Grid3x3, Network, Archive } from "lucide-react";

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
    <header
      style={{
        background: "var(--paper)",
        borderBottom: "var(--bd)",
        padding: "10px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "var(--sh-sm)",
        flexWrap: "nowrap",
        gap: "12px",
        height: "56px",
        boxSizing: "border-box",
        overflowX: "auto",
      }}
    >
      {/* Left: Brand / Title & Back Link */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--ink)",
            textDecoration: "none",
            background: "var(--paper)",
            border: "var(--bd)",
            height: "36px",
            boxSizing: "border-box",
            padding: "0 10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            boxShadow: "var(--sh-sm)",
            whiteSpace: "nowrap",
          }}
        >
          <ArrowLeft size={13} /> QUEUE
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 900, color: "var(--ink)" }}>
            HOARD
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.5, color: "var(--ink)" }}>/</span>
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
      </div>

      {/* Center: View Modes Switcher */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "2px",
          background: "var(--paper)",
          border: "var(--bd)",
          boxShadow: "var(--sh-sm)",
          height: "36px",
          boxSizing: "border-box",
          padding: "2px",
          flexShrink: 0,
        }}
      >
        {VIEWS.map((v) => {
          const isActive = currentView === v.mode;
          return (
            <button
              key={v.mode}
              type="button"
              onClick={() => handleSwitchView(v.mode)}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                padding: "0 8px",
                height: "100%",
                border: isActive ? "1.5px solid var(--ink)" : "1px solid transparent",
                background: isActive ? "var(--yel, #FFE600)" : "transparent",
                color: isActive ? "#000" : "var(--ink)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: isActive ? "1px 1px 0 var(--ink)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {v.icon}
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Right: Quick Links, ThemePicker & User */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <Link
          href="/stats"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "#000",
            textDecoration: "none",
            background: "var(--cyan, #00F0FF)",
            border: "var(--bd)",
            height: "36px",
            boxSizing: "border-box",
            padding: "0 10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            boxShadow: "var(--sh-sm)",
            whiteSpace: "nowrap",
          }}
        >
          <BarChart2 size={13} /> STATS
        </Link>

        <ThemePicker />
        <UserMenu />
      </div>
    </header>
  );
};
