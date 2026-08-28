"use client";

import React, { useState } from "react";
import { BookRow } from "@/db/schema";
import { playSound } from "@/lib/sound";

interface SynthesisData {
  zineTitle: string;
  subtitle: string;
  thesisReframe: string;
  keyTakeaways: Array<{
    concept: string;
    synthesis: string;
    anchorQuote?: string;
  }>;
  evolutionOfThought: string;
  actionBlueprint: Array<{
    title: string;
    type: "HABIT" | "PLAYBOOK" | "ACTION_ITEM";
    description: string;
    frequency?: string;
  }>;
  markdownZine: string;
}

interface ReadingSynthesisModalProps {
  isOpen: boolean;
  book: BookRow;
  synthesis: SynthesisData | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const ReadingSynthesisModal: React.FC<ReadingSynthesisModalProps> = ({
  isOpen,
  book,
  synthesis,
  loading,
  onClose,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<"zine" | "blueprint" | "markdown">("zine");
  const [promotedTil, setPromotedTil] = useState(false);
  const [promotedTodos, setPromotedTodos] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePromoteToTil = async () => {
    if (!synthesis) return;
    try {
      playSound.click();
      const res = await fetch("/api/til", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${synthesis.zineTitle} (Reading Synthesis)`,
          content: synthesis.markdownZine,
          source: `Book: ${book.title} by ${book.author}`,
          tags: ["reading", "synthesis", "book-notes"],
        }),
      });
      if (res.ok) {
        setPromotedTil(true);
        playSound.fileIt();
      }
    } catch {
      // ignore
    }
  };

  const handleAddTodos = async () => {
    if (!synthesis || synthesis.actionBlueprint.length === 0) return;
    try {
      playSound.click();
      for (const item of synthesis.actionBlueprint) {
        await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `[${item.type}] ${item.title}`,
            notes: `${item.description} (From reading "${book.title}")`,
            recurrenceRule: item.frequency || null,
          }),
        });
      }
      setPromotedTodos(true);
      playSound.fileIt();
    } catch {
      // ignore
    }
  };

  const handleCopyMarkdown = () => {
    if (!synthesis) return;
    navigator.clipboard.writeText(synthesis.markdownZine);
    setCopied(true);
    playSound.click();
    setTimeout(() => setCopied(false), 2000);
  };

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
          maxWidth: "840px",
          maxHeight: "90vh",
          backgroundColor: "var(--card)",
          border: "var(--b) solid var(--ink)",
          boxShadow: "10px 10px 0 var(--ink)",
          color: "var(--ink)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "var(--b) solid var(--ink)",
            background: "var(--ink)",
            color: "var(--paper)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, letterSpacing: "0.14em", opacity: 0.8 }}>
              READING SYNTHESIS &amp; ZINE
            </div>
            <div style={{ fontFamily: "var(--display)", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.03em" }}>
              {book.title}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onRefresh();
              }}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                padding: "6px 12px",
                border: "2px solid var(--paper)",
                background: "transparent",
                color: "var(--paper)",
                cursor: "pointer",
              }}
            >
              🔄 RE-SYNTHESIZE
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "12px",
                fontWeight: 800,
                padding: "6px 12px",
                border: "2px solid var(--paper)",
                background: "var(--yellow)",
                color: "#0A0A0A",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "2px solid var(--ink)",
            background: "var(--shade)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("zine")}
            style={{
              padding: "10px 18px",
              fontFamily: "var(--mono)",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              border: "none",
              borderRight: "2px solid var(--ink)",
              background: activeTab === "zine" ? "var(--card)" : "transparent",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            📖 ZINE ESSAY
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("blueprint")}
            style={{
              padding: "10px 18px",
              fontFamily: "var(--mono)",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              border: "none",
              borderRight: "2px solid var(--ink)",
              background: activeTab === "blueprint" ? "var(--card)" : "transparent",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            ⚡ ACTION BLUEPRINT ({synthesis?.actionBlueprint.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("markdown")}
            style={{
              padding: "10px 18px",
              fontFamily: "var(--mono)",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              border: "none",
              background: activeTab === "markdown" ? "var(--card)" : "transparent",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            📋 RAW MARKDOWN
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--display)", fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>
                Synthesizing Marginalia...
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.65 }}>
                Distilling quotes, reflections, counter-arguments, and action steps into an editorial zine.
              </div>
            </div>
          ) : !synthesis ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p>No synthesis generated yet.</p>
            </div>
          ) : activeTab === "zine" ? (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontFamily: "var(--display)", fontSize: "28px", fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
                  {synthesis.zineTitle}
                </h1>
                <p style={{ fontFamily: "var(--quote)", fontStyle: "italic", fontSize: "16px", opacity: 0.8, marginTop: "6px" }}>
                  {synthesis.subtitle}
                </p>
              </div>

              {/* Core Thesis Box */}
              <div
                style={{
                  background: "var(--shade)",
                  border: "2px solid var(--ink)",
                  padding: "18px 20px",
                  marginBottom: "28px",
                  boxShadow: "4px 4px 0 var(--ink)",
                }}
              >
                <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", fontWeight: 800, letterSpacing: "0.14em", marginBottom: "8px" }}>
                  CORE THESIS REFRAME
                </div>
                <p style={{ fontFamily: "var(--body)", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>
                  {synthesis.thesisReframe}
                </p>
              </div>

              {/* Key Takeaways */}
              <div style={{ marginBottom: "28px" }}>
                <h3 style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 800, letterSpacing: "0.14em", marginBottom: "14px" }}>
                  CONCEPTUAL BREAKTHROUGHS
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {synthesis.keyTakeaways.map((takeaway, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "2px solid var(--ink)",
                        background: "var(--card)",
                        padding: "16px",
                        boxShadow: "3px 3px 0 var(--ink)",
                      }}
                    >
                      <div style={{ fontFamily: "var(--display)", fontSize: "16px", fontWeight: 800, marginBottom: "6px" }}>
                        {idx + 1}. {takeaway.concept}
                      </div>
                      <p style={{ fontFamily: "var(--body)", fontSize: "14.5px", lineHeight: 1.5, margin: 0, opacity: 0.9 }}>
                        {takeaway.synthesis}
                      </p>
                      {takeaway.anchorQuote && (
                        <blockquote
                          style={{
                            margin: "10px 0 0",
                            paddingLeft: "12px",
                            borderLeft: "3px solid var(--yellow)",
                            fontFamily: "var(--quote)",
                            fontStyle: "italic",
                            fontSize: "14px",
                            opacity: 0.85,
                          }}
                        >
                          "{takeaway.anchorQuote}"
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Evolution of Thought */}
              <div style={{ marginBottom: "28px" }}>
                <h3 style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 800, letterSpacing: "0.14em", marginBottom: "10px" }}>
                  EVOLUTION OF THOUGHT ACROSS CHAPTERS
                </h3>
                <p style={{ fontFamily: "var(--body)", fontSize: "15px", lineHeight: 1.65, opacity: 0.9 }}>
                  {synthesis.evolutionOfThought}
                </p>
              </div>
            </div>
          ) : activeTab === "blueprint" ? (
            <div>
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{ fontFamily: "var(--display)", fontSize: "22px", fontWeight: 800, margin: 0 }}>
                  30-Day Implementation Blueprint
                </h2>
                <p style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.7, marginTop: "4px" }}>
                  Actionable playbooks, recurring rituals, and immediate todos extracted from your application notes.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {synthesis.actionBlueprint.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "2px solid var(--ink)",
                      background: "var(--card)",
                      padding: "16px 18px",
                      boxShadow: "3px 3px 0 var(--ink)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "9px",
                        fontWeight: 800,
                        padding: "3px 7px",
                        border: "1.5px solid var(--ink)",
                        background:
                          item.type === "HABIT" ? "var(--lime)" : item.type === "PLAYBOOK" ? "var(--yellow)" : "var(--shade)",
                        color: "#0A0A0A",
                      }}
                    >
                      {item.type}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: "15px" }}>
                        {item.title}
                      </div>
                      <div style={{ fontFamily: "var(--body)", fontSize: "13.5px", opacity: 0.85, marginTop: "4px" }}>
                        {item.description}
                      </div>
                      {item.frequency && (
                        <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", fontWeight: 700, opacity: 0.65, marginTop: "6px" }}>
                          🔁 Frequency: {item.frequency}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <pre
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  background: "var(--shade)",
                  padding: "16px",
                  border: "2px solid var(--ink)",
                  margin: 0,
                }}
              >
                {synthesis.markdownZine}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {synthesis && (
          <div
            style={{
              padding: "14px 22px",
              borderTop: "var(--b) solid var(--ink)",
              background: "var(--card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={handleCopyMarkdown}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                padding: "8px 14px",
                border: "2px solid var(--ink)",
                background: "var(--shade)",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              {copied ? "✓ COPIED!" : "📋 COPY MARKDOWN"}
            </button>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handlePromoteToTil}
                disabled={promotedTil}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "8px 16px",
                  border: "2px solid var(--ink)",
                  background: promotedTil ? "var(--lime)" : "var(--yellow)",
                  color: "#0A0A0A",
                  boxShadow: "3px 3px 0 var(--ink)",
                  cursor: promotedTil ? "default" : "pointer",
                }}
              >
                {promotedTil ? "✓ SAVED TO TIL CODEX" : "🔮 PROMOTE TO TIL CODEX"}
              </button>

              <button
                type="button"
                onClick={handleAddTodos}
                disabled={promotedTodos || synthesis.actionBlueprint.length === 0}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "8px 16px",
                  border: "2px solid var(--ink)",
                  background: promotedTodos ? "var(--lime)" : "var(--ink)",
                  color: promotedTodos ? "#0A0A0A" : "var(--paper)",
                  boxShadow: "3px 3px 0 var(--ink)",
                  cursor: promotedTodos ? "default" : "pointer",
                }}
              >
                {promotedTodos ? "✓ ACTIONS ADDED TO TODOS" : "⚡ ADD ALL ACTIONS TO TODOS"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
