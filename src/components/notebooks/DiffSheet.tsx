"use client";

import React, { useState } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { BlockRenderer } from "./blocks/BlockRenderer";
import { playSound } from "@/lib/sound";

interface DiffSheetProps {
  originalBlocks: Block[];
  proposedBlocks: Block[];
  summaryOfChanges?: string;
  onApplyAll: () => void;
  onApplySelected: (acceptedBlocks: Block[]) => void;
  onDiscard: () => void;
  accentColor?: string;
}

export const DiffSheet: React.FC<DiffSheetProps> = ({
  originalBlocks,
  proposedBlocks,
  summaryOfChanges,
  onApplyAll,
  onApplySelected,
  onDiscard,
  accentColor = "#7B5CF0",
}) => {
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(
    () => new Set(proposedBlocks.map((b) => b.id))
  );

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
    const accepted = proposedBlocks.filter((b) => selectedBlockIds.has(b.id));
    onApplySelected(accepted);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.75)",
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1050px",
          maxHeight: "90vh",
          background: "#F3F0E8",
          border: "3px solid #0A0A0A",
          boxShadow: "10px 10px 0 #0A0A0A",
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
            borderBottom: "3px solid #0A0A0A",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, color: "#B8F04A", letterSpacing: "0.15em" }}>
              ✦ TIDY MY NOTES · REVIEW PROPOSED CHANGES
            </div>
            <div style={{ fontSize: "14px", opacity: 0.7, marginTop: "2px" }}>
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
            }}
          >
            ✕ CANCEL
          </button>
        </div>

        {/* Diff Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            padding: "20px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {/* Left: Original Blocks */}
          <div
            style={{
              background: "#FFFFFF",
              border: "2px solid rgba(10,10,10,0.2)",
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
                opacity: 0.5,
              }}
            >
              CURRENT NOTEBOOK BLOCKS ({originalBlocks.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {originalBlocks.map((b) => (
                <div key={b.id} style={{ opacity: 0.75 }}>
                  <BlockRenderer block={b} accentColor={accentColor} readOnly />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Proposed Restructured Blocks */}
          <div
            style={{
              background: "#FFFFFF",
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
                color: "#0A0A0A",
              }}
            >
              <span>PROPOSED STRUCTURED BLOCKS ({proposedBlocks.length})</span>
              <span style={{ color: "#16A34A" }}>✓ SELECT TO APPLY</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {proposedBlocks.map((b) => {
                const isSelected = selectedBlockIds.has(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => toggleSelectBlock(b.id)}
                    style={{
                      border: "2px solid",
                      borderColor: isSelected ? "#16A34A" : "rgba(10,10,10,0.15)",
                      background: isSelected ? "#F0FDF4" : "#FFFFFF",
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
                          border: "1.5px solid #0A0A0A",
                          background: isSelected ? "#16A34A" : "#FFFFFF",
                          color: "#FFFFFF",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "9px",
                          fontWeight: 700,
                        }}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                      <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 700, opacity: 0.5 }}>
                        {b.type.toUpperCase()} BLOCK
                      </span>
                    </div>
                    <BlockRenderer block={b} accentColor={accentColor} readOnly />
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
            borderTop: "3px solid #0A0A0A",
            background: "#EBE7DC",
          }}
        >
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, opacity: 0.6 }}>
            {selectedBlockIds.size} of {proposedBlocks.length} blocks accepted
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onDiscard}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: "2px solid #0A0A0A",
                background: "#FFFFFF",
                padding: "9px 15px",
                cursor: "pointer",
              }}
            >
              DISCARD ALL
            </button>
            <button
              type="button"
              onClick={handleConfirmSelected}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                border: "2px solid #0A0A0A",
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
