"use client";

import React from "react";
import { Bookmark } from "@/types";
import { X, FileText, AlertTriangle, ShieldCheck } from "lucide-react";

interface DiffViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmark: Bookmark | null;
  onRecheckDrift?: (id: number) => Promise<void>;
}

export function DiffViewerModal({
  isOpen,
  onClose,
  bookmark,
  onRecheckDrift,
}: DiffViewerModalProps) {
  if (!isOpen || !bookmark) return null;

  const is404 = bookmark.driftStatus === "404_preserved";
  const isChanged = bookmark.driftStatus === "changed";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="modal-container-responsive"
        style={{
          width: "100%",
          maxWidth: "800px",
          maxHeight: "85vh",
          background: "#FFFDF8",
          border: "4px solid #000",
          boxShadow: "10px 10px 0 #000",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--mono), monospace",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "3px solid #000",
            background: is404 ? "#FF007A" : isChanged ? "#FFE600" : "#00F0FF",
            color: is404 ? "#fff" : "#000",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800, fontSize: "15px" }}>
            {is404 ? (
              <>
                <ShieldCheck size={20} /> 🛡️ PRESERVED ARCHIVED COPY (ORIGINAL LINK 404)
              </>
            ) : isChanged ? (
              <>
                <AlertTriangle size={20} /> ⚡ CONTENT DRIFT DETECTED ({bookmark.driftPercent || 15}% CHANGE)
              </>
            ) : (
              <>
                <FileText size={20} /> ARCHIVED CONTENT COPY
              </>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              background: "#000",
              color: "#fff",
              border: "2px solid #000",
              padding: "4px 8px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Info Subheader */}
        <div style={{ padding: "16px 20px", borderBottom: "2px solid #000", background: "var(--cream)" }}>
          <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "4px" }}>{bookmark.t}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>
            URL: <a href={bookmark.url} target="_blank" rel="noreferrer" style={{ color: "#000", fontWeight: 700 }}>{bookmark.url}</a>
          </div>
          {bookmark.lastFetchedAt && (
            <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
              Last checked: {new Date(bookmark.lastFetchedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Body Text Content */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            flex: 1,
            fontSize: "13px",
            lineHeight: 1.6,
            background: "#fff",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {bookmark.archivedText ? (
            bookmark.archivedText
          ) : (
            <div style={{ color: "#888", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>
              No archived text snapshot available yet. Click &quot;Check for Drift&quot; to fetch and snapshot this page.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "3px solid #000",
            background: "#FFFDF8",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#555" }}>
            Snapshot size: {bookmark.archivedText ? bookmark.archivedText.length : 0} characters
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {onRecheckDrift && (
              <button
                onClick={async () => {
                  await onRecheckDrift(bookmark.id);
                }}
                style={{
                  background: "#FFE600",
                  border: "2px solid #000",
                  boxShadow: "2px 2px 0 #000",
                  padding: "6px 14px",
                  fontWeight: 800,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                🔄 RE-CHECK DRIFT NOW
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: "#B6FF3C",
                border: "2px solid #000",
                boxShadow: "2px 2px 0 #000",
                padding: "6px 16px",
                fontWeight: 800,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              CLOSE VIEWER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
