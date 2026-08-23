"use client";

import React, { useState } from "react";
import { ScrapRow } from "@/db/schema";

interface ScratchWeldModalProps {
  isOpen: boolean;
  targetScrap: ScrapRow | null;
  otherScraps: ScrapRow[];
  onClose: () => void;
  onConfirmWeld: (targetId: string, sourceIdOrText: string) => Promise<void> | void;
}

export const ScratchWeldModal: React.FC<ScratchWeldModalProps> = ({
  isOpen,
  targetScrap,
  otherScraps,
  onClose,
  onConfirmWeld,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [customSummary, setCustomSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !targetScrap) return null;

  const candidates = otherScraps.filter((s) => s.id !== targetScrap.id);

  const handleWeld = async () => {
    setLoading(true);
    try {
      const source = selectedSourceId || customSummary || "earlier thread";
      await onConfirmWeld(targetScrap.id, source);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(2px)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)",
          border: "var(--b) solid var(--ink)",
          boxShadow: "6px 6px 0 var(--violet)",
          maxWidth: "540px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "clamp(16px, 4vw, 24px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.16em",
            color: "var(--violet)",
            marginBottom: "8px",
          }}
        >
          ◈ WELD SCRAPS TOGETHER
        </div>

        <h2
          style={{
            fontFamily: "var(--display)",
            fontWeight: 800,
            fontSize: "20px",
            margin: "0 0 12px",
            letterSpacing: "-0.02em",
          }}
        >
          Connect thread to existing memory
        </h2>

        <div
          style={{
            background: "var(--shelf)",
            border: "2px solid var(--ink)",
            padding: "12px",
            fontSize: "14px",
            marginBottom: "18px",
          }}
        >
          <strong>Target:</strong> {targetScrap.content}
        </div>

        <label
          style={{
            display: "block",
            fontFamily: "var(--mono)",
            fontSize: "10.5px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            marginBottom: "6px",
          }}
        >
          SELECT EARLIER SCRAP TO WELD WITH:
        </label>
        <select
          value={selectedSourceId}
          onChange={(e) => setSelectedSourceId(e.target.value)}
          style={{
            width: "100%",
            border: "2px solid var(--ink)",
            padding: "10px",
            fontFamily: "var(--body)",
            fontSize: "14px",
            background: "var(--card)",
            color: "var(--ink)",
            marginBottom: "14px",
          }}
        >
          <option value="">-- Choose from earlier scraps --</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              [{c.kind}] {c.content.slice(0, 50)}...
            </option>
          ))}
        </select>

        <label
          style={{
            display: "block",
            fontFamily: "var(--mono)",
            fontSize: "10.5px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            marginBottom: "6px",
          }}
        >
          OR WRITE CUSTOM THREAD TOPIC:
        </label>
        <input
          type="text"
          value={customSummary}
          onChange={(e) => setCustomSummary(e.target.value)}
          placeholder="e.g. transaction boundaries · state leakage"
          style={{
            width: "100%",
            border: "2px solid var(--ink)",
            padding: "10px",
            fontFamily: "var(--body)",
            fontSize: "14px",
            background: "var(--card)",
            color: "var(--ink)",
            marginBottom: "20px",
          }}
        />

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "var(--mono)",
              fontWeight: 700,
              fontSize: "11px",
              padding: "10px 16px",
              border: "2px solid var(--ink)",
              background: "var(--card)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleWeld}
            disabled={loading || (!selectedSourceId && !customSummary.trim())}
            style={{
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "11px",
              padding: "10px 18px",
              border: "2px solid var(--ink)",
              background: "var(--violet)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {loading ? "WELDING..." : "WELD THREAD"}
          </button>
        </div>
      </div>
    </div>
  );
};
