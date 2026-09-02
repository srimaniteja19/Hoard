"use client";

import React, { useState, useEffect, useRef } from "react";
import { SeedCourse } from "@/lib/notebooks/seedData";
import { computeWordCount, lessonState } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";
import { Search, FileText, ArrowRight, CornerDownLeft, Sparkles, BookOpen } from "lucide-react";

interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: SeedCourse[];
  onSelectPage: (courseIdx: number, moduleIdx: number, lessonIdx: number) => void;
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
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  courses,
  onSelectPage,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Flatten all lessons across all courses
  const allItems: FlatLessonItem[] = [];
  courses.forEach((c, cIdx) => {
    c.modules.forEach((m, mIdx) => {
      m.lessons.forEach((l, lIdx) => {
        const wc = computeWordCount(l.blocks || []);
        const st = lessonState({ wordCount: wc });

        // Extract first text snippet
        let snippet = "";
        if (l.blocks && l.blocks.length > 0) {
          for (const b of l.blocks) {
            if ("text" in b && typeof (b as any).text === "string" && (b as any).text.trim()) {
              snippet = (b as any).text.trim().slice(0, 100);
              break;
            }
          }
        }

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
      (item.snippet && item.snippet.toLowerCase().includes(q))
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
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "640px",
          background: "#FFFFFF",
          border: "3px solid #0A0A0A",
          boxShadow: "10px 10px 0 #0A0A0A",
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
            borderBottom: "2px solid #0A0A0A",
            background: "#F3F0E8",
          }}
        >
          <Search size={18} style={{ opacity: 0.5, flexShrink: 0 }} />
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
              color: "#0A0A0A",
              outline: "none",
            }}
          />
          <span
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              background: "#0A0A0A",
              color: "#F3F0E8",
              padding: "3px 6px",
              border: "1px solid #0A0A0A",
              flexShrink: 0,
            }}
          >
            ESC
          </span>
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
                opacity: 0.5,
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
                  onClick={() => {
                    playSound.click();
                    onSelectPage(item.courseIdx, item.moduleIdx, item.lessonIdx);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 20px",
                    cursor: "pointer",
                    background: isSelected ? "#0A0A0A" : "transparent",
                    color: isSelected ? "#F3F0E8" : "#0A0A0A",
                    transition: "background 0.08s ease",
                  }}
                >
                  {/* Status Indicator Square */}
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      border: isSelected ? "2px solid #F3F0E8" : "2px solid #0A0A0A",
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
                        opacity: isSelected ? 0.7 : 0.5,
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
                        opacity: 0.8,
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
            borderTop: "1.5px solid rgba(10,10,10,0.15)",
            background: "#F3F0E8",
            fontFamily: "var(--mono, monospace)",
            fontSize: "8.5px",
            fontWeight: 700,
            opacity: 0.65,
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
