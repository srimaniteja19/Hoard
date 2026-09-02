"use client";

import React, { useState, useEffect, useRef } from "react";
import { playSound } from "@/lib/sound";
import { X, Sparkles, Wand2, Compass, Layers, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Block } from "@/lib/notebooks/blocks";

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
  "Analyzing subject architecture & runtime boundaries…",
  "Synthesizing Mermaid.js system illustration & data flows…",
  "Compiling worked examples, memory models & code mechanics…",
  "Formulating gotchas, invariants & hands-on lab drills…",
];

export const GenerateTopicModal: React.FC<GenerateTopicModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
  currentLessonTitle,
  courseTitle = "COURSE",
}) => {
  const [prompt, setPrompt] = useState("");
  const [depth, setDepth] = useState<"comprehensive" | "visual" | "concise">("comprehensive");
  const [destination, setDestination] = useState<"current" | "new">("current");
  const [isGenerating, setIsGenerating] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Default to current lesson title if present, else empty
      setPrompt(currentLessonTitle && currentLessonTitle !== "Untitled Page" && currentLessonTitle !== "New Page" ? currentLessonTitle : "");
      setErrorMessage(null);
      setIsGenerating(false);
      setPhaseIdx(0);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen, currentLessonTitle]);

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
        style={{
          width: "100%",
          maxWidth: "620px",
          maxHeight: "92vh",
          overflowY: "auto",
          border: "3px solid #0A0A0A",
          background: "#FFFFFF",
          boxShadow: "10px 10px 0 #0A0A0A",
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
            borderBottom: "3px solid #0A0A0A",
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
              AUTONOMOUS STUDY PLAYBOOK SYNTHESIZER
            </span>
          </div>

          {!isGenerating && (
            <button
              type="button"
              onClick={onClose}
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
                color: "#0A0A0A",
              }}
            >
              <span>WHAT DO YOU WANT TO STUDY OR MASTER? *</span>
              <span style={{ opacity: 0.5, fontSize: "9px" }}>QUESTION OR ARCHITECTURAL TOPIC</span>
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
                border: "2.5px solid #0A0A0A",
                background: isGenerating ? "#EBE7DC" : "#FDFCFA",
                color: "#0A0A0A",
                outline: "none",
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
                  opacity: 0.5,
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
                      background: prompt === chip.query ? "#0A0A0A" : "#F3F0E8",
                      color: prompt === chip.query ? "#FCE94F" : "#0A0A0A",
                      border: "1.5px solid #0A0A0A",
                      padding: "3px 8px",
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
                background: "#F6F4ED",
                border: "1.5px solid rgba(10,10,10,0.15)",
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
                    color: "#0A0A0A",
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
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="depth"
                        checked={depth === d.id}
                        onChange={() => setDepth(d.id as any)}
                        style={{ accentColor: "#0A0A0A" }}
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
                    color: "#0A0A0A",
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
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === "current"}
                      onChange={() => setDestination("current")}
                      style={{ accentColor: "#0A0A0A" }}
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
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="destination"
                      checked={destination === "new"}
                      onChange={() => setDestination("new")}
                      style={{ accentColor: "#0A0A0A" }}
                    />
                    <span>Create brand-new lesson page</span>
                  </label>
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
                border: "2px solid #0A0A0A",
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
                <span>SYNTHESIZING COMPREHENSIVE STUDY PLAYBOOK…</span>
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
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "var(--mono, monospace)",
                }}
              >
                Generating full architectural diagrams, memory distribution scales, worked examples, and lab exercises.
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
              borderTop: "2px solid rgba(10,10,10,0.12)",
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
                border: "2px solid rgba(10,10,10,0.3)",
                background: "transparent",
                color: "#0A0A0A",
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
                border: "2.5px solid #0A0A0A",
                background: !prompt.trim() || isGenerating ? "#EBE7DC" : "#B8F04A",
                color: "#0A0A0A",
                cursor: !prompt.trim() || isGenerating ? "not-allowed" : "pointer",
                boxShadow: !prompt.trim() || isGenerating ? "none" : "4px 4px 0 #0A0A0A",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                transition: "all 0.1s ease",
              }}
              onMouseEnter={(e) => {
                if (prompt.trim() && !isGenerating) {
                  e.currentTarget.style.transform = "translate(-1px, -1px)";
                  e.currentTarget.style.boxShadow = "5px 5px 0 #0A0A0A";
                }
              }}
              onMouseLeave={(e) => {
                if (prompt.trim() && !isGenerating) {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "4px 4px 0 #0A0A0A";
                }
              }}
            >
              <Sparkles size={14} />
              <span>{isGenerating ? "GENERATING PLAYBOOK…" : "GENERATE NOTES FROM TOPIC"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
