"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Clapperboard,
  ExternalLink,
  Flame,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Tv,
} from "lucide-react";
import { parseMediaUrl, type ParsedMedia } from "@/lib/studio/mediaEmbed";

interface Props {
  coverUrl: string | null;
  onOpenCoverGen?: () => void;
  interactive?: boolean;
}

export function StudioCoverEmbed({ coverUrl, onOpenCoverGen }: Props) {
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [ratio, setRatio] = useState<"9:16" | "16:9">("9:16");

  const parsed = useMemo<ParsedMedia>(() => {
    setImgError(false);
    setIframeLoaded(false);
    setLoadTimedOut(false);
    return parseMediaUrl(coverUrl);
  }, [coverUrl]);

  // Set default ratio based on parsed media
  useEffect(() => {
    if (!parsed) return;
    if (parsed.type === "youtube") {
      setRatio(parsed.isShort ? "9:16" : "16:9");
    } else {
      setRatio("9:16");
    }
  }, [parsed]);

  // Fallback timeout for strict network / adblockers
  useEffect(() => {
    if (!parsed || (parsed.type !== "instagram" && parsed.type !== "youtube")) return;
    const timer = setTimeout(() => {
      setLoadTimedOut(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, [parsed]);

  if (!coverUrl || !parsed) {
    return (
      <div
        className="studio-cover-frame studio-cover-empty"
        onClick={onOpenCoverGen}
        style={{ cursor: onOpenCoverGen ? "pointer" : "default" }}
        title={onOpenCoverGen ? "Click to generate or set cover" : undefined}
      >
        <div className="studio-cover-placeholder">
          <Clapperboard size={26} aria-hidden="true" />
          <span className="studio-mono studio-small">NO COVER</span>
          <span className="studio-muted studio-small" style={{ fontSize: "10px" }}>
            Paste URL or generate
          </span>
        </div>
        <span className="studio-cover-badge">9:16</span>
      </div>
    );
  }

  // 1. YouTube Embed Player
  if (parsed.type === "youtube") {
    const isWide = ratio === "16:9";
    return (
      <div
        className={`studio-cover-frame is-embed is-youtube ${
          isWide ? "ratio-wide" : "ratio-vertical"
        } ${expanded ? "is-expanded" : ""}`}
        title="Embedded YouTube Video"
      >
        {/* Instant Poster & Loader (prevents black screen while iframe initializes) */}
        {!iframeLoaded && (
          <div className="studio-embed-poster-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={parsed.thumbnailUrl}
              alt="YouTube Video Thumbnail"
              className="studio-embed-poster-img"
            />
            <div className="studio-embed-poster-overlay">
              <span className="studio-embed-play-circle">
                <Play size={18} fill="currentColor" aria-hidden="true" />
              </span>
              <span className="studio-mono studio-small" style={{ fontSize: "11px" }}>
                Loading Player…
              </span>
            </div>
          </div>
        )}

        <iframe
          className="studio-embed-iframe"
          src={parsed.embedUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setIframeLoaded(true)}
        />

        <div className="studio-cover-embed-bar">
          <span className="studio-cover-badge studio-badge-yt">
            <Tv size={10} aria-hidden="true" />
            <span>YouTube</span>
          </span>

          <div className="studio-embed-bar-acts">
            <button
              type="button"
              className="studio-embed-icon-btn studio-embed-pill-btn"
              onClick={() => setRatio(ratio === "9:16" ? "16:9" : "9:16")}
              title={`Switch aspect ratio (currently ${ratio})`}
            >
              {ratio}
            </button>
            <button
              type="button"
              className="studio-embed-icon-btn"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Shrink preview" : "Expand preview"}
            >
              {expanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>
            <a
              href={parsed.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="studio-embed-icon-btn"
              title="Open video on YouTube"
            >
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. Instagram Reel / Post Embed Player
  if (parsed.type === "instagram") {
    return (
      <div
        className={`studio-cover-frame is-embed is-instagram ratio-vertical ${
          expanded ? "is-expanded" : ""
        }`}
        title="Embedded Instagram Reel"
      >
        {/* Instant Branded Placeholder / Skeleton while Instagram loads */}
        {!iframeLoaded && !loadTimedOut && (
          <div className="studio-embed-poster-wrap studio-embed-ig-poster">
            <div className="studio-embed-poster-overlay">
              <Camera size={26} aria-hidden="true" />
              <span className="studio-mono studio-small" style={{ fontWeight: 600 }}>
                Instagram Reel
              </span>
              <div className="studio-row" style={{ gap: "6px", alignItems: "center" }}>
                <Loader2 size={12} className="studio-spin" aria-hidden="true" />
                <span className="studio-muted studio-small" style={{ fontSize: "10px", color: "#fff" }}>
                  Connecting…
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Fallback if browser/extension strictly blocks Instagram iframes */}
        {loadTimedOut && !iframeLoaded && (
          <div className="studio-embed-poster-wrap studio-embed-ig-fallback">
            <div className="studio-embed-poster-overlay">
              <Camera size={24} aria-hidden="true" />
              <span className="studio-mono studio-small">Instagram Reel</span>
              <span className="studio-muted studio-small" style={{ fontSize: "10px", textAlign: "center", padding: "0 12px" }}>
                Embedded player blocked by browser protection.
              </span>
              <div className="studio-row" style={{ marginTop: "6px", gap: "6px" }}>
                <a
                  href={parsed.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="studio-btn studio-btn-hot studio-btn-sm"
                  style={{ textDecoration: "none" }}
                >
                  <ExternalLink size={11} /> Watch on Instagram
                </a>
                <button
                  type="button"
                  className="studio-btn studio-btn-plain studio-btn-sm"
                  onClick={() => {
                    setLoadTimedOut(false);
                    setIframeLoaded(false);
                  }}
                  title="Retry loading embed"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            </div>
          </div>
        )}

        <iframe
          className="studio-embed-iframe studio-ig-iframe"
          src={parsed.embedUrl}
          title="Instagram Reel"
          allowFullScreen
          scrolling="no"
          onLoad={() => setIframeLoaded(true)}
        />

        <div className="studio-cover-embed-bar">
          <span className="studio-cover-badge studio-badge-ig">
            <Camera size={10} aria-hidden="true" />
            <span>Instagram</span>
          </span>
          <div className="studio-embed-bar-acts">
            <button
              type="button"
              className="studio-embed-icon-btn"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Shrink preview" : "Expand preview"}
            >
              {expanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>
            <a
              href={parsed.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="studio-embed-icon-btn"
              title="Open on Instagram"
            >
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. TikTok Embed Player
  if (parsed.type === "tiktok") {
    return (
      <div
        className={`studio-cover-frame is-embed is-tiktok ratio-vertical ${
          expanded ? "is-expanded" : ""
        }`}
        title="Embedded TikTok Video"
      >
        <iframe
          className="studio-embed-iframe"
          src={parsed.embedUrl}
          title="TikTok video"
          allowFullScreen
          onLoad={() => setIframeLoaded(true)}
        />
        <div className="studio-cover-embed-bar">
          <span className="studio-cover-badge studio-badge-tt">
            <Flame size={10} aria-hidden="true" />
            <span>TikTok</span>
          </span>
          <div className="studio-embed-bar-acts">
            <a
              href={parsed.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="studio-embed-icon-btn"
              title="Open on TikTok"
            >
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 4. Regular Image or SVG Data URL
  return (
    <div
      className="studio-cover-frame"
      onClick={onOpenCoverGen}
      style={{ cursor: onOpenCoverGen ? "pointer" : "default" }}
      title={onOpenCoverGen ? "Click to edit or generate cover" : undefined}
    >
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={parsed.url}
          alt="Piece Cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="studio-cover-placeholder">
          <Clapperboard size={24} aria-hidden="true" />
          <span className="studio-mono studio-small" style={{ color: "var(--pink)" }}>
            IMAGE ERROR
          </span>
          <span className="studio-muted studio-small" style={{ fontSize: "10px" }}>
            Check image link
          </span>
        </div>
      )}
      <span className="studio-cover-badge">9:16</span>
    </div>
  );
}
