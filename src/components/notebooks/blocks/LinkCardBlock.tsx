"use client";

import React, { useState, useEffect, useRef } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { getFaviconUrl, formatDomain, detectEmbedType } from "@/lib/notebooks/embeds";
import { playSound } from "@/lib/sound";
import {
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Play,
  Trash2,
  Edit2,
  Globe,
  Sparkles,
} from "lucide-react";

interface LinkCardBlockProps {
  block: Extract<Block, { type: "link" }>;
  onUpdateBlock?: (updated: Block) => void;
  onDeleteBlock?: () => void;
  onConvertToEmbed?: () => void;
  readOnly?: boolean;
  accentColor?: string;
  theme?: NotebookTheme;
}

export const LinkCardBlock: React.FC<LinkCardBlockProps> = ({
  block,
  onUpdateBlock,
  onDeleteBlock,
  onConvertToEmbed,
  readOnly = false,
  accentColor = "#7B5CF0",
  theme = "cream",
}) => {
  const tokens = getThemeTokens(theme);
  const isInk = tokens.isDark;

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(block.url);

  const faviconUrl = block.favicon || getFaviconUrl(block.url);
  const domain = block.site || formatDomain(block.url);
  const embedType = detectEmbedType(block.url);

  // Auto-fetch metadata if missing description and image
  useEffect(() => {
    let isMounted = true;
    if (!block.url || readOnly) return;
    if (block.description || block.image) return;

    const fetchMeta = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/meta?url=${encodeURIComponent(block.url)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && onUpdateBlock) {
          onUpdateBlock({
            ...block,
            title: data.title || block.title || domain,
            description: data.description || block.description,
            image: data.image || block.image,
            site: domain,
            favicon: faviconUrl,
          });
        }
      } catch {
        // Silently fail, fall back to hostname and URL
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMeta();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.url]);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playSound.click();
    navigator.clipboard.writeText(block.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualRefresh = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playSound.click();
    try {
      setIsLoading(true);
      const res = await fetch(`/api/meta?url=${encodeURIComponent(block.url)}`);
      if (res.ok) {
        const data = await res.json();
        if (onUpdateBlock) {
          onUpdateBlock({
            ...block,
            title: data.title || block.title || domain,
            description: data.description || undefined,
            image: data.image || undefined,
            site: domain,
            favicon: faviconUrl,
          });
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUrl = () => {
    if (!urlInput.trim()) return;
    setIsEditingUrl(false);
    if (onUpdateBlock && urlInput.trim() !== block.url) {
      onUpdateBlock({
        ...block,
        url: urlInput.trim(),
        title: urlInput.trim(),
        description: undefined,
        image: undefined,
        site: formatDomain(urlInput.trim()),
      });
    }
  };

  return (
    <div
      style={{
        margin: "12px 0 16px",
        position: "relative",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Toolbar Actions ── */}
      {!readOnly && (
        <div
          style={{
            position: "absolute",
            top: "-12px",
            right: "12px",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "5px",
            opacity: isHovered || isEditingUrl ? 1 : 0,
            transition: "opacity 0.15s ease",
          }}
        >
          {/* Switch to Interactive Embed */}
          {onConvertToEmbed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playSound.pop();
                onConvertToEmbed();
              }}
              title="Convert to interactive embed player"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                background: tokens.isDark ? "#2A303F" : "#FCE94F",
                color: tokens.isDark ? "#FFFFFF" : "#0A0A0A",
                border: `1.5px solid ${tokens.borderPrimary}`,
                boxShadow: tokens.boxShadow,
                padding: "3px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                borderRadius: "2px",
              }}
            >
              <Play size={10} fill="currentColor" />
              <span>INTERACTIVE EMBED</span>
            </button>
          )}

          {/* Copy URL */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy URL to clipboard"
            style={{
              background: tokens.popoverBg,
              color: tokens.textPrimary,
              border: `1.5px solid ${tokens.borderPrimary}`,
              boxShadow: tokens.boxShadow,
              padding: "4px 6px",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              borderRadius: "2px",
            }}
          >
            {copied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
          </button>

          {/* Refresh Metadata */}
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh link preview"
            style={{
              background: tokens.popoverBg,
              color: tokens.textPrimary,
              border: `1.5px solid ${tokens.borderPrimary}`,
              boxShadow: tokens.boxShadow,
              padding: "4px 6px",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              borderRadius: "2px",
            }}
          >
            <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
          </button>

          {/* Edit URL */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingUrl(!isEditingUrl);
            }}
            title="Edit URL"
            style={{
              background: tokens.popoverBg,
              color: tokens.textPrimary,
              border: `1.5px solid ${tokens.borderPrimary}`,
              boxShadow: tokens.boxShadow,
              padding: "4px 6px",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              borderRadius: "2px",
            }}
          >
            <Edit2 size={11} />
          </button>

          {/* Delete */}
          {onDeleteBlock && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteBlock();
              }}
              title="Delete bookmark"
              style={{
                background: tokens.popoverBg,
                color: "#EF4444",
                border: `1.5px solid ${tokens.borderPrimary}`,
                boxShadow: tokens.boxShadow,
                padding: "4px 6px",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                borderRadius: "2px",
              }}
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      )}

      {/* ── Edit URL Overlay Bar ── */}
      {isEditingUrl && (
        <div
          style={{
            marginBottom: "8px",
            display: "flex",
            gap: "6px",
            background: tokens.cardBg,
            border: `2px solid ${tokens.borderPrimary}`,
            padding: "6px 8px",
          }}
        >
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveUrl();
              if (e.key === "Escape") setIsEditingUrl(false);
            }}
            placeholder="https://..."
            autoFocus
            style={{
              flex: 1,
              fontFamily: "var(--mono, monospace)",
              fontSize: "12px",
              padding: "4px 8px",
              background: tokens.isDark ? "#14161E" : "#F5F3ED",
              color: tokens.textPrimary,
              border: `1px solid ${tokens.borderSubtle}`,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleSaveUrl}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 800,
              padding: "4px 10px",
              background: accentColor,
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
            }}
          >
            SAVE
          </button>
          <button
            type="button"
            onClick={() => setIsEditingUrl(false)}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              padding: "4px 8px",
              background: "transparent",
              color: tokens.textMuted,
              border: "none",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
        </div>
      )}

      {/* ── Rich Bookmark Card Container ── */}
      <a
        href={block.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          textDecoration: "none",
          color: tokens.textPrimary,
          background: tokens.cardBg,
          border: `2.5px solid ${tokens.borderPrimary}`,
          boxShadow: tokens.boxShadow,
          overflow: "hidden",
          borderRadius: "3px",
          transition: "transform 0.1s ease, box-shadow 0.1s ease",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translate(-1px, -1px)";
          e.currentTarget.style.boxShadow = tokens.isDark
            ? "5px 5px 0 rgba(0,0,0,0.8)"
            : "6px 6px 0 #0A0A0A";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = tokens.boxShadow;
        }}
      >
        {/* Left / Main Content */}
        <div
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          {/* Site Badge & Favicon */}
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            {faviconUrl ? (
              <img
                src={faviconUrl}
                alt=""
                style={{ width: "14px", height: "14px", borderRadius: "2px", flex: "none" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Globe size={13} style={{ opacity: 0.5, flex: "none" }} />
            )}
            <span
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: tokens.textMuted,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {domain}
            </span>
          </div>

          {/* Title */}
          <h4
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 800,
              lineHeight: "1.3",
              letterSpacing: "-0.01em",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              color: tokens.textPrimary,
            }}
          >
            {block.title || block.url}
          </h4>

          {/* Description Snippet (if available) */}
          {block.description && (
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                lineHeight: "1.45",
                color: tokens.textMuted,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {block.description}
            </p>
          )}

          {/* URL domain pill & External Link Icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "2px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              color: tokens.accentColor,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                opacity: 0.8,
              }}
            >
              {block.url.replace(/^https?:\/\//i, "").slice(0, 50)}
            </span>
            <ExternalLink size={10} style={{ flex: "none", opacity: 0.6 }} />
          </div>
        </div>

        {/* Right / Thumbnail Image (if available) */}
        {block.image && (
          <div
            style={{
              flex: "0 0 160px",
              minWidth: "120px",
              maxWidth: "200px",
              background: tokens.isDark ? "#181A22" : "#EBE7DC",
              borderLeft: `2px solid ${tokens.borderPrimary}`,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={block.image}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              onError={(e) => {
                e.currentTarget.parentElement!.style.display = "none";
              }}
            />
          </div>
        )}
      </a>
    </div>
  );
};
