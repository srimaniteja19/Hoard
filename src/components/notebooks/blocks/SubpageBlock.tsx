"use client";

import React, { useState } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import { ArrowUpRight, Trash2, FileText, CornerDownRight, Layers } from "lucide-react";

interface SubpageBlockProps {
  block: Extract<Block, { type: "subpage" }>;
  onNavigateToLesson?: (lessonId: string) => void;
  onDeleteBlock?: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const SubpageBlock: React.FC<SubpageBlockProps> = ({
  block,
  onNavigateToLesson,
  onDeleteBlock,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;
  const [isHovered, setIsHovered] = useState(false);

  const displayTitle = (block.title || "").trim() || "Untitled Subpage";
  const displayIcon = block.icon || "📄";

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSound.click();
    if (onNavigateToLesson) {
      onNavigateToLesson(block.pageId);
    }
  };

  return (
    <div
      className="notion-subpage-block group"
      onClick={handleOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        margin: "12px 0",
        padding: "12px 16px",
        background: isHovered ? tokens.popoverHoverBg : tokens.cardBg,
        border: `2px solid ${isHovered ? accentColor : tokens.borderPrimary}`,
        boxShadow: isHovered
          ? `4px 4px 0 ${isInk ? "#FFFFFF" : "#0A0A0A"}`
          : tokens.boxShadow,
        borderRadius: "2px",
        cursor: "pointer",
        transition: "all 0.12s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: isHovered ? "translate(-2px, -2px)" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
      }}
    >
      {/* Left side: Icon + Title + Meta badges */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
        {/* Emoji / Doc Icon Badge */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "4px",
            background: isInk ? "rgba(255,255,255,0.06)" : "rgba(10,10,10,0.05)",
            border: `1.5px solid ${tokens.borderSubtle}`,
            display: "grid",
            placeItems: "center",
            fontSize: "20px",
            flexShrink: 0,
            userSelect: "none",
            transform: isHovered ? "scale(1.08)" : "none",
            transition: "transform 0.12s ease",
          }}
        >
          {displayIcon}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--sans, system-ui, sans-serif)",
                fontWeight: 700,
                fontSize: "15px",
                color: tokens.textPrimary,
                letterSpacing: "-0.01em",
                textDecoration: isHovered ? "underline" : "none",
                textUnderlineOffset: "3px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayTitle}
            </span>

            {/* Subpage Pill Badge */}
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "8.5px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                padding: "2px 6px",
                background: isInk ? "rgba(123, 92, 240, 0.25)" : "rgba(123, 92, 240, 0.12)",
                color: accentColor,
                border: `1px solid ${accentColor}`,
                borderRadius: "2px",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <CornerDownRight size={9} />
              <span>SUBPAGE</span>
            </span>
          </div>

          {/* Subtitle / word count chip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "3px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              color: tokens.textSecondary,
              letterSpacing: "0.04em",
            }}
          >
            <span>
              {typeof block.wordCount === "number" && block.wordCount > 0
                ? `${block.wordCount.toLocaleString()} words`
                : "Empty subpage"}
            </span>
            <span>•</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <Layers size={10} />
              <span>Nested note</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Action CTA & Delete */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleOpen}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            background: isHovered ? accentColor : "transparent",
            color: isHovered ? "#FFFFFF" : tokens.textPrimary,
            border: `1.5px solid ${isHovered ? accentColor : tokens.borderPrimary}`,
            boxShadow: isHovered ? "2px 2px 0 #000000" : "none",
            padding: "5px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            borderRadius: "2px",
            transition: "all 0.1s ease",
          }}
        >
          <span>OPEN</span>
          <ArrowUpRight size={12} />
        </button>

        {onDeleteBlock && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playSound.click();
              onDeleteBlock();
            }}
            title="Remove subpage block from this note"
            style={{
              background: "transparent",
              border: `1.5px solid transparent`,
              color: isHovered ? "#EF4444" : "transparent",
              padding: "5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              borderRadius: "2px",
              opacity: isHovered ? 0.75 : 0,
              transition: "opacity 0.1s ease, color 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.borderColor = "#EF4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.75";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
