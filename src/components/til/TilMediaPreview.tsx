"use client";

import React, { useState } from "react";
import { LinkPreview } from "@/db/schema";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";
import { Play, ExternalLink, Globe, BookOpen, Video } from "lucide-react";
import { GlimpseSummaryLink } from "@/components/GlimpseSummaryLink";

interface TilMediaPreviewProps {
  url: string;
  preview?: LinkPreview | null;
  className?: string;
}

export const TilMediaPreview: React.FC<TilMediaPreviewProps> = ({
  url,
  preview,
  className,
}) => {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  if (!url) return null;

  const ytVideoId = extractYouTubeVideoId(url);
  const isYouTube = Boolean(ytVideoId);

  // ── 1. YouTube Small Side Preview / Embed ──
  if (isYouTube && ytVideoId) {
    const thumbUrl =
      preview?.thumbnailKey ||
      `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`;
    const title = preview?.title || "YouTube Video";
    const duration = preview?.durationSec
      ? `${Math.ceil(preview.durationSec / 60)} MIN`
      : "VIDEO";

    if (isPlayingVideo) {
      return (
        <div
          className={`til-media-preview-box ${className || ""}`}
          style={{
            width: "240px",
            maxWidth: "100%",
            flexShrink: 0,
            border: "2px solid var(--ink)",
            background: "#000",
            boxShadow: "3px 3px 0 var(--ink)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          </div>
          <div style={{ padding: "6px 8px", background: "var(--card, #FFFDF7)", borderTop: "1.5px solid var(--ink)" }}>
            <GlimpseSummaryLink url={url} variant="link" />
          </div>
        </div>
      );
    }

    return (
      <div
        className={`til-media-preview-box ${className || ""}`}
        style={{
          width: "240px",
          maxWidth: "100%",
          flexShrink: 0,
          border: "2px solid var(--ink)",
          background: "var(--card, #FFFDF7)",
          boxShadow: "3px 3px 0 var(--ink)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Thumbnail + Play overlay */}
        <div
          onClick={() => setIsPlayingVideo(true)}
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "56.25%",
            background: "#161616",
            backgroundImage: `url(${thumbUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            cursor: "pointer",
          }}
          title="Click to play YouTube video preview"
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--pink)",
                border: "2px solid var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "2px 2px 0 var(--ink)",
              }}
            >
              <Play size={16} fill="#fff" style={{ marginLeft: "2px" }} />
            </div>
          </div>

          {/* Duration Badge */}
          <span
            style={{
              position: "absolute",
              bottom: "6px",
              right: "6px",
              background: "rgba(0,0,0,0.85)",
              color: "var(--yellow, #FFE94A)",
              fontFamily: "var(--mono)",
              fontSize: "9px",
              fontWeight: 800,
              padding: "1px 5px",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {duration}
          </span>
        </div>

        {/* Video meta */}
        <div style={{ padding: "8px 10px", background: "var(--card, #FFFDF7)" }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              fontFamily: "var(--body)",
              fontSize: "12px",
              fontWeight: 700,
              lineHeight: 1.25,
              color: "var(--ink)",
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={title}
          >
            {title}
          </a>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "4px",
              fontFamily: "var(--mono)",
              fontSize: "9px",
              fontWeight: 700,
              opacity: 0.7,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <Video size={10} /> YOUTUBE
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: "2px", textDecoration: "none", fontWeight: 800 }}
            >
              WATCH <ExternalLink size={9} />
            </a>
          </div>

          <div style={{ marginTop: "8px" }}>
            <GlimpseSummaryLink url={url} variant="pill" />
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Article / Generic Web Page Small Preview ──
  const parsedHost = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "web";
    }
  })();

  const title = preview?.title || "Article Reference";
  const desc = preview?.description || "";
  const thumbUrl = preview?.thumbnailKey;

  return (
    <div
      className={`til-media-preview-box ${className || ""}`}
      style={{
        width: "230px",
        maxWidth: "100%",
        flexShrink: 0,
        border: "2px solid var(--ink)",
        background: "var(--card, #FFFDF7)",
        boxShadow: "3px 3px 0 var(--ink)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {thumbUrl ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            width: "100%",
            height: "90px",
            backgroundImage: `url(${thumbUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderBottom: "1.5px solid var(--ink)",
          }}
        />
      ) : (
        <div
          style={{
            height: "28px",
            background: "var(--shelf, #E7E2D8)",
            borderBottom: "1.5px solid var(--ink)",
            display: "flex",
            alignItems: "center",
            padding: "0 8px",
            fontFamily: "var(--mono)",
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: "var(--ink)",
            gap: "5px",
          }}
        >
          <BookOpen size={11} /> {parsedHost.toUpperCase()}
        </div>
      )}

      <div style={{ padding: "8px 10px" }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontFamily: "var(--body)",
            fontSize: "12px",
            fontWeight: 700,
            lineHeight: 1.25,
            color: "var(--ink)",
            textDecoration: "none",
          }}
          title={title}
        >
          {title}
        </a>

        {desc && (
          <p
            style={{
              margin: "4px 0 0",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              fontFamily: "var(--body)",
              fontSize: "10.5px",
              lineHeight: 1.3,
              opacity: 0.65,
            }}
          >
            {desc}
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "6px",
            paddingTop: "6px",
            borderTop: "1px dashed rgba(10,10,10,0.2)",
            fontFamily: "var(--mono)",
            fontSize: "9px",
            fontWeight: 700,
            opacity: 0.65,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {parsedHost}
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--ink)",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            READ <ExternalLink size={9} />
          </a>
        </div>
      </div>
    </div>
  );
};
