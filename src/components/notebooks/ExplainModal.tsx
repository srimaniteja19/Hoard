"use client";

import React, { useRef } from "react";
import { playSound } from "@/lib/sound";
import { Block, generateBlockId } from "@/lib/notebooks/blocks";
import { getThemeTokens, NotebookTheme } from "@/lib/notebooks/theme";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";
import { Sparkles, X, Plus } from "lucide-react";

interface ExplainModalProps {
  selection: string;
  explanation: string;
  error?: string | null;
  loading: boolean;
  onRetry?: () => void;
  onAddAsToggle: (toggleBlock: Block) => void;
  onClose: () => void;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  selection,
  explanation,
  error = null,
  loading,
  onRetry,
  onAddAsToggle,
  onClose,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalFocusTrap({
    isOpen: true,
    onClose,
    containerRef: dialogRef,
  });

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
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.72)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "grid",
        placeItems: "center",
        padding: "20px",
        animation: "fadeIn 0.12s ease",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Explain passage deep dive"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "88vh",
          background: tokens.cardBg,
          color: tokens.textPrimary,
          border: `3px solid ${tokens.borderPrimary}`,
          boxShadow: tokens.boxShadow,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            background: "#0A0A0A",
            color: "#F0EDE4",
            borderBottom: `3px solid ${tokens.borderPrimary}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={14} color="#7FE9F7" />
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
                color: "#7FE9F7",
                letterSpacing: "0.15em",
              }}
            >
              EXPLAIN WITH AI
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (ESC)"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#F0EDE4",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              padding: "3px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#FF2D8A";
              e.currentTarget.style.borderColor = "#FF2D8A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            }}
          >
            <X size={12} />
            ESC
          </button>
        </div>

        {/* Selected Passage Box */}
        <div
          style={{
            padding: "14px 18px",
            background: tokens.sidebarBg,
            borderBottom: `2px solid ${tokens.borderPrimary}`,
            color: tokens.textPrimary,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "8.5px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: tokens.textMuted,
              marginBottom: "5px",
            }}
          >
            SELECTED PASSAGE
          </div>
          <div
            style={{
              fontFamily: "var(--quote, Georgia, serif)",
              fontStyle: "italic",
              fontSize: "14.5px",
              lineHeight: "1.45",
              color: tokens.textPrimary,
            }}
          >
            &ldquo;{selection}&rdquo;
          </div>
        </div>

        {/* AI Explanation Content Body */}
        <div
          style={{
            padding: "20px 22px",
            flex: 1,
            overflowY: "auto",
            color: tokens.textPrimary,
            fontSize: "15.5px",
            lineHeight: "1.68",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "24px 0",
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                color: tokens.textSecondary,
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  border: `2px solid ${tokens.borderPrimary}`,
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Analyzing context and generating deep dive explanation…
            </div>
          ) : error ? (
            <div
              role="alert"
              style={{
                padding: "16px",
                background: tokens.isDark ? "rgba(239, 68, 68, 0.18)" : "#FFF1F2",
                border: "2px solid #EF4444",
                color: tokens.isDark ? "#FECACA" : "#991B1B",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 700 }}>
                {error}
              </div>
              {onRetry && (
                <div>
                  <button
                    type="button"
                    onClick={onRetry}
                    style={{
                      border: "1.5px solid #EF4444",
                      background: "#EF4444",
                      color: "#FFFFFF",
                      padding: "6px 12px",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    RETRY EXPLANATION
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ whiteSpace: "pre-wrap", color: tokens.textPrimary }}>
              {explanation}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div
          style={{
            padding: "14px 18px",
            borderTop: `3px solid ${tokens.borderPrimary}`,
            background: tokens.sidebarBg,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              border: `2px solid ${tokens.borderPrimary}`,
              background: "transparent",
              color: tokens.textPrimary,
              padding: "9px 14px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            CLOSE
          </button>

          <button
            type="button"
            disabled={loading || !explanation}
            onClick={handleAddToggle}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              border: `2px solid ${tokens.borderPrimary}`,
              background: "#0A0A0A",
              color: "#B8F04A",
              padding: "9px 16px",
              cursor: loading || !explanation ? "not-allowed" : "pointer",
              boxShadow: "3px 3px 0 #B8F04A",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: loading || !explanation ? 0.4 : 1,
            }}
          >
            <Plus size={13} />
            ADD AS TOGGLE BLOCK TO NOTES
          </button>
        </div>
      </div>
    </div>
  );
};
