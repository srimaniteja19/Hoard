"use client";

import React, { useEffect, useRef } from "react";
import { playSound } from "@/lib/sound";
import { AlertTriangle, Trash2, RotateCcw, X } from "lucide-react";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "warning" | "default";
  theme?: NotebookTheme;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "CONFIRM",
  confirmVariant = "danger",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useModalFocusTrap({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: confirmVariant === "danger" ? cancelBtnRef : undefined,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (!dialogRef.current?.contains(e.target as Node)) return;
      if (e.key === "Enter" && confirmVariant !== "danger") onConfirm();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm, confirmVariant]);

  if (!isOpen) return null;

  const getHeaderColor = () => {
    switch (confirmVariant) {
      case "danger":
        return { bg: "#FF2D8A", text: "#0A0A0A" };
      case "warning":
        return { bg: "#FCE94F", text: "#0A0A0A" };
      default:
        return { bg: "#0A0A0A", text: "#FFFFFF" };
    }
  };

  const colors = getHeaderColor();

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.65)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: "16px",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          border: `3px solid ${tokens.borderPrimary}`,
          background: tokens.cardBg,
          color: tokens.textPrimary,
          boxShadow: tokens.popoverShadow,
          overflow: "hidden",
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
            padding: "12px 18px",
            background: colors.bg,
            color: colors.text,
            borderBottom: `3px solid ${tokens.borderPrimary}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={17} />
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
              }}
            >
              {title}
            </span>
          </div>

          <button
            type="button"
            aria-label="Close confirmation dialog"
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
        </div>

        {/* Body */}
        <div style={{ padding: "22px 20px" }}>
          <p
            style={{
              margin: "0 0 20px",
              fontFamily: "var(--body, 'Space Grotesk', sans-serif)",
              fontSize: "16px",
              lineHeight: "1.55",
              color: tokens.textPrimary,
            }}
          >
            {description}
          </p>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              paddingTop: "14px",
              borderTop: `2px solid ${tokens.borderSubtle}`,
            }}
          >
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "9px 16px",
                border: `2px solid ${tokens.borderPrimary}`,
                background: "transparent",
                color: tokens.textPrimary,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              CANCEL
            </button>

            <button
              type="button"
              onClick={() => {
                playSound.pop();
                onConfirm();
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.14em",
                padding: "9px 20px",
                border: `2.5px solid ${tokens.borderPrimary}`,
                background: confirmVariant === "danger" ? "#FF2D8A" : "#FCE94F",
                color: "#0A0A0A",
                cursor: "pointer",
                boxShadow: tokens.boxShadow,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.1s ease",
              }}
            >
              {confirmVariant === "danger" ? <Trash2 size={13} /> : <RotateCcw size={13} />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
