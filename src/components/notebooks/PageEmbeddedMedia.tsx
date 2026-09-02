"use client";

import React, { useState } from "react";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { getEmbedInfo, getFaviconUrl, EmbedInfo } from "@/lib/notebooks/embeds";
import { playSound } from "@/lib/sound";
import {
  Play,
  Pause,
  ExternalLink,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  RefreshCw,
  Maximize2,
  Minimize2,
  Music,
  FileText,
  Code,
  Globe,
  Film,
} from "lucide-react";

interface PageEmbeddedMediaProps {
  lessonUrl?: string | null;
  onEditUrl: () => void;
  onRemoveUrl?: () => void;
  onInsertIntoNotes?: (url: string, title?: string) => void;
  theme?: NotebookTheme;
  accentColor?: string;
}

export const PageEmbeddedMedia: React.FC<PageEmbeddedMediaProps> = ({
  lessonUrl,
  onEditUrl,
  onRemoveUrl,
  onInsertIntoNotes,
  theme = "cream",
  accentColor = "#7B5CF0",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  const [isOpen, setIsOpen] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [addedToast, setAddedToast] = useState(false);

  if (!lessonUrl) return null;

  const embedInfo: EmbedInfo = getEmbedInfo(lessonUrl);
  const faviconUrl = getFaviconUrl(lessonUrl);

  const handleToggleOpen = () => {
    playSound.click();
    setIsOpen(!isOpen);
  };

  const handleInsertIntoNotes = () => {
    if (!onInsertIntoNotes) return;
    playSound.fileIt();
    onInsertIntoNotes(lessonUrl, embedInfo.title);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2200);
  };

  const renderIcon = () => {
    switch (embedInfo.embedType) {
      case "youtube":
      case "vimeo":
      case "loom":
        return <Play size={12} fill="currentColor" />;
      case "spotify":
        return <Music size={12} />;
      case "pdf":
        return <FileText size={12} />;
      case "codepen":
        return <Code size={12} />;
      default:
        return <Globe size={12} />;
    }
  };

  const isAspect169 = embedInfo.aspectRatio === "16/9";
  const customHeight = embedInfo.defaultHeight || 440;

  return (
    <div
      className="no-print"
      style={{
        margin: "10px 0 20px",
        borderRadius: "3px",
        border: `2px solid ${tokens.borderPrimary}`,
        background: tokens.cardBg,
        boxShadow: tokens.boxShadow,
        overflow: "hidden",
        transition: "all 0.15s ease",
      }}
    >
      {/* ── Resource Dock Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: isOpen ? (isInk ? "#222734" : "#EBE7DC") : tokens.cardBg,
          borderBottom: isOpen ? `2px solid ${tokens.borderPrimary}` : "none",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {/* Left: Provider badge & URL */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: tokens.borderPrimary,
              color: isInk ? "#FFFFFF" : "#FCE94F",
              padding: "2px 7px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              borderRadius: "2px",
              flex: "none",
            }}
          >
            {renderIcon()}
            <span>{embedInfo.providerName}</span>
          </span>

          <a
            href={lessonUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open ${lessonUrl} in new tab`}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 700,
              color: tokens.textPrimary,
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>{embedInfo.title}</span>
            <ExternalLink size={10} style={{ opacity: 0.5, flex: "none" }} />
          </a>
        </div>

        {/* Right: Actions & Watch Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Insert into Notes Button */}
          {onInsertIntoNotes && (
            <button
              type="button"
              onClick={handleInsertIntoNotes}
              title="Add this video/media directly into your notes as an interactive embed"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                background: addedToast ? "#10B981" : (isInk ? "rgba(255,255,255,0.08)" : "#FFFFFF"),
                color: addedToast ? "#FFFFFF" : tokens.textPrimary,
                border: `1.5px solid ${tokens.borderPrimary}`,
                padding: "4px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                borderRadius: "2px",
                transition: "all 0.12s ease",
              }}
            >
              {addedToast ? <Check size={11} /> : <Plus size={11} strokeWidth={2.5} />}
              <span>{addedToast ? "EMBEDDED IN NOTES" : "EMBED IN NOTES"}</span>
            </button>
          )}

          {/* Edit URL */}
          <button
            type="button"
            onClick={onEditUrl}
            title="Edit source URL"
            style={{
              background: "transparent",
              border: "none",
              color: tokens.textPrimary,
              cursor: "pointer",
              padding: "4px",
              opacity: 0.6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
          >
            <Pencil size={11} />
          </button>

          {/* Remove URL */}
          {onRemoveUrl && (
            <button
              type="button"
              onClick={onRemoveUrl}
              title="Remove source link"
              style={{
                background: "transparent",
                border: "none",
                color: "#EF4444",
                cursor: "pointer",
                padding: "4px",
                opacity: 0.6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
            >
              <Trash2 size={11} />
            </button>
          )}

          {/* Watch / Play Media Toggle Button */}
          <button
            type="button"
            onClick={handleToggleOpen}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              background: isOpen ? tokens.borderPrimary : (isInk ? "#2A303F" : "#FCE94F"),
              color: isOpen ? (isInk ? "#FFFFFF" : "#FCE94F") : (isInk ? "#FFFFFF" : "#0A0A0A"),
              border: `1.5px solid ${tokens.borderPrimary}`,
              boxShadow: isOpen ? "none" : "2px 2px 0 rgba(0,0,0,0.4)",
              padding: "4px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              borderRadius: "2px",
            }}
          >
            {isOpen ? <ChevronUp size={12} /> : <Play size={11} fill="currentColor" />}
            <span>{isOpen ? "COLLAPSE PLAYER" : "WATCH / PLAY MEDIA"}</span>
          </button>
        </div>
      </div>

      {/* ── Slide-Down Media Player Drawer ── */}
      {isOpen && (
        <div style={{ background: isInk ? "#14161E" : "#0A0A0A", position: "relative" }}>
          {/* Top Frame Action Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 12px",
              background: isInk ? "#181A24" : "#1C1D22",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.8)",
              fontFamily: "var(--mono, monospace)",
              fontSize: "8.5px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
              <span>LIVE MEDIA PLAYER · TAKE NOTES BELOW</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setIframeKey((k) => k + 1)}
                title="Reload player"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                <RefreshCw size={10} />
              </button>
              <button
                type="button"
                onClick={() => setIsFullWidth(!isFullWidth)}
                title={isFullWidth ? "Standard size" : "Expand width"}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                {isFullWidth ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
              </button>
            </div>
          </div>

          {/* Iframe Viewport */}
          <div
            style={{
              position: "relative",
              width: "100%",
              margin: "0 auto",
              maxWidth: isFullWidth ? "100%" : "860px",
              ...(isAspect169 ? { aspectRatio: "16/9" } : { height: `${customHeight}px` }),
            }}
          >
            <iframe
              key={iframeKey}
              src={embedInfo.embedUrl}
              title={embedInfo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
