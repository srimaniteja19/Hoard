"use client";

import React, { useState, useRef } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { getEmbedInfo, getFaviconUrl, EmbedInfo } from "@/lib/notebooks/embeds";
import { playSound } from "@/lib/sound";
import {
  ExternalLink,
  RefreshCw,
  Trash2,
  Maximize2,
  Minimize2,
  Bookmark,
  Play,
  FileText,
  Music,
  Code,
  Globe,
  AlertCircle,
} from "lucide-react";

interface EmbedBlockProps {
  block: Extract<Block, { type: "embed" }>;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  onConvertToBookmark?: () => void;
  readOnly?: boolean;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const EmbedBlock: React.FC<EmbedBlockProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  onConvertToBookmark,
  readOnly = false,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  const [embedSize, setEmbedSize] = useState<"compact" | "standard" | "full">("standard");
  const [iframeKey, setIframeKey] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(block.url);

  const embedInfo: EmbedInfo = getEmbedInfo(block.url);
  const faviconUrl = getFaviconUrl(block.url);

  const sizeStyle = {
    compact: { maxWidth: "560px" },
    standard: { maxWidth: "820px" },
    full: { maxWidth: "100%" },
  }[embedSize];

  const handleReload = () => {
    playSound.click();
    setIframeKey((k) => k + 1);
    setHasError(false);
  };

  const handleSaveUrl = () => {
    if (!urlDraft.trim()) return;
    setIsEditingUrl(false);
    if (onUpdateBlock && urlDraft.trim() !== block.url) {
      const newInfo = getEmbedInfo(urlDraft.trim());
      onUpdateBlock({
        ...block,
        url: urlDraft.trim(),
        embedType: newInfo.embedType,
        title: newInfo.title,
      });
      setIframeKey((k) => k + 1);
    }
  };

  // Provider icon
  const renderProviderIcon = () => {
    switch (embedInfo.embedType) {
      case "youtube":
      case "vimeo":
      case "loom":
        return <Play size={11} fill="currentColor" />;
      case "spotify":
        return <Music size={11} />;
      case "codepen":
        return <Code size={11} />;
      case "pdf":
        return <FileText size={11} />;
      default:
        return <Globe size={11} />;
    }
  };

  const isAspect169 = embedInfo.aspectRatio === "16/9";
  const customHeight = block.height || embedInfo.defaultHeight || 480;

  return (
    <div
      style={{
        margin: "18px 0 24px",
        width: "100%",
        ...sizeStyle,
        transition: "max-width 0.2s ease",
      }}
    >
      <div
        style={{
          border: `2.5px solid ${tokens.borderPrimary}`,
          boxShadow: tokens.boxShadow,
          background: tokens.cardBg,
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        {/* ── Embed Top Header Toolbar ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 12px",
            background: isInk ? "#222734" : "#EBE7DC",
            borderBottom: `2px solid ${tokens.borderPrimary}`,
            fontFamily: "var(--mono, monospace)",
            fontSize: "9px",
            fontWeight: 800,
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* Provider Badge & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: tokens.borderPrimary,
                color: isInk ? "#FFFFFF" : "#FCE94F",
                padding: "2px 6px",
                borderRadius: "2px",
                letterSpacing: "0.08em",
                flex: "none",
              }}
            >
              {renderProviderIcon()}
              <span>{embedInfo.providerName}</span>
            </span>

            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                opacity: 0.75,
                fontSize: "9.5px",
              }}
            >
              {block.title || embedInfo.title}
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>
            {/* Sizing Toggles */}
            <div
              style={{
                display: "flex",
                border: `1px solid ${tokens.borderPrimary}`,
                borderRadius: "2px",
                overflow: "hidden",
                marginRight: "4px",
              }}
            >
              {(["compact", "standard", "full"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setEmbedSize(s);
                  }}
                  style={{
                    background: embedSize === s ? tokens.borderPrimary : "transparent",
                    color: embedSize === s ? (isInk ? "#FFFFFF" : "#FCE94F") : tokens.textPrimary,
                    border: "none",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontSize: "8px",
                    fontWeight: 700,
                  }}
                >
                  {s === "compact" ? "50%" : s === "standard" ? "75%" : "100%"}
                </button>
              ))}
            </div>

            {/* Switch to Bookmark Card */}
            {onConvertToBookmark && (
              <button
                type="button"
                onClick={() => {
                  playSound.pop();
                  onConvertToBookmark();
                }}
                title="Switch to compact Bookmark Card"
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "8.5px",
                  fontWeight: 700,
                  background: "transparent",
                  border: `1px solid ${tokens.borderPrimary}`,
                  color: tokens.textPrimary,
                  padding: "2px 6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  borderRadius: "2px",
                }}
              >
                <Bookmark size={9} />
                <span>CARD</span>
              </button>
            )}

            {/* Reload Iframe */}
            <button
              type="button"
              onClick={handleReload}
              title="Reload frame"
              style={{
                background: "transparent",
                border: "none",
                color: tokens.textPrimary,
                cursor: "pointer",
                padding: "2px 4px",
              }}
            >
              <RefreshCw size={11} />
            </button>

            {/* Open In New Tab */}
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open source in new window"
              style={{
                color: tokens.textPrimary,
                textDecoration: "none",
                display: "grid",
                placeItems: "center",
                padding: "2px 4px",
              }}
            >
              <ExternalLink size={11} />
            </a>

            {/* Delete Block */}
            {!readOnly && onDeleteBlock && (
              <button
                type="button"
                onClick={onDeleteBlock}
                title="Delete embed block"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#EF4444",
                  cursor: "pointer",
                  padding: "2px 4px",
                  marginLeft: "2px",
                }}
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* ── Edit URL Bar (if opened) ── */}
        {isEditingUrl && (
          <div
            style={{
              padding: "6px 10px",
              background: tokens.popoverBg,
              borderBottom: `1px solid ${tokens.borderSubtle}`,
              display: "flex",
              gap: "6px",
            }}
          >
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveUrl();
                if (e.key === "Escape") setIsEditingUrl(false);
              }}
              placeholder="https://..."
              autoFocus
              style={{
                flex: 1,
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                padding: "4px 8px",
                background: isInk ? "#14161E" : "#FFFFFF",
                color: tokens.textPrimary,
                border: `1px solid ${tokens.borderPrimary}`,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleSaveUrl}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 800,
                background: accentColor,
                color: "#FFFFFF",
                border: "none",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              UPDATE
            </button>
            <button
              type="button"
              onClick={() => setIsEditingUrl(false)}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                background: "transparent",
                color: tokens.textMuted,
                border: "none",
                padding: "4px 6px",
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
          </div>
        )}

        {/* ── Interactive Iframe Embed Canvas ── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            ...(isAspect169 ? { aspectRatio: "16/9" } : { height: `${customHeight}px` }),
            background: isInk ? "#14161E" : "#F8F6F0",
          }}
        >
          {hasError ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <AlertCircle size={28} color="#EF4444" />
              <div style={{ fontWeight: 700, fontSize: "14px" }}>
                This site cannot be embedded directly
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: tokens.textMuted,
                  maxWidth: "380px",
                  lineHeight: "1.4",
                }}
              >
                Security policies (X-Frame-Options) prevent embedding this website. You can open it in
                a new window or switch to a Bookmark Card.
              </p>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <a
                  href={block.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "6px 12px",
                    background: accentColor,
                    color: "#FFFFFF",
                    textDecoration: "none",
                    borderRadius: "2px",
                  }}
                >
                  OPEN IN NEW TAB ↗
                </a>
                {onConvertToBookmark && (
                  <button
                    type="button"
                    onClick={onConvertToBookmark}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "6px 12px",
                      background: "transparent",
                      border: `1.5px solid ${tokens.borderPrimary}`,
                      color: tokens.textPrimary,
                      cursor: "pointer",
                      borderRadius: "2px",
                    }}
                  >
                    USE BOOKMARK CARD
                  </button>
                )}
              </div>
            </div>
          ) : (
            <iframe
              key={iframeKey}
              src={embedInfo.embedUrl}
              title={block.title || "Embedded Content"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
              onError={() => setHasError(true)}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
              }}
            />
          )}
        </div>

        {/* ── Editable Caption ── */}
        <div
          contentEditable={!readOnly && !!onUpdateBlock}
          suppressContentEditableWarning
          onBlur={(e) => {
            if (onUpdateBlock) {
              onUpdateBlock({
                ...block,
                caption: e.currentTarget.innerText.trim(),
              });
            }
          }}
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: "9.5px",
            fontWeight: 700,
            padding: "8px 14px",
            borderTop: `1.5px solid ${tokens.borderSubtle}`,
            color: tokens.textMuted,
            outline: "none",
            background: isInk ? "#181B24" : "#FFFFFF",
          }}
        >
          {block.caption || (!readOnly ? "Click to add caption…" : "")}
        </div>
      </div>
    </div>
  );
};
