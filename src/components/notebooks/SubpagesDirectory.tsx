"use client";

import React from "react";
import { SeedCourseLesson } from "@/lib/notebooks/seedData";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { computeWordCount } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";
import { Plus, ArrowUpRight, FolderGit2, FileText, CornerDownRight } from "lucide-react";

interface SubpagesDirectoryProps {
  subpages: SeedCourseLesson[];
  onSelectSubpage: (lessonId: string) => void;
  onCreateSubpage: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const SubpagesDirectory: React.FC<SubpagesDirectoryProps> = ({
  subpages,
  onSelectSubpage,
  onCreateSubpage,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  if (subpages.length === 0) return null;

  return (
    <div
      className="notion-subpages-directory no-print"
      style={{
        marginTop: "48px",
        paddingTop: "24px",
        borderTop: `2px solid ${tokens.borderPrimary}`,
      }}
    >
      {/* Directory Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FolderGit2 size={16} color={accentColor} />
          <span
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              color: tokens.textPrimary,
            }}
          >
            NESTED SUBPAGES
          </span>
          <span
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 800,
              background: tokens.cardBg,
              color: tokens.textSecondary,
              border: `1.5px solid ${tokens.borderPrimary}`,
              padding: "1px 6px",
              borderRadius: "2px",
            }}
          >
            {subpages.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound.click();
            onCreateSubpage();
          }}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "9.5px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            background: tokens.cardBg,
            color: tokens.textPrimary,
            border: `1.5px solid ${tokens.borderPrimary}`,
            boxShadow: tokens.boxShadow,
            padding: "5px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            borderRadius: "2px",
            transition: "all 0.1s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = tokens.popoverHoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = tokens.cardBg;
          }}
        >
          <Plus size={11} />
          <span>NEW SUBPAGE</span>
        </button>
      </div>

      {/* Grid of Subpage Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "12px",
        }}
      >
        {subpages.map((sub) => {
          const wc = computeWordCount(sub.blocks || []);
          const icon = sub.icon || "📄";

          return (
            <div
              key={sub.id}
              onClick={() => {
                playSound.click();
                onSelectSubpage(sub.id);
              }}
              style={{
                background: tokens.cardBg,
                border: `2px solid ${tokens.borderPrimary}`,
                boxShadow: tokens.boxShadow,
                borderRadius: "2px",
                cursor: "pointer",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.12s cubic-bezier(0.16, 1, 0.3, 1)",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-2px, -2px)";
                e.currentTarget.style.boxShadow = `4px 4px 0 ${isInk ? "#FFFFFF" : "#0A0A0A"}`;
                e.currentTarget.style.borderColor = accentColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = tokens.boxShadow;
                e.currentTarget.style.borderColor = tokens.borderPrimary;
              }}
            >
              {/* Mini Cover Strip (if set, or subtle accent bar) */}
              {sub.coverUrl ? (
                <div
                  style={{
                    height: "36px",
                    background: sub.coverUrl,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderBottom: `1.5px solid ${tokens.borderPrimary}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    height: "4px",
                    background: accentColor,
                    width: "100%",
                  }}
                />
              )}

              <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px", userSelect: "none" }}>{icon}</span>
                  <span
                    style={{
                      fontFamily: "var(--sans, system-ui, sans-serif)",
                      fontWeight: 700,
                      fontSize: "14px",
                      color: tokens.textPrimary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {sub.title || "Untitled Subpage"}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9px",
                    color: tokens.textSecondary,
                  }}
                >
                  <span>{wc > 0 ? `${wc.toLocaleString()} words` : "Empty"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "2px", color: accentColor, fontWeight: 700 }}>
                    <span>OPEN</span>
                    <ArrowUpRight size={10} />
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Card */}
        <button
          type="button"
          onClick={() => {
            playSound.click();
            onCreateSubpage();
          }}
          style={{
            background: "transparent",
            border: `2px dashed ${tokens.borderSubtle}`,
            borderRadius: "2px",
            minHeight: "90px",
            padding: "16px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            color: tokens.textSecondary,
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            transition: "all 0.12s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = accentColor;
            e.currentTarget.style.color = accentColor;
            e.currentTarget.style.background = tokens.popoverHoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = tokens.borderSubtle;
            e.currentTarget.style.color = tokens.textSecondary;
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Plus size={16} />
          <span>＋ ADD SUBPAGE</span>
        </button>
      </div>
    </div>
  );
};
