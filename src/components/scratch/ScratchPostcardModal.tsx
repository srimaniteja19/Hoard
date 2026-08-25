"use client";

import React, { useEffect, useState } from "react";
import { ScratchPostcardRow } from "@/db/schema";
import { playSound } from "@/lib/sound";

interface ScratchPostcardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScratchPostcardModal: React.FC<ScratchPostcardModalProps> = ({ isOpen, onClose }) => {
  const [postcard, setPostcard] = useState<ScratchPostcardRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch("/api/scratch/postcard", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to generate postcard");
        const data: ScratchPostcardRow = await res.json();
        setPostcard(data);
      })
      .catch(() => setError("Failed to generate this week's postcard"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!postcard) return;
    playSound.copy();
    const tallies = Object.entries(postcard.kindTallies as Record<string, number>)
      .map(([kind, count]) => `- ${kind}: ${count}`)
      .join("\n");
    const md = `# Week of ${postcard.weekStart}\n\n${postcard.totalCount} scraps · ${postcard.daysLogged}/7 days logged · ${postcard.currentStreak}-day streak\n\n## This week\n${tallies}\n${
      postcard.highlightContent ? `\n## Highlight\n> ${postcard.highlightContent}\n` : ""
    }`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
          maxWidth: "480px",
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
          📮 THIS WEEK&apos;S POSTCARD
        </div>

        {loading && <div style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>GENERATING...</div>}
        {error && <div style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "var(--pink)" }}>{error}</div>}

        {postcard && (
          <>
            <h2
              style={{
                fontFamily: "var(--display)",
                fontWeight: 800,
                fontSize: "22px",
                margin: "0 0 12px",
                letterSpacing: "-0.02em",
              }}
            >
              {postcard.weekStart} – {postcard.weekEnd}
            </h2>

            <div style={{ fontFamily: "var(--mono)", fontSize: "13px", marginBottom: "16px" }}>
              {postcard.totalCount} scraps · {postcard.daysLogged}/7 days logged · {postcard.currentStreak}-day
              streak
              {postcard.previousWeekTotal > 0 &&
                ` · ${postcard.totalCount >= postcard.previousWeekTotal ? "+" : ""}${
                  postcard.totalCount - postcard.previousWeekTotal
                } vs last week`}
            </div>

            <div style={{ marginBottom: "16px" }}>
              {Object.entries(postcard.kindTallies as Record<string, number>).map(([kind, count]) => (
                <div key={kind} style={{ fontFamily: "var(--mono)", fontSize: "13px", marginBottom: "4px" }}>
                  {kind}: {count}
                </div>
              ))}
            </div>

            {postcard.highlightContent && (
              <div
                style={{
                  background: "var(--shelf)",
                  border: "2px solid var(--ink)",
                  padding: "12px",
                  fontSize: "14px",
                  marginBottom: "18px",
                }}
              >
                {postcard.highlightContent}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleCopy}
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
                {copied ? "COPIED!" : "COPY MD"}
              </button>
              <a
                href={`/api/scratch/postcard/${postcard.weekStart}/image`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 800,
                  fontSize: "11px",
                  padding: "10px 18px",
                  border: "2px solid var(--ink)",
                  background: "var(--violet)",
                  color: "#fff",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                onClick={() => playSound.click()}
              >
                DOWNLOAD IMAGE
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
