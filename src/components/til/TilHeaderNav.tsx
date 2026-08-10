"use client";

import React from "react";
import Link from "next/link";
import { ThemePicker } from "@/components/ThemePicker";
import { UserMenu } from "@/components/UserMenu";
import { ArrowLeft, BarChart2 } from "lucide-react";

export const TilHeaderNav: React.FC = () => {
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
      }}
    >
      {/* Left: Brand / Title & Back Link */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--ink)",
            textDecoration: "none",
            background: "var(--bg, #FFFDF8)",
            border: "1.5px solid var(--ink)",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            boxShadow: "2px 2px 0 var(--ink)",
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
              border: "1px solid var(--ink)",
            }}
          >
            TODAY I LEARNED (TIL)
          </span>
        </div>
      </div>

      {/* Right: Quick Links, ThemePicker & User */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Link
          href="/stats"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--ink)",
            textDecoration: "none",
            background: "#00F0FF",
            border: "1.5px solid var(--ink)",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            boxShadow: "2px 2px 0 var(--ink)",
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
