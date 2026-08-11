"use client";

import React, { useState } from "react";
import { Bookmark } from "@/types";
import { TilType, tilTypeValues } from "@/db/schema";

interface DischargeModalProps {
  bookmark: Bookmark | null;
  onClose: () => void;
  onSubmit: (input: { type: TilType; body: string; tags: string[] }) => Promise<void>;
}

export const DischargeModal: React.FC<DischargeModalProps> = ({ bookmark, onClose, onSubmit }) => {
  const [type, setType] = useState<TilType>("FACT");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bookmark) return null;

  const reset = () => {
    setType("FACT");
    setBody("");
    setTagInput("");
    setTags([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addTagFromInput = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const handleSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();
    if (!body.trim() || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({ type, body: body.trim(), tags });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discharge bookmark");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="veil on"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("veil")) handleClose();
      }}
    >
      <div className="sheet">
        <header>
          <b>DISCHARGE → WHAT DID YOU LEARN?</b>
          <button onClick={handleClose}>✕</button>
        </header>

        <form onSubmit={handleSubmit} style={{ padding: "16px" }}>
          <div
            style={{
              border: "2px solid var(--ink)",
              background: "var(--cream)",
              padding: "8px 10px",
              marginBottom: "14px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            <div style={{ opacity: 0.6, fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.08em", marginBottom: "3px" }}>
              DISCHARGING
            </div>
            {bookmark.t}
          </div>

          <div className="fld">
            <span className="flbl">TYPE</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
              {tilTypeValues.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    border: "2px solid var(--ink)",
                    background: type === t ? "var(--yel, #FFE600)" : "var(--paper)",
                    boxShadow: type === t ? "2px 2px 0 var(--ink)" : "none",
                    padding: "4px 9px",
                    fontSize: "11px",
                    fontWeight: 800,
                    fontFamily: "var(--mono)",
                    cursor: "pointer",
                    color: "var(--ink)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="fld" style={{ marginTop: "14px" }}>
            <span className="flbl">WHAT DID YOU LEARN?</span>
            <textarea
              className="urlin"
              style={{
                border: "2px solid var(--ink)",
                marginTop: "4px",
                minHeight: "90px",
                width: "100%",
                fontFamily: "inherit",
                fontSize: "13px",
                resize: "vertical",
                padding: "8px 10px",
              }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="The one thing this bookmark actually taught you..."
              autoFocus
            />
          </div>

          <div className="fld" style={{ marginTop: "14px" }}>
            <span className="flbl">TAGS</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px", alignItems: "center" }}>
              {tags.map((t) => (
                <span
                  key={t}
                  onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                  style={{
                    border: "2px solid var(--ink)",
                    background: "var(--ink)",
                    color: "var(--paper)",
                    padding: "3px 8px",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    fontFamily: "var(--mono)",
                    cursor: "pointer",
                  }}
                  title="Remove tag"
                >
                  #{t} ✕
                </span>
              ))}
              <input
                className="urlin"
                style={{ border: "2px solid var(--ink)", flex: 1, minWidth: "120px", padding: "4px 8px", fontSize: "11px" }}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTagFromInput();
                  }
                }}
                onBlur={addTagFromInput}
                placeholder="Add tag + Enter"
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: "12px",
                border: "2px solid var(--pink, #FF007A)",
                background: "var(--paper)",
                color: "var(--pink, #FF007A)",
                padding: "8px 10px",
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
              }}
            >
              {error}
            </div>
          )}

          <div className="sfoot" style={{ padding: "16px 0 0", borderTop: "2px solid var(--ink)", marginTop: "16px" }}>
            <button type="button" onClick={handleClose} disabled={submitting}>
              CANCEL
            </button>
            <button type="submit" className="prime" disabled={submitting || !body.trim()}>
              {submitting ? "DISCHARGING..." : "DISCHARGE ↦"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
