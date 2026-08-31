"use client";

import React, { useEffect, useRef } from "react";
import { playSound } from "@/lib/sound";
import { AlertTriangle, Trash2, RotateCcw, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "warning" | "default";
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "CONFIRM",
  confirmVariant = "danger",
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Steal focus into the dialog when it opens (and restore it on close). This
  // is what makes the keydown handler below safe: Enter/Escape only ever act
  // on keystrokes that actually originate from inside this dialog, instead of
  // hijacking a stray Enter pressed anywhere else on the page (e.g. while
  // typing a note) into confirming a destructive delete/clear action.
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      dialogRef.current?.focus();
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (!dialogRef.current?.contains(e.target as Node)) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const getHeaderColor = () => {
    switch (confirmVariant) {
      case "danger":
        return { bg: "#FF2D8A", text: "#FFFFFF" };
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
      style={{
        position: "fixed",
        inset: 0,
        outline: "none",
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
          border: "3px solid #0A0A0A",
          background: "#FFFFFF",
          boxShadow: "10px 10px 0 #0A0A0A",
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
            borderBottom: "3px solid #0A0A0A",
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
              color: "#0A0A0A",
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
              borderTop: "2px solid rgba(10,10,10,0.12)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "9px 16px",
                border: "2px solid rgba(10,10,10,0.3)",
                background: "transparent",
                color: "#0A0A0A",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#EBE7DC")}
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
                border: "2.5px solid #0A0A0A",
                background: confirmVariant === "danger" ? "#FF2D8A" : "#FCE94F",
                color: confirmVariant === "danger" ? "#FFFFFF" : "#0A0A0A",
                cursor: "pointer",
                boxShadow: "4px 4px 0 #0A0A0A",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-1px, -1px)";
                e.currentTarget.style.boxShadow = "5px 5px 0 #0A0A0A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "4px 4px 0 #0A0A0A";
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
