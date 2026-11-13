"use client";

import React, { useState, useRef } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { BlockRenderer } from "./blocks/BlockRenderer";
import { playSound } from "@/lib/sound";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";

interface DiffSheetProps {
  originalBlocks: Block[];
  proposedBlocks: Block[];
  summaryOfChanges?: string;
  onApplyAll?: () => void;
  onApplySelected: (acceptedBlocks: Block[]) => void;
  onDiscard: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const DiffSheet: React.FC<DiffSheetProps> = ({
  originalBlocks,
  proposedBlocks,
  summaryOfChanges,
  onApplyAll,
  onApplySelected,
  onDiscard,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(
    () => new Set(proposedBlocks.map((b) => b.id))
  );

  useModalFocusTrap({
    isOpen: true,
    onClose: onDiscard,
    containerRef: dialogRef,
  });

  const toggleSelectBlock = (id: string) => {
    playSound.pop();
    const next = new Set(selectedBlockIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedBlockIds(next);
  };

  const handleConfirmSelected = () => {
    playSound.fileIt();

    // Unchecking a proposed block must not delete its content — it means
    // "don't apply this specific change," not "throw this text away." The
    // tidy prompt is instructed to preserve the id of any block it didn't
    // change, so a rejected block's id usually still matches an original
    // block; restore that original in its place instead of just omitting it.
    const originalById = new Map(originalBlocks.map((b) => [b.id, b] as const));
    const proposedIds = new Set(proposedBlocks.map((b) => b.id));

    const merged: Block[] = [];
    for (const b of proposedBlocks) {
      if (selectedBlockIds.has(b.id)) {
        merged.push(b);
        continue;
      }
      const original = originalById.get(b.id);
      if (original) merged.push(original);
      // No matching original (a genuinely new block the AI introduced,
      // e.g. a new heading from restructuring) — correctly just omitted.
    }

    // Safety net: any original block the proposal never referenced at all
    // (the model failed to preserve its id while merging/dropping it) is
    // still content the user never got to review — keep it rather than
    // silently losing it.
    for (const b of originalBlocks) {
      if (!proposedIds.has(b.id)) merged.push(b);
    }

    onApplySelected(merged);
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Review proposed note changes"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.75)",
        backdropFilter: "blur(3px)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1050px",
          maxHeight: "90vh",
          background: tokens.canvasBg,
          color: tokens.textPrimary,
          border: `3px solid ${tokens.borderPrimary}`,
          boxShadow: tokens.popoverShadow,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            background: "#0A0A0A",
            color: "#F0EDE4",
            borderBottom: `3px solid ${tokens.borderPrimary}`,
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, color: "#B8F04A", letterSpacing: "0.15em" }}>
              ✦ TIDY MY NOTES · REVIEW PROPOSED CHANGES
            </div>
            <div style={{ fontSize: "14px", opacity: 0.78, marginTop: "2px" }}>
              {summaryOfChanges || "Reorganized loose fragments under clear headings, identified traps into gotchas, and preserved unedited blocks."}
            </div>
          </div>
          <button
            type="button"
            onClick={onDiscard}
            style={{
              background: "transparent",
              border: "2px solid #F0EDE4",
              color: "#F0EDE4",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              padding: "5px 10px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ✕ CANCEL
          </button>
        </div>

        {/* Diff Columns */}
        <div className="nb-diff-grid">
          {/* Left: Original Blocks */}
          <div
            style={{
              background: tokens.cardBg,
              border: `2px solid ${tokens.borderSubtle}`,
              padding: "16px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                marginBottom: "12px",
                color: tokens.textMuted,
              }}
            >
              CURRENT NOTEBOOK BLOCKS ({originalBlocks.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {originalBlocks.map((b) => (
                <div key={b.id} style={{ opacity: 0.78 }}>
                  <BlockRenderer block={b} accentColor={accentColor} theme={theme} readOnly />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Proposed Restructured Blocks */}
          <div
            style={{
              background: tokens.cardBg,
              border: `3px solid ${accentColor}`,
              boxShadow: `4px 4px 0 ${accentColor}`,
              padding: "16px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                marginBottom: "12px",
                color: tokens.textPrimary,
              }}
            >
              <span>PROPOSED STRUCTURED BLOCKS ({proposedBlocks.length})</span>
              <span style={{ color: tokens.successText }}>✓ SELECT TO APPLY</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {proposedBlocks.map((b) => {
                const isSelected = selectedBlockIds.has(b.id);
                return (
                  <div
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => toggleSelectBlock(b.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleSelectBlock(b.id);
                      }
                    }}
                    style={{
                      border: "2px solid",
                      borderColor: isSelected ? tokens.successText : tokens.borderSubtle,
                      background: isSelected
                        ? (tokens.isDark ? "rgba(22, 163, 74, 0.14)" : "#F0FDF4")
                        : tokens.cardBg,
                      padding: "8px 10px",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          border: `1.5px solid ${tokens.borderPrimary}`,
                          background: isSelected ? "#16A34A" : tokens.cardBg,
                          color: "#FFFFFF",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "9px",
                          fontWeight: 700,
                        }}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 700, color: tokens.textMuted }}>
                        {b.type.toUpperCase()} BLOCK
                      </span>
                    </div>
                    <BlockRenderer block={b} accentColor={accentColor} theme={theme} readOnly />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: `3px solid ${tokens.borderPrimary}`,
            background: tokens.sidebarBg,
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, color: tokens.textSecondary }}>
            {selectedBlockIds.size} of {proposedBlocks.length} blocks accepted
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onDiscard}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: `2px solid ${tokens.borderPrimary}`,
                background: tokens.cardBg,
                color: tokens.textPrimary,
                padding: "9px 15px",
                cursor: "pointer",
              }}
            >
              DISCARD ALL
            </button>
            {onApplyAll && selectedBlockIds.size < proposedBlocks.length && (
              <button
                type="button"
                onClick={onApplyAll}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: tokens.popoverBg,
                  color: tokens.textPrimary,
                  padding: "9px 15px",
                  cursor: "pointer",
                }}
              >
                APPLY ALL
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirmSelected}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: `2px solid ${tokens.borderPrimary}`,
                background: "#0A0A0A",
                color: "#B8F04A",
                padding: "9px 16px",
                cursor: "pointer",
                boxShadow: "3px 3px 0 #B8F04A",
              }}
            >
              APPLY ACCEPTED BLOCKS →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
