"use client";

import React from "react";
import { Upload, Chrome, Sparkles, FolderPlus } from "lucide-react";

interface ColdStartProps {
  onOpenImport: () => void;
  onLoadSamples?: () => void;
}

export const ColdStart: React.FC<ColdStartProps> = ({ onOpenImport, onLoadSamples }) => {
  return (
    <div
      className="cold-start-card"
      style={{
        maxWidth: "680px",
        margin: "40px auto",
        padding: "36px 32px",
        background: "var(--paper)",
        border: "var(--bd)",
        boxShadow: "var(--sh)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "var(--cyan)",
          border: "2px solid #000",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 20px",
        }}
      >
        <Sparkles size={28} color="#000" />
      </div>

      <h2 style={{ fontSize: "22px", fontWeight: 900, marginBottom: "8px" }}>
        YOUR HOARD SHELF IS EMPTY
      </h2>
      <p style={{ color: "var(--fg)", opacity: 0.8, fontSize: "14px", marginBottom: "28px", maxWidth: "480px", margin: "0 auto 28px" }}>
        HOARD organizes articles, repos, videos, and papers into a time-proportional visual bookshelf. Import your browser bookmarks to get started.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {/* Import Bookmarks HTML Dropzone */}
        <button
          onClick={onOpenImport}
          style={{
            background: "var(--paper)",
            border: "2px solid #000",
            boxShadow: "var(--sh-sm)",
            padding: "16px 12px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
          }}
        >
          <Upload size={22} color="var(--accent)" />
          <span>IMPORT BOOKMARKS HTML</span>
        </button>

        {/* Chrome Extension Link */}
        <a
          href="https://chrome.google.com/webstore"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "var(--paper)",
            border: "2px solid #000",
            boxShadow: "var(--sh-sm)",
            padding: "16px 12px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--fg)",
            textDecoration: "none",
          }}
        >
          <Chrome size={22} color="#00F0FF" />
          <span>CHROME EXTENSION</span>
        </a>

        {/* Sample Generator Button */}
        {onLoadSamples && (
          <button
            onClick={onLoadSamples}
            style={{
              background: "var(--yel)",
              color: "#000",
              border: "2px solid #000",
              boxShadow: "var(--sh-sm)",
              padding: "16px 12px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            <FolderPlus size={22} color="#000" />
            <span>LOAD SAMPLES</span>
          </button>
        )}
      </div>

      <div style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6 }}>
        [HOARD V2 DIGITAL BOOKSHELF ENGINE]
      </div>
    </div>
  );
};
