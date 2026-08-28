"use client";

import React from "react";
import { BookRow } from "@/db/schema";
import { ChapterItem } from "@/lib/marginalia/types";
import { playSound } from "@/lib/sound";

import { cleanChapterTitle } from "@/lib/marginalia/chapterExtractor";

interface TableOfContentsModalProps {
  isOpen: boolean;
  book: BookRow;
  chapters: ChapterItem[];
  currentChapter: number;
  resolving: boolean;
  onClose: () => void;
  onSelectChapter: (chapterNumber: number) => void;
  onAutoResolveToc: () => void;
}

export const TableOfContentsModal: React.FC<TableOfContentsModalProps> = ({
  isOpen,
  book,
  chapters,
  currentChapter,
  resolving,
  onClose,
  onSelectChapter,
  onAutoResolveToc,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "85vh",
          backgroundColor: "var(--card)",
          border: "var(--b) solid var(--ink)",
          boxShadow: "8px 8px 0 var(--ink)",
          color: "var(--ink)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "var(--b) solid var(--ink)",
            background: "var(--ink)",
            color: "var(--paper)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.14em", opacity: 0.8 }}>
              TABLE OF CONTENTS
            </div>
            <div style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 800 }}>
              {book.title}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onAutoResolveToc}
              disabled={resolving}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                padding: "5px 10px",
                border: "1.5px solid var(--paper)",
                background: "transparent",
                color: "var(--paper)",
                cursor: "pointer",
              }}
            >
              {resolving ? "⏳ DETECTING..." : "⚡ AUTO-DETECT TOC"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                padding: "5px 10px",
                border: "1.5px solid var(--paper)",
                background: "var(--yellow)",
                color: "#0A0A0A",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Chapter List */}
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          {chapters.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>
                No Chapter Titles Recorded Yet
              </div>
              <p style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.7, marginBottom: "16px" }}>
                Click below to auto-resolve the authentic published Table of Contents using bibliographical AI.
              </p>
              <button
                type="button"
                onClick={onAutoResolveToc}
                disabled={resolving}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "8px 18px",
                  background: "var(--yellow)",
                  color: "#0A0A0A",
                  border: "2px solid var(--ink)",
                  boxShadow: "3px 3px 0 var(--ink)",
                  cursor: "pointer",
                }}
              >
                {resolving ? "⏳ DETECTING CHAPTERS..." : "⚡ AUTO-DETECT TABLE OF CONTENTS"}
              </button>
            </div>
          ) : (
            chapters.map((ch) => {
              const isCurrent = ch.number === currentChapter;
              const displayTitle = cleanChapterTitle(ch.title) || `Chapter ${ch.number}`;
              return (
                <div
                  key={ch.number}
                  onClick={() => {
                    playSound.click();
                    onSelectChapter(ch.number);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    border: "2px solid var(--ink)",
                    background: isCurrent ? "var(--yellow)" : "var(--card)",
                    color: "#0A0A0A",
                    boxShadow: isCurrent ? "3px 3px 0 var(--ink)" : "none",
                    cursor: "pointer",
                    transition: "transform 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        fontWeight: 900,
                        padding: "3px 6px",
                        background: isCurrent ? "var(--ink)" : "var(--shade)",
                        color: isCurrent ? "var(--paper)" : "var(--ink)",
                        border: "1px solid var(--ink)",
                      }}
                    >
                      CH {ch.number}
                    </span>
                    <span style={{ fontFamily: "var(--body)", fontSize: "14.5px", fontWeight: isCurrent ? 800 : 600 }}>
                      {displayTitle}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {ch.page && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.7 }}>
                        P. {ch.page}
                      </span>
                    )}
                    {ch.duration && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.7 }}>
                        ⏱ {ch.duration}
                      </span>
                    )}
                    {isCurrent && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", fontWeight: 800, background: "var(--ink)", color: "var(--paper)", padding: "2px 6px" }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
