"use client";

import React, { useState } from "react";
import { playSound } from "@/lib/sound";
import { Block, generateBlockId } from "@/lib/notebooks/blocks";

interface ExplainModalProps {
  selection: string;
  explanation: string;
  loading: boolean;
  onAddAsToggle: (toggleBlock: Block) => void;
  onClose: () => void;
  accentColor?: string;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  selection,
  explanation,
  loading,
  onAddAsToggle,
  onClose,
  accentColor = "#7B5CF0",
}) => {
  const handleAddToggle = () => {
    playSound.fileIt();
    const toggleBlock: Block = {
      id: generateBlockId(),
      type: "toggle",
      summary: `Deep dive: ${selection.slice(0, 50)}${selection.length > 50 ? "…" : ""}`,
      body: explanation,
    };
    onAddAsToggle(toggleBlock);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "100%",
        maxWidth: "480px",
        background: "#F3F0E8",
        borderLeft: "3px solid #0A0A0A",
        boxShadow: "-8px 0 0 rgba(10,10,10,0.3)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          background: "#0A0A0A",
          color: "#F0EDE4",
          borderBottom: "3px solid #0A0A0A",
        }}
      >
        <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "10px", fontWeight: 700, color: "#7FE9F7", letterSpacing: "0.15em" }}>
          ✦ EXPLAIN AGAIN · SIDE PANEL
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#F0EDE4",
            fontFamily: "var(--mono, monospace)",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* Selected Passage Preview */}
      <div
        style={{
          padding: "14px 18px",
          background: "#EBE7DC",
          borderBottom: "2px solid rgba(10,10,10,0.14)",
          color: "#0A0A0A",
        }}
      >
        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "8.5px", fontWeight: 700, opacity: 0.5, marginBottom: "4px" }}>
          SELECTED PASSAGE
        </div>
        <div style={{ fontStyle: "italic", fontSize: "14px", lineHeight: "1.4" }}>
          &ldquo;{selection}&rdquo;
        </div>
      </div>

      {/* Explanation Stream / Content */}
      <div style={{ padding: "20px 18px", flex: 1, overflowY: "auto", color: "#0A0A0A" }}>
        {loading ? (
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#6B7280" }}>
            Analyzing surrounding notes and generating explanation…
          </div>
        ) : (
          <div style={{ fontSize: "15px", lineHeight: "1.68", whiteSpace: "pre-wrap" }}>
            {explanation}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        style={{
          padding: "14px 18px",
          borderTop: "3px solid #0A0A0A",
          background: "#EBE7DC",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <button
          type="button"
          disabled={loading || !explanation}
          onClick={handleAddToggle}
          style={{
            width: "100%",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            border: "2px solid #0A0A0A",
            background: "#0A0A0A",
            color: "#B8F04A",
            padding: "10px",
            cursor: "pointer",
            boxShadow: "3px 3px 0 #B8F04A",
          }}
        >
          ＋ ADD AS A TOGGLE BLOCK
        </button>
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "8.5px",
            textAlign: "center",
            opacity: 0.5,
          }}
        >
          Never writes automatically into your page. Only clicking above reaches your notebook.
        </div>
      </div>
    </div>
  );
};
