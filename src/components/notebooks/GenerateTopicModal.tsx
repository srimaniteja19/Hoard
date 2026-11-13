"use client";

import React, { useState, useEffect, useRef } from "react";
import { playSound } from "@/lib/sound";
import { X, Sparkles, Wand2, Compass, Layers, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Block } from "@/lib/notebooks/blocks";

import { getThemeTokens, NotebookTheme } from "@/lib/notebooks/theme";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";

interface GenerateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (result: {
    title: string;
    icon: string;
    coverUrl: string;
    blocks: Block[];
    destination: "current" | "new";
  }) => void;
  currentLessonTitle?: string;
  courseTitle?: string;
  hasExistingContent?: boolean;
  theme?: NotebookTheme;
}

const INSPIRATION_CHIPS = [
  { label: "☕ How JVM works (Classloader, JIT, GC)", query: "How the Java Virtual Machine (JVM) works internally: Classloader, Memory Areas, JIT Compilation, and Garbage Collection" },
  { label: "⚡ Raft Consensus & Leader Election", query: "Raft Consensus Algorithm: Leader Election, Log Replication, Heartbeats, and Safety Invariants" },
  { label: "🧠 Transformer Attention Mechanics", query: "Transformer Architecture: Scaled Dot-Product Attention, Multi-Head Keys/Queries/Values, and Positional Encoding" },
  { label: "🗄️ Postgres MVCC & WAL Internals", query: "PostgreSQL Internals: Multi-Version Concurrency Control (MVCC), Write-Ahead Logging (WAL), and Vacuuming" },
  { label: "☸️ Kubernetes Control Plane", query: "Kubernetes Control Plane Architecture: API Server, Etcd, Controller Manager, Scheduler, and Kubelet Reconcile Loop" },
  { label: "🌐 Linux TCP/IP & Epoll", query: "Linux Kernel Network Stack: Socket Buffers, TCP State Machine, Ring Buffers, and Epoll Event Loop" },
];

const GENERATION_PHASES = [
  "Outlining key concepts and structure…",
  "Generating diagram and code examples…",
  "Writing core explanations and worked walkthroughs…",
  "Adding common pitfalls and practice prompts…",
];

export const GenerateTopicModal: React.FC<GenerateTopicModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
  currentLessonTitle,
  courseTitle = "COURSE",
  hasExistingContent = false,
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const [prompt, setPrompt] = useState("");
  const [depth, setDepth] = useState<"comprehensive" | "visual" | "concise">("comprehensive");
  const [destination, setDestination] = useState<"current" | "new">(
    hasExistingContent ? "new" : "current"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useModalFocusTrap({
    isOpen,
    onClose: () => {
      if (!isGenerating) onClose();
    },
    containerRef: dialogRef,
    initialFocusRef: textareaRef,
    closeOnEscape: !isGenerating,
  });

  useEffect(() => {
    if (isOpen) {
      // Default to current lesson title if present, else empty
      setPrompt(currentLessonTitle && currentLessonTitle !== "Untitled Page" && currentLessonTitle !== "New Page" ? currentLessonTitle : "");
      setErrorMessage(null);
      setIsGenerating(false);
      setPhaseIdx(0);
      setDestination(hasExistingContent ? "new" : "current");
    }
  }, [isOpen, currentLessonTitle, hasExistingContent]);

  // Rotate through generation phases while loading
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setPhaseIdx((p) => (p + 1) % GENERATION_PHASES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = prompt.trim();
    if (!query || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);
    playSound.click();

    try {
      const res = await fetch("/api/notebooks/generate-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: query,
          courseTitle,
          depth,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate notes.");
      }

      playSound.fileIt();
      onGenerated({
        title: data.title || query,
        icon: data.icon || "💡",
        coverUrl: data.coverUrl || "linear-gradient(135deg, #1E293B 0%, #3B82F6 100%)",
        blocks: data.blocks || [],
        destination,
      });
      onClose();
    } catch (err: any) {
      console.error("[GenerateTopicModal] Error:", err);
      setErrorMessage(err.message || "An error occurred while synthesizing notes.");
      setIsGenerating(false);
    }
  };

  const handleSelectChip = (chipQuery: string) => {
    setPrompt(chipQuery);
    playSound.pop();
    textareaRef.current?.focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.7)",
        backdropFilter: "blur(5px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: "16px",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={(e) => {
        if (!isGenerating && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Generate topic notes"
        style={{
          width: "100%",
          maxWidth: "620px",
          maxHeight: "92vh",
          overflowY: "auto",
          border: `3px solid ${tokens.borderPrimary}`,
          background: tokens.cardBg,
          color: tokens.textPrimary,
          boxShadow: tokens.boxShadow,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            background: "#FCE94F",
            color: "#0A0A0A",
            borderBottom: `3px solid ${tokens.borderPrimary}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <Sparkles size={18} strokeWidth={2.5} />
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
              }}
            >
              GENERATE TOPIC NOTES
            </span>
          </div>

          {!isGenerating && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: "4px",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: "22px 22px 18px" }}>
          {/* Prompt / Question */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                marginBottom: "8px",
                color: tokens.textPrimary,
              }}
            >
              <span>WHAT DO YOU WANT TO STUDY OR MASTER? *</span>
              <span style={{ color: tokens.textMuted, fontSize: "9px" }}>TOPIC OR QUESTION</span>
            </label>
            <textarea
              ref={textareaRef}
              disabled={isGenerating}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. How JVM works internally: Classloader, Memory Areas, JIT Compilation, and Garbage Collection..."
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                fontFamily: "var(--display, sans-serif)",
                fontSize: "16px",
                fontWeight: 700,
                lineHeight: "1.4",
                letterSpacing: "-0.01em",
                border: `2.5px solid ${tokens.borderPrimary}`,
                background: isGenerating ? tokens.sidebarBg : tokens.canvasBg,
                color: tokens.textPrimary,
                resize: "none",
                boxShadow: "3px 3px 0 rgba(10,10,10,0.1)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>

          {/* Quick Inspiration Chips */}
          {!isGenerating && (
            <div style={{ marginBottom: "18px" }}>
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  color: tokens.textMuted,
                  marginBottom: "6px",
                }}
              >
                QUICK INSPIRATION:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {INSPIRATION_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectChip(chip.query)}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      background: prompt === chip.query ? tokens.accentColor : tokens.sidebarBg,
                      color: prompt === chip.query ? tokens.accentFg : tokens.textPrimary,
                      border: `1.5px solid ${tokens.borderPrimary}`,
                      padding: "4px 8px",
                      cursor: "pointer",
                      borderRadius: "2px",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Depth / Style & Destination Selectors */}
          {!isGenerating && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                marginBottom: "20px",
                padding: "12px",
                background: tokens.sidebarBg,
                border: `1.5px solid ${tokens.borderSubtle}`,
              }}
            >
              {/* Depth Selector */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    marginBottom: "6px",
                    color: tokens.textPrimary,
                  }}
                >
                  DEPTH & FORMAT:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {[
                    { id: "comprehensive", label: "🔥 Full Architectural Deep-Dive" },
                    { id: "visual", label: "📐 Visual Mental Models & Flows" },
                    { id: "concise", label: "⚡ Executive Architecture Summary" },
                  ].map((d) => (
                    <label
                      key={d.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        fontWeight: depth === d.id ? 800 : 600,
                        color: tokens.textPrimary,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="depth"
                        checked={depth === d.id}
                        onChange={() => setDepth(d.id as any)}
                        style={{ accentColor: tokens.accentColor }}
                      />
                      <span>{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Destination Selector */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    marginBottom: "6px",
                    color: tokens.textPrimary,
                  }}
                >
                  SAVE DESTINATION:
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: destination === "current" ? 800 : 600,
                      color: tokens.textPrimary,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === "current"}
                      onChange={() => setDestination("current")}
                      style={{ accentColor: tokens.accentColor }}
                    />
                    <span>Populate active page notes</span>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: destination === "new" ? 800 : 600,
                      color: tokens.textPrimary,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === "new"}
                      onChange={() => setDestination("new")}
                      style={{ accentColor: tokens.accentColor }}
                    />
                    <span>Create brand-new lesson page</span>
                  </label>

                  {hasExistingContent && destination === "current" && (
                    <div
                      style={{
                        marginTop: "6px",
                        padding: "6px 8px",
                        background: tokens.isDark ? "rgba(251, 191, 36, 0.14)" : "#FEF3C7",
                        border: "1.5px solid #D97706",
                        color: tokens.isDark ? "#FCD34D" : "#92400E",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9px",
                        fontWeight: 700,
                        lineHeight: 1.35,
                      }}
                    >
                      Warning: replaces current page notes, title, and cover.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading Animation & Progress Ticker */}
          {isGenerating && (
            <div
              style={{
                padding: "24px 18px",
                background: "#0A0A0A",
                color: "#FFFFFF",
                border: `2px solid ${tokens.borderPrimary}`,
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#B8F04A",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  marginBottom: "8px",
                }}
              >
                <Wand2 size={16} className="animate-spin" />
                <span>DRAFTING TOPIC NOTES…</span>
              </div>
              <p
                style={{
                  margin: "0 auto",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10.5px",
                  color: "#FCE94F",
                  letterSpacing: "0.06em",
                }}
              >
                {GENERATION_PHASES[phaseIdx]}
              </p>
              <div
                style={{
                  marginTop: "14px",
                  fontSize: "9px",
                  color: "rgba(255,255,255,0.6)",
                  fontFamily: "var(--mono, monospace)",
                }}
              >
                Generating diagram, worked examples, and practice prompts.
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                padding: "10px 14px",
                background: "#FFF1F2",
                border: "2px solid #EF4444",
                color: "#991B1B",
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              paddingTop: "12px",
              borderTop: `2px solid ${tokens.borderSubtle}`,
            }}
          >
            <button
              type="button"
              disabled={isGenerating}
              onClick={onClose}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "9px 16px",
                border: `2px solid ${tokens.borderSubtle}`,
                background: "transparent",
                color: tokens.textPrimary,
                cursor: isGenerating ? "not-allowed" : "pointer",
                opacity: isGenerating ? 0.4 : 1,
              }}
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                padding: "10px 22px",
                border: `2.5px solid ${tokens.borderPrimary}`,
                background: !prompt.trim() || isGenerating ? tokens.sidebarBg : "#B8F04A",
                color: !prompt.trim() || isGenerating ? tokens.textMuted : "#0A0A0A",
                cursor: !prompt.trim() || isGenerating ? "not-allowed" : "pointer",
                boxShadow: !prompt.trim() || isGenerating ? "none" : tokens.boxShadow,
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                transition: "all 0.1s ease",
              }}
              onMouseEnter={(e) => {
                if (prompt.trim() && !isGenerating) {
                  e.currentTarget.style.transform = "translate(-1px, -1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (prompt.trim() && !isGenerating) {
                  e.currentTarget.style.transform = "none";
                }
              }}
            >
              <Sparkles size={14} />
              <span>{isGenerating ? "GENERATING NOTES…" : "GENERATE NOTES"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
