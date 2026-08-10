"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBookmarks } from "@/hooks/useBookmarks";
import { CoverCanvas } from "@/components/covers/CoverCanvas";
import { TYPES } from "@/data/initialBookmarks";
import Link from "next/link";
import { Zap, CheckCircle2, ArrowRight, X, Play, Pause } from "lucide-react";

export default function SessionPage() {
  const router = useRouter();
  const { bookmarks, toggleReadStatus } = useBookmarks();
  const unreadItems = bookmarks.filter((b) => b.unread);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem = unreadItems[currentIndex] || unreadItems[0];

  const [timeLeftSec, setTimeLeftSec] = useState<number>(1500); // 25 min default
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Initialize timer whenever active item changes
  useEffect(() => {
    if (currentItem) {
      setTimeLeftSec((currentItem.mins || 15) * 60);
      setIsRunning(true);
    }
  }, [currentItem]);

  // Timer countdown effect
  useEffect(() => {
    if (!isRunning || timeLeftSec <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeftSec]);

  // Mark current item as finished and advance
  const handleMarkFinished = useCallback(async () => {
    if (!currentItem) return;
    await toggleReadStatus(currentItem.id);
    if (currentIndex < unreadItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentItem, currentIndex, unreadItems.length, toggleReadStatus]);

  // Keyboard shortcut listener (Space: pause/resume, Esc: exit, N: mark finished)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      } else if (e.code === "Escape") {
        e.preventDefault();
        router.push("/");
      } else if (e.key === "n" || e.key === "N" || e.code === "Enter") {
        e.preventDefault();
        handleMarkFinished();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMarkFinished, router]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!currentItem) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0d0d0d",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "var(--mono)",
        }}
      >
        <CheckCircle2 size={64} color="#B6FF3C" style={{ marginBottom: "16px" }} />
        <h1 style={{ fontSize: "28px", fontWeight: 900, marginBottom: "8px" }}>
          SESSION COMPLETE!
        </h1>
        <p style={{ color: "#aaa", marginBottom: "24px" }}>
          All queued items have been read. Great focus work!
        </p>
        <Link
          href="/"
          style={{
            background: "#00F0FF",
            color: "#000",
            padding: "10px 20px",
            fontWeight: 900,
            textDecoration: "none",
            border: "2px solid #fff",
            boxShadow: "4px 4px 0 #fff",
          }}
        >
          RETURN TO HOARD MAIN SHELF
        </Link>
      </div>
    );
  }

  const kindMeta = TYPES[currentItem.ty] || { name: currentItem.ty, c: "#00F0FF" };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "2px solid #222",
          background: "#141414",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Zap size={20} color={kindMeta.c} />
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              color: kindMeta.c,
            }}
          >
            FOCUS SESSION · ITEM {currentIndex + 1} OF {unreadItems.length}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#888" }}>
            [SPACE] PAUSE · [N] NEXT · [ESC] EXIT
          </span>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent",
              border: "1px solid #444",
              color: "#fff",
              padding: "6px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            <X size={14} /> EXIT
          </button>
        </div>
      </header>

      {/* Main Focus Content Area */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "840px",
          width: "100%",
          margin: "0 auto",
          padding: "32px 24px",
        }}
      >
        {/* Giant Timer Display */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "72px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: timeLeftSec <= 60 ? "#FF007A" : "#fff",
            }}
          >
            {formatTimer(timeLeftSec)}
          </div>
          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{
              background: isRunning ? "#222" : kindMeta.c,
              color: isRunning ? "#fff" : "#000",
              border: "2px solid #fff",
              padding: "6px 16px",
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "8px",
            }}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            {isRunning ? "PAUSE TIMER" : "RESUME TIMER"}
          </button>
        </div>

        {/* Cover Canvas Detailed View */}
        <div
          style={{
            width: "100%",
            height: "220px",
            border: "3px solid #fff",
            boxShadow: "6px 6px 0 #fff",
            marginBottom: "24px",
            position: "relative",
            background: "#1a1a1a",
          }}
          data-kind={currentItem.ty}
        >
          <CoverCanvas kind={currentItem.ty} coverData={currentItem.coverData} height={220} />
        </div>

        {/* Metadata Details */}
        <div style={{ width: "100%", textAlign: "left", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                background: kindMeta.c,
                color: "#000",
                padding: "2px 6px",
              }}
            >
              {currentItem.ty}
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "#aaa" }}>
              {currentItem.src}
            </span>
          </div>

          <h2 style={{ fontSize: "24px", fontWeight: 900, lineHeight: 1.3, marginBottom: "12px" }}>
            {currentItem.t}
          </h2>

          <a
            href={currentItem.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#00F0FF",
              fontFamily: "var(--mono)",
              fontSize: "13px",
              textDecoration: "underline",
              display: "inline-block",
              marginBottom: "16px",
            }}
          >
            OPEN ORIGINAL LINK ↗
          </a>

          {currentItem.note && (
            <div
              style={{
                background: "#1a1a1a",
                borderLeft: "3px solid #FFE600",
                padding: "12px",
                fontFamily: "var(--sans)",
                fontSize: "14px",
                color: "#ddd",
              }}
            >
              <strong>NOTE:</strong> {currentItem.note}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: "16px", width: "100%" }}>
          <button
            onClick={handleMarkFinished}
            style={{
              flex: 1,
              background: "#B6FF3C",
              color: "#000",
              border: "3px solid #fff",
              padding: "14px",
              fontWeight: 900,
              fontFamily: "var(--mono)",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "4px 4px 0 #fff",
            }}
          >
            <CheckCircle2 size={18} /> MARK FINISHED & NEXT [N]
          </button>

          <button
            onClick={() => {
              if (currentIndex < unreadItems.length - 1) {
                setCurrentIndex((prev) => prev + 1);
              }
            }}
            style={{
              background: "#222",
              color: "#fff",
              border: "2px solid #555",
              padding: "14px 24px",
              fontWeight: 800,
              fontFamily: "var(--mono)",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            SKIP <ArrowRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
