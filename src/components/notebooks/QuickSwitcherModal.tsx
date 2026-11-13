"use client";

import React, { useState, useEffect, useRef } from "react";
import { SeedCourse } from "@/lib/notebooks/seedData";
import { computeWordCount, lessonState, Block } from "@/lib/notebooks/blocks";
import { getThemeTokens, NotebookTheme } from "@/lib/notebooks/theme";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";
import { playSound } from "@/lib/sound";
import { Search, FileText, ArrowRight, CornerDownLeft, Sparkles, BookOpen } from "lucide-react";

interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: SeedCourse[];
  onSelectPage: (courseIdx: number, moduleIdx: number, lessonIdx: number) => void;
  theme?: NotebookTheme;
}

interface FlatLessonItem {
  courseIdx: number;
  courseTitle: string;
  courseAccent: string;
  courseAccentFg: string;
  moduleIdx: number;
  moduleTitle: string;
  lessonIdx: number;
  lessonId: string;
  lessonTitle: string;
  wordCount: number;
  state: "empty" | "stub" | "written";
  snippet?: string;
  searchableText: string;
}

function extractBlockSearchText(blocks: Block[]): { snippet: string; searchableText: string } {
  let snippet = "";
  const chunks: string[] = [];

  for (const b of blocks) {
    const parts: string[] = [];
    if ("text" in b && typeof b.text === "string" && b.text.trim()) parts.push(b.text.trim());
    if ("summary" in b && typeof b.summary === "string" && b.summary.trim()) parts.push(b.summary.trim());
    if ("body" in b && typeof b.body === "string" && b.body.trim()) parts.push(b.body.trim());
    if ("code" in b && typeof b.code === "string" && b.code.trim()) parts.push(b.code.trim());
    if ("note" in b && typeof b.note === "string" && b.note.trim()) parts.push(b.note.trim());
    if ("title" in b && typeof b.title === "string" && b.title.trim()) parts.push(b.title.trim());
    if ("items" in b && Array.isArray(b.items)) {
      for (const item of b.items) {
        if (typeof item === "string") parts.push(item);
        else if (item && typeof item === "object") {
          if ("text" in item && typeof item.text === "string") parts.push(item.text);
          if ("label" in item && typeof item.label === "string") parts.push(item.label);
          if ("name" in item && typeof item.name === "string") parts.push(item.name);
        }
      }
    }
    const joined = parts.join(" ");
    if (joined) {
      chunks.push(joined);
      if (!snippet) snippet = joined.slice(0, 100);
    }
  }

  return { snippet, searchableText: chunks.join(" ").toLowerCase() };
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  courses,
  onSelectPage,
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useModalFocusTrap({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
  });

  // Flatten all lessons across all courses
  const allItems: FlatLessonItem[] = [];
  courses.forEach((c, cIdx) => {
    c.modules.forEach((m, mIdx) => {
      m.lessons.forEach((l, lIdx) => {
        const blocks = l.blocks || [];
        const wc = computeWordCount(blocks);
        const st = lessonState({ wordCount: wc });
        const { snippet, searchableText } = extractBlockSearchText(blocks);

        allItems.push({
          courseIdx: cIdx,
          courseTitle: c.title,
          courseAccent: c.accent,
          courseAccentFg: c.accentFg,
          moduleIdx: mIdx,
          moduleTitle: m.title.split(" · ")[0] || m.title,
          lessonIdx: lIdx,
          lessonId: l.id,
          lessonTitle: l.title,
          wordCount: wc,
          state: st,
          snippet,
          searchableText,
        });
      });
    });
  });

  const filtered = allItems.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.lessonTitle.toLowerCase().includes(q) ||
      item.courseTitle.toLowerCase().includes(q) ||
      item.moduleTitle.toLowerCase().includes(q) ||
      item.searchableText.includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        const item = filtered[selectedIndex];
        playSound.click();
        onSelectPage(item.courseIdx, item.moduleIdx, item.lessonIdx);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Keep selected item visible in list
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.65)",
        backdropFilter: "blur(3px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "clamp(40px, 12vh, 120px)",
        paddingLeft: "16px",
        paddingRight: "16px",
        zIndex: 99999,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick Switcher"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "640px",
          background: tokens.cardBg,
          color: tokens.textPrimary,
          border: `3px solid ${tokens.borderPrimary}`,
          boxShadow: tokens.boxShadow,
          display: "flex",
          flexDirection: "column",
          maxHeight: "75vh",
          overflow: "hidden",
          animation: "fadeIn 0.12s ease",
        }}
      >
        {/* Search Header Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "16px 20px",
            borderBottom: `2px solid ${tokens.borderPrimary}`,
            background: tokens.sidebarBg,
          }}
        >
          <Search size={18} style={{ color: tokens.textMuted, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to any note or course… (Type to search)"
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              fontFamily: "var(--body, 'Space Grotesk', sans-serif)",
              fontSize: "16px",
              fontWeight: 600,
              color: tokens.textPrimary,
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick switcher"
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              background: tokens.accentColor,
              color: tokens.accentFg,
              padding: "3px 6px",
              border: `1px solid ${tokens.borderPrimary}`,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "8px 0",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 600,
                color: tokens.textMuted,
              }}
            >
              NO MATCHING PAGES FOUND FOR &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.lessonId}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    playSound.click();
                    onSelectPage(item.courseIdx, item.moduleIdx, item.lessonIdx);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      playSound.click();
                      onSelectPage(item.courseIdx, item.moduleIdx, item.lessonIdx);
                      onClose();
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 20px",
                    cursor: "pointer",
                    background: isSelected ? tokens.accentColor : "transparent",
                    color: isSelected ? tokens.accentFg : tokens.textPrimary,
                    transition: "background 0.08s ease",
                  }}
                >
                  {/* Status Indicator Square */}
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      border: `2px solid ${isSelected ? tokens.accentFg : tokens.borderPrimary}`,
                      flex: "none",
                      background:
                        item.state === "written"
                          ? "#B8F04A"
                          : item.state === "stub"
                          ? "#FCE94F"
                          : "transparent",
                    }}
                  />

                  {/* Title & Path */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.lessonTitle}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        opacity: isSelected ? 0.85 : 0.72,
                        marginTop: "2px",
                      }}
                    >
                      <span
                        style={{
                          background: item.courseAccent,
                          color: item.courseAccentFg,
                          padding: "1px 5px",
                          borderRadius: "1px",
                        }}
                      >
                        {item.courseTitle.toUpperCase()}
                      </span>
                      <span>· {item.moduleTitle}</span>
                      {item.wordCount > 0 && <span>· {item.wordCount} WORDS</span>}
                    </div>
                  </div>

                  {/* Return Key Glyph */}
                  {isSelected && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9px",
                        fontWeight: 700,
                        opacity: 0.85,
                        flexShrink: 0,
                      }}
                    >
                      JUMP <CornerDownLeft size={11} />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 16px",
            borderTop: `1.5px solid ${tokens.borderSubtle}`,
            background: tokens.sidebarBg,
            color: tokens.textSecondary,
            fontFamily: "var(--mono, monospace)",
            fontSize: "8.5px",
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <span>↑↓ NAVIGATE</span>
            <span>↵ OPEN</span>
            <span>ESC CLOSE</span>
          </div>
          <div>{filtered.length} PAGES</div>
        </div>
      </div>
    </div>
  );
};
