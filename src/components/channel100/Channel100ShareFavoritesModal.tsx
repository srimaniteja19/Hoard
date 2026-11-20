"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Film,
  Globe,
  Link2,
  Lock,
  Share2,
  Tv,
  X,
} from "lucide-react";
import { FavoritesVault } from "@/lib/channel100/types";
import {
  encodeVaultToHash,
  filterFavoritesByScope,
  formatFavoritesForShare,
  ShareFilterScope,
  ShareTextFormat,
} from "@/lib/channel100/favorites";
import {
  PosterAspect,
  PosterTheme,
  renderFavoritesPosterCanvas,
} from "@/lib/channel100/favoritesPosterCanvas";
import { playSound } from "@/lib/sound";

interface Channel100ShareFavoritesModalProps {
  isOpen: boolean;
  initialScope?: ShareFilterScope;
  vault: FavoritesVault;
  onClose: () => void;
  onTogglePublic: (isPublic: boolean) => void;
  onEnsureShareId: () => Promise<string | null>;
  onToast: (msg: string) => void;
}

export const Channel100ShareFavoritesModal: React.FC<
  Channel100ShareFavoritesModalProps
> = ({
  isOpen,
  initialScope = "all",
  vault,
  onClose,
  onTogglePublic,
  onEnsureShareId,
  onToast,
}) => {
  const [scope, setScope] = useState<ShareFilterScope>(initialScope);
  const [aspect, setAspect] = useState<PosterAspect>("poster");
  const [theme, setTheme] = useState<PosterTheme>("midnight");
  const [textFormat, setTextFormat] = useState<ShareTextFormat>("clean");
  const [copiedKey, setCopiedKey] = useState<"link" | "text" | null>(null);
  const [publishing, setPublishing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setScope(initialScope);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, initialScope, onClose]);

  const scopedItems = useMemo(
    () => filterFavoritesByScope(vault.items, scope),
    [vault.items, scope]
  );

  // Render live canvas preview whenever options or items change
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    renderFavoritesPosterCanvas(canvasRef.current, vault, {
      aspect,
      theme,
      scope,
    });
  }, [isOpen, vault, aspect, theme, scope]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const scopeQuery = scope === "all" ? "" : `?filter=${scope}`;
    if (vault.shareId && vault.profile.isPublic) {
      return `${origin}/share/favorites/${vault.shareId}${scopeQuery}`;
    }
    const encoded = encodeVaultToHash(vault, scope);
    return `${origin}/share/favorites/local${scopeQuery}#d=${encoded}`;
  }, [vault, scope]);

  const formattedText = useMemo(
    () =>
      formatFavoritesForShare(
        vault,
        scope,
        textFormat,
        vault.shareId && vault.profile.isPublic ? shareUrl : null
      ),
    [vault, scope, textFormat, shareUrl]
  );

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    let finalUrl = shareUrl;
    if (!vault.shareId && vault.profile.isPublic) {
      setPublishing(true);
      try {
        const newId = await onEnsureShareId();
        if (newId && typeof window !== "undefined") {
          const scopeQuery = scope === "all" ? "" : `?filter=${scope}`;
          finalUrl = `${window.location.origin}/share/favorites/${newId}${scopeQuery}`;
        }
      } finally {
        setPublishing(false);
      }
    }
    try {
      await navigator.clipboard.writeText(finalUrl);
      playSound.copy();
      setCopiedKey("link");
      onToast("Share link copied to clipboard");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      onToast("Clipboard access denied");
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      playSound.copy();
      setCopiedKey("text");
      onToast("Formatted favorites list copied");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      onToast("Clipboard access denied");
    }
  };

  const handleDownloadPoster = () => {
    if (!canvasRef.current) return;
    renderFavoritesPosterCanvas(canvasRef.current, vault, {
      aspect,
      theme,
      scope,
    });
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    const slug = (vault.profile.displayName || "all-time-canon")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    a.href = dataUrl;
    a.download = `${slug || "favorites"}-${scope}-${aspect}.png`;
    a.click();
    playSound.promote();
    onToast("Downloaded high-res collector poster PNG");
  };

  const moviesCount = vault.items.filter((i) => i.mediaType === "movie").length;
  const showsCount = vault.items.filter((i) => i.mediaType === "show").length;

  return (
    <div
      className="ch100-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ch100-share-title"
    >
      <div className="ch100-share-studio">
        <div className="ch100-fav-modal-head">
          <div className="ch100-fav-modal-title-group">
            <Share2 size={17} strokeWidth={2.3} aria-hidden="true" />
            <h2 id="ch100-share-title">Share Your All-Time Canon</h2>
          </div>
          <button
            type="button"
            className="ch100-log-dclose"
            onClick={onClose}
            aria-label="Close share studio"
          >
            <X size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {/* Scope Selector Strip */}
        <div className="ch100-share-scope-bar">
          <span className="ch100-share-scope-lbl">Include:</span>
          <div className="ch100-fav-scope-pills" role="group" aria-label="What to share">
            <button
              type="button"
              className={`ch100-fav-scope-btn ${scope === "all" ? "active" : ""}`}
              onClick={() => setScope("all")}
            >
              All <small>{vault.items.length}</small>
            </button>
            <button
              type="button"
              className={`ch100-fav-scope-btn ${scope === "movie" ? "active" : ""}`}
              onClick={() => setScope("movie")}
            >
              <Film size={12} strokeWidth={2.2} aria-hidden="true" />
              Movies Only <small>{moviesCount}</small>
            </button>
            <button
              type="button"
              className={`ch100-fav-scope-btn ${scope === "show" ? "active" : ""}`}
              onClick={() => setScope("show")}
            >
              <Tv size={12} strokeWidth={2.2} aria-hidden="true" />
              Shows Only <small>{showsCount}</small>
            </button>
          </div>
        </div>

        <div className="ch100-share-studio-grid">
          {/* LEFT: Live Collector Poster Studio */}
          <div className="ch100-share-poster-col">
            <div className="ch100-share-poster-controls">
              <div className="ch100-share-pill-group" role="group" aria-label="Poster format">
                <button
                  type="button"
                  className={aspect === "poster" ? "active" : ""}
                  onClick={() => setAspect("poster")}
                >
                  4:5 Poster
                </button>
                <button
                  type="button"
                  className={aspect === "square" ? "active" : ""}
                  onClick={() => setAspect("square")}
                >
                  1:1 Square
                </button>
                <button
                  type="button"
                  className={aspect === "story" ? "active" : ""}
                  onClick={() => setAspect("story")}
                >
                  9:16 Story
                </button>
              </div>

              <div className="ch100-share-theme-dots" role="group" aria-label="Poster color theme">
                <button
                  type="button"
                  className={`ch100-theme-swatch paper ${theme === "paper" ? "active" : ""}`}
                  onClick={() => setTheme("paper")}
                  title="Broadcast Paper"
                  aria-label="Broadcast Paper theme"
                />
                <button
                  type="button"
                  className={`ch100-theme-swatch midnight ${theme === "midnight" ? "active" : ""}`}
                  onClick={() => setTheme("midnight")}
                  title="Midnight Projection"
                  aria-label="Midnight Projection theme"
                />
                <button
                  type="button"
                  className={`ch100-theme-swatch gold ${theme === "gold" ? "active" : ""}`}
                  onClick={() => setTheme("gold")}
                  title="Criterion Gold"
                  aria-label="Criterion Gold theme"
                />
              </div>
            </div>

            <div className="ch100-share-canvas-frame">
              <canvas
                ref={canvasRef}
                className="ch100-share-canvas"
                aria-label="Preview of downloadable favorites poster"
              />
            </div>

            <button
              type="button"
              className="ch100-fav-btn-induct ch100-share-dl-btn"
              onClick={handleDownloadPoster}
              disabled={scopedItems.length === 0}
            >
              <Download size={15} strokeWidth={2.4} aria-hidden="true" />
              Download High-Res Poster PNG
            </button>
          </div>

          {/* RIGHT: Public Link + Formatted Copy Studio */}
          <div className="ch100-share-actions-col">
            {/* Public Screening Room Link */}
            <div className="ch100-share-card">
              <div className="ch100-share-card-head">
                <div className="ch100-share-card-title">
                  <Link2 size={15} strokeWidth={2.3} aria-hidden="true" />
                  <h3>Public Screening Room Link</h3>
                </div>
                <button
                  type="button"
                  className={`ch100-share-vis-btn ${vault.profile.isPublic ? "is-public" : ""}`}
                  onClick={() => onTogglePublic(!vault.profile.isPublic)}
                  title="Toggle whether your permanent link is publicly accessible"
                >
                  {vault.profile.isPublic ? (
                    <>
                      <Globe size={12} strokeWidth={2.2} aria-hidden="true" />
                      Public
                    </>
                  ) : (
                    <>
                      <Lock size={12} strokeWidth={2.2} aria-hidden="true" />
                      Private
                    </>
                  )}
                </button>
              </div>

              <p className="ch100-share-card-desc">
                Send one link when someone asks for your favorite{" "}
                {scope === "movie"
                  ? "movies"
                  : scope === "show"
                    ? "shows"
                    : "movies & shows"}
                . Opens a full cinema gallery—no login required.
              </p>

              <div className="ch100-share-link-row">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  aria-label="Shareable public link"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  className="ch100-btn-primary"
                  onClick={handleCopyLink}
                  disabled={publishing}
                >
                  {copiedKey === "link" ? (
                    <>
                      <Check size={14} strokeWidth={2.6} aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} strokeWidth={2.3} aria-hidden="true" />
                      {publishing ? "Saving…" : "Copy Link"}
                    </>
                  )}
                </button>
              </div>

              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ch100-share-open-link"
              >
                Preview public gallery page
                <ExternalLink size={12} strokeWidth={2.3} aria-hidden="true" />
              </a>
            </div>

            {/* Instant Copy for Chats / Markdown */}
            <div className="ch100-share-card">
              <div className="ch100-share-card-head">
                <div className="ch100-share-card-title">
                  <Copy size={15} strokeWidth={2.2} aria-hidden="true" />
                  <h3>Quick Copy for Messages</h3>
                </div>
                <div className="ch100-share-pill-group">
                  <button
                    type="button"
                    className={textFormat === "clean" ? "active" : ""}
                    onClick={() => setTextFormat("clean")}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    className={textFormat === "compact" ? "active" : ""}
                    onClick={() => setTextFormat("compact")}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    className={textFormat === "markdown" ? "active" : ""}
                    onClick={() => setTextFormat("markdown")}
                  >
                    Markdown
                  </button>
                </div>
              </div>

              <pre className="ch100-share-text-preview">{formattedText}</pre>

              <button
                type="button"
                className="ch100-nav-btn ch100-share-copy-text-btn"
                onClick={handleCopyText}
              >
                {copiedKey === "text" ? (
                  <>
                    <Check size={14} strokeWidth={2.6} aria-hidden="true" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy size={14} strokeWidth={2.2} aria-hidden="true" />
                    Copy Formatted List
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
