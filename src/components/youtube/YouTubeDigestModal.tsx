"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";
import { useYouTubeDigest } from "./YouTubeDigestProvider";
import { DigestJson, formatDigestJsonToMarkdown } from "@/lib/youtube/digest";
import { DigestJsonViewer } from "./DigestJsonViewer";
import {
  X,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Clock,
  Video,
  FileText,
  BookmarkPlus,
  Save,
  Flame,
  ArrowUpRight,
} from "lucide-react";

interface YouTubeDigestModalProps {
  isOpen: boolean;
  url: string | null;
  initialTitle?: string;
  onClose: () => void;
}

export const YouTubeDigestModal: React.FC<YouTubeDigestModalProps> = ({
  isOpen,
  url,
  initialTitle,
  onClose,
}) => {
  const { isDigestSaved, markDigestSaved, markDigestRemoved } = useYouTubeDigest();
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string>("Initializing...");
  const [progressPercent, setProgressPercent] = useState<number>(10);
  const [streamedText, setStreamedText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSavedLocally, setIsSavedLocally] = useState(false);
  const [saving, setSaving] = useState(false);

  const [meta, setMeta] = useState<{
    videoId: string;
    title: string;
    author: string;
    durationSec: number;
    cuesCount: number;
    wordCount: number;
    hasCues: boolean;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [mintedTil, setMintedTil] = useState(false);
  const [minting, setMinting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const videoId = (url && extractYouTubeVideoId(url)) || meta?.videoId || "";

  const startStream = useCallback(async (targetUrl: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setStreamedText("");
    setMintedTil(false);
    setProgressPercent(15);
    setProgressStep("✦ [1/3] Fetching video transcript and metadata...");

    try {
      const res = await fetch("/api/youtube/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
        signal,
      });

      if (!res.ok) {
        let errMsg = "Failed to generate YouTube digest";
        try {
          const errJson = await res.json();
          errMsg = errJson.error || errMsg;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      // Extract metadata from response headers
      const vId = res.headers.get("X-Video-Id") || extractYouTubeVideoId(targetUrl) || "";
      const rawTitle = res.headers.get("X-Video-Title");
      const title = rawTitle ? decodeURIComponent(rawTitle) : initialTitle || "YouTube Video";
      const rawAuthor = res.headers.get("X-Video-Author");
      const author = rawAuthor ? decodeURIComponent(rawAuthor) : "YouTube Channel";
      const durationSec = Number(res.headers.get("X-Video-Duration")) || 300;
      const cuesCount = Number(res.headers.get("X-Video-Cues")) || 0;
      const wordCount = Number(res.headers.get("X-Video-Words")) || 0;
      const hasCues = res.headers.get("X-Has-Cues") === "true";

      setMeta({
        videoId: vId,
        title,
        author,
        durationSec,
        cuesCount,
        wordCount,
        hasCues,
      });

      setProgressPercent(50);
      setProgressStep(
        hasCues && cuesCount > 0
          ? `✦ [2/3] Read ${cuesCount} transcript cues (${wordCount} words) — Synthesizing AI digest...`
          : "✦ [2/3] Synthesizing AI editorial digest from video context..."
      );

      if (!res.body) {
        throw new Error("No response stream received");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulated = "";
      let firstChunk = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (firstChunk) {
          firstChunk = false;
          setProgressPercent(90);
          setProgressStep("✦ [3/3] Streaming real-time summary...");
        }

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamedText(accumulated);
      }

      setProgressPercent(100);
      setProgressStep("✦ Digest complete!");

      // Auto-save generated digest so it's persisted for subsequent clicks
      if (vId && accumulated) {
        try {
          await fetch("/api/youtube/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: targetUrl,
              videoId: vId,
              title,
              author,
              content: accumulated,
            }),
          });
          setIsSavedLocally(true);
          markDigestSaved(vId);
        } catch {
          // ignore auto-save failure
        }
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || signal?.aborted) {
        return;
      }
      console.error("[YouTubeDigest Error]", err);
      setError(err?.message || "Failed to generate summary");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [initialTitle, markDigestSaved]);

  const lastFetchedKeyRef = useRef<string | null>(null);

  // Check for saved digest first, else stream
  useEffect(() => {
    if (!isOpen || !url) {
      lastFetchedKeyRef.current = null;
      setStreamedText("");
      setError(null);
      setLoading(false);
      setMeta(null);
      setIsSavedLocally(false);
      return;
    }

    if (lastFetchedKeyRef.current === url) {
      return;
    }
    lastFetchedKeyRef.current = url;

    const targetUrl = url;
    const vId = extractYouTubeVideoId(targetUrl) || "";
    const isAlreadySaved = isDigestSaved(vId);
    setIsSavedLocally(isAlreadySaved);

    const controller = new AbortController();

    async function checkSavedAndLoad() {
      try {
        const res = await fetch(`/api/youtube/saved?url=${encodeURIComponent(targetUrl)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.saved && data.digest) {
            setStreamedText(data.digest.content);
            setMeta({
              videoId: data.digest.videoId,
              title: data.digest.title,
              author: data.digest.author || "YouTube Channel",
              durationSec: 300,
              cuesCount: 0,
              wordCount: data.digest.content.split(/\s+/).length,
              hasCues: true,
            });
            setIsSavedLocally(true);
            markDigestSaved(data.digest.videoId);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore and fallback to stream
      }

      // No saved digest found, start stream
      startStream(targetUrl, controller.signal);
    }

    checkSavedAndLoad();

    return () => {
      controller.abort();
    };
  }, [isOpen, url, isDigestSaved, markDigestSaved, startStream]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !url) return null;

  const durationMin = meta?.durationSec ? Math.max(1, Math.ceil(meta.durationSec / 60)) : null;

  let parsedDigestJson: DigestJson | null = null;
  if (streamedText) {
    const trimmed = streamedText.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        parsedDigestJson = JSON.parse(trimmed);
      } catch {
        // partial json
      }
    } else {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedDigestJson = JSON.parse(match[0]);
        } catch {
          // partial json
        }
      }
    }
  }

  const handleCopy = async () => {
    if (!streamedText) return;
    try {
      const textToCopy = parsedDigestJson
        ? formatDigestJsonToMarkdown(parsedDigestJson)
        : streamedText;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSave = async () => {
    if (!streamedText || saving || !url) return;
    setSaving(true);
    try {
      const vId = extractYouTubeVideoId(url) || meta?.videoId || "";
      const saveTitle = parsedDigestJson?.title || meta?.title || initialTitle || "YouTube Digest";
      const res = await fetch("/api/youtube/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          videoId: vId,
          title: saveTitle,
          author: meta?.author,
          content: streamedText,
        }),
      });

      if (res.ok) {
        setIsSavedLocally(true);
        if (vId) markDigestSaved(vId);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleMintTil = async () => {
    if (!streamedText || minting || mintedTil) return;
    setMinting(true);
    try {
      let claim = "";
      if (parsedDigestJson) {
        claim = parsedDigestJson.takeaway || parsedDigestJson.thesis || "";
      } else {
        const handMatch = streamedText.match(/:::hand\s*([\s\S]*?):::/);
        if (handMatch) {
          claim = handMatch[1].replace(/\*\*WHAT TO ACTUALLY REMEMBER:\*\*/i, "").trim();
        } else {
          const thesisMatch = streamedText.match(/>\s*\*\*THE THESIS:\*\*\s*(.*)/i);
          if (thesisMatch) {
            claim = thesisMatch[1].trim();
          } else {
            claim = streamedText.slice(0, 280);
          }
        }
      }

      const res = await fetch("/api/til", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: claim,
          linkUrl: url,
          type: "FACT",
          tags: ["youtube", "digest"],
        }),
      });

      if (res.ok) {
        setMintedTil(true);
      }
    } catch {
      // ignore
    } finally {
      setMinting(false);
    }
  };

  // Simple clean markdown parser for the streamed digest
  const renderFormattedDigest = (markdown: string) => {
    const parts = markdown.split(/:::hand([\s\S]*?):::/g);

    return parts.map((part, pIdx) => {
      // Odd indices are :::hand blocks
      if (pIdx % 2 === 1) {
        return (
          <div
            key={pIdx}
            style={{
              margin: "24px 0",
              padding: "18px 22px",
              background: "#FCE94F",
              border: "3px solid #0A0A0A",
              boxShadow: "5px 5px 0 #0A0A0A",
              transform: "rotate(-0.5deg)",
            }}
          >
            <div
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#0A0A0A",
                marginBottom: "8px",
                textTransform: "uppercase",
              }}
            >
              ✦ WHAT TO ACTUALLY REMEMBER
            </div>
            <div
              style={{
                fontFamily: "Caveat, cursive",
                fontSize: "24px",
                fontWeight: 700,
                lineHeight: 1.3,
                color: "#0A0A0A",
              }}
            >
              {part.replace(/\*\*WHAT TO ACTUALLY REMEMBER:\*\*/i, "").trim()}
            </div>
          </div>
        );
      }

      // Standard markdown rendering
      const lines = part.split("\n");
      return (
        <div key={pIdx}>
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();

            if (!trimmed) {
              return <div key={lIdx} style={{ height: "10px" }} />;
            }

            if (trimmed.startsWith("# ")) {
              return (
                <h1
                  key={lIdx}
                  style={{
                    fontFamily: "Bricolage Grotesque, Space Grotesk, sans-serif",
                    fontSize: "28px",
                    fontWeight: 800,
                    lineHeight: 1.15,
                    letterSpacing: "-0.02em",
                    color: "#0A0A0A",
                    margin: "16px 0 12px 0",
                  }}
                >
                  {trimmed.replace(/^#\s+/, "")}
                </h1>
              );
            }

            if (trimmed.startsWith("### ")) {
              return (
                <h3
                  key={lIdx}
                  style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: "13px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: "#FF2D8A",
                    textTransform: "uppercase",
                    marginTop: "24px",
                    marginBottom: "10px",
                  }}
                >
                  {trimmed.replace(/^###\s+/, "")}
                </h3>
              );
            }

            if (trimmed.startsWith("#### ")) {
              const content = trimmed.replace(/^####\s+/, "");
              return (
                <h4
                  key={lIdx}
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#0A0A0A",
                    marginTop: "16px",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>{content.replace(/`\[.*?\]`/, "").trim()}</span>
                  {content.match(/`\[(.*?)\]`/) && (
                    <span
                      style={{
                        fontFamily: "Space Mono, monospace",
                        fontSize: "10px",
                        background: "#0A0A0A",
                        color: "#FCE94F",
                        padding: "2px 6px",
                        fontWeight: 700,
                      }}
                    >
                      {content.match(/`\[(.*?)\]`/)![1]}
                    </span>
                  )}
                </h4>
              );
            }

            if (trimmed.startsWith("> ")) {
              return (
                <div
                  key={lIdx}
                  style={{
                    padding: "12px 16px",
                    background: "#FFFFFF",
                    borderLeft: "4px solid #FF2D8A",
                    borderTop: "1.5px solid #0A0A0A",
                    borderRight: "1.5px solid #0A0A0A",
                    borderBottom: "1.5px solid #0A0A0A",
                    boxShadow: "3px 3px 0 #0A0A0A",
                    margin: "12px 0 16px 0",
                    fontFamily: "Space Grotesk, sans-serif",
                    fontSize: "14px",
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {trimmed.replace(/^>\s*/, "").replace(/\*\*THE THESIS:\*\*/i, "✦ THESIS: ")}
                </div>
              );
            }

            if (trimmed === "---") {
              return (
                <hr
                  key={lIdx}
                  style={{
                    border: "none",
                    borderTop: "2px dashed #0A0A0A",
                    margin: "20px 0",
                    opacity: 0.3,
                  }}
                />
              );
            }

            if (trimmed.startsWith("- ")) {
              return (
                <div
                  key={lIdx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    margin: "4px 0",
                    fontFamily: "Space Grotesk, sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: "#FF2D8A", fontWeight: 800 }}>•</span>
                  <span>
                    {trimmed.replace(/^- \*\*(.*?)\*\*:/, "[$1]:").replace(/^- /, "")}
                  </span>
                </div>
              );
            }

            return (
              <p
                key={lIdx}
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "13.5px",
                  lineHeight: 1.5,
                  color: "#161616",
                  margin: "8px 0",
                }}
              >
                {trimmed}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(10, 10, 10, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          background: "#F2EFE8",
          border: "3px solid #0A0A0A",
          boxShadow: "8px 8px 0 #0A0A0A",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            background: "#0A0A0A",
            color: "#FCE94F",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "3px solid #0A0A0A",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                background: isSavedLocally ? "#B8F04A" : "#FF2D8A",
                color: isSavedLocally ? "#0A0A0A" : "#FFFFFF",
                padding: "2px 8px",
                border: "1px solid #0A0A0A",
              }}
            >
              {isSavedLocally ? "HOARD · DIGEST SAVED ✓" : "HOARD · DIGEST"}
            </span>
            {meta?.title && (
              <span
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#FFFFFF",
                  maxWidth: "380px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {meta.title}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#FCE94F",
                  fontFamily: "Space Mono, monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  padding: "3px 6px",
                  border: "1px solid #FCE94F",
                }}
              >
                WATCH <ArrowUpRight size={10} />
              </a>
            )}
            <button
              onClick={onClose}
              style={{
                background: "#FF2D8A",
                color: "#FFFFFF",
                border: "1px solid #FFFFFF",
                cursor: "pointer",
                padding: "3px 8px",
                fontWeight: 800,
                fontFamily: "Space Mono, monospace",
                fontSize: "12px",
              }}
              title="Close modal (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Live Progress Bar */}
        {loading && (
          <div
            style={{
              background: "#FFE94A",
              borderBottom: "2px solid #0A0A0A",
              padding: "8px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "Space Mono, monospace",
                fontSize: "11px",
                fontWeight: 800,
                color: "#0A0A0A",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={13} className="animate-spin text-[#FF2D8A]" />
                {progressStep}
              </span>
              <span>{progressPercent}%</span>
            </div>
            {/* Progress track */}
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "rgba(10, 10, 10, 0.15)",
                border: "1px solid #0A0A0A",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  background: "#FF2D8A",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div
            style={{
              background: "#FF2D8A",
              color: "#FFFFFF",
              padding: "12px 16px",
              borderBottom: "3px solid #0A0A0A",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>⚠ {error}</span>
            <button
              onClick={() => {
                if (url) startStream(url);
              }}
              style={{
                background: "#0A0A0A",
                color: "#FCE94F",
                border: "1.5px solid #FFFFFF",
                padding: "3px 8px",
                fontFamily: "Space Mono, monospace",
                fontSize: "10px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ↻ RETRY
            </button>
          </div>
        )}

        {/* Content Body */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            background: "#F2EFE8",
          }}
        >
          {/* Metadata Card Header */}
          {meta && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "8px 12px",
                background: "#FFFFFF",
                border: "2px solid #0A0A0A",
                boxShadow: "3px 3px 0 #0A0A0A",
                marginBottom: "18px",
                fontFamily: "Space Mono, monospace",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "#0A0A0A", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Video size={12} color="#FF2D8A" /> {meta.author}
                </span>
                {durationMin && (
                  <span style={{ color: "#0A0A0A", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={12} /> ~{durationMin} MINS
                  </span>
                )}
                {meta.hasCues && meta.cuesCount > 0 ? (
                  <span style={{ background: "#B8F04A", padding: "1px 6px", border: "1px solid #0A0A0A" }}>
                    ✓ {meta.cuesCount} CUES
                  </span>
                ) : (
                  <span style={{ background: "#7FE9F7", padding: "1px 6px", border: "1px solid #0A0A0A" }}>
                    ✦ AI SYNTHESIS
                  </span>
                )}
              </div>

              {isSavedLocally && (
                <span
                  style={{
                    background: "#B8F04A",
                    color: "#0A0A0A",
                    padding: "2px 8px",
                    fontWeight: 800,
                    border: "1px solid #0A0A0A",
                    fontSize: "10px",
                  }}
                >
                  ✓ SAVED TO HOARD
                </span>
              )}
            </div>
          )}

          {/* Streamed Content */}
          {streamedText ? (
            parsedDigestJson ? (
              <DigestJsonViewer digest={parsedDigestJson} />
            ) : (
              <div>{renderFormattedDigest(streamedText)}</div>
            )
          ) : (
            !error && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "220px",
                  gap: "12px",
                  color: "#0A0A0A",
                  fontFamily: "Space Mono, monospace",
                }}
              >
                <Sparkles size={28} className="animate-spin text-[#FF2D8A]" />
                <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.06em" }}>
                  {progressStep}
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            background: "#FFFFFF",
            borderTop: "3px solid #0A0A0A",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* MINT AS TIL Button */}
            <button
              onClick={handleMintTil}
              disabled={!streamedText || minting || mintedTil}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: mintedTil ? "#B8F04A" : "#FF2D8A",
                color: mintedTil ? "#0A0A0A" : "#FFFFFF",
                border: "2px solid #0A0A0A",
                boxShadow: "3px 3px 0 #0A0A0A",
                fontFamily: "Space Mono, monospace",
                fontSize: "11px",
                fontWeight: 800,
                padding: "8px 14px",
                cursor: !streamedText || minting || mintedTil ? "not-allowed" : "pointer",
                opacity: !streamedText ? 0.6 : 1,
              }}
              title="Mint takeaway as a TIL card in HOARD"
            >
              {mintedTil ? <Check size={13} strokeWidth={3} /> : <BookmarkPlus size={13} />}
              <span>{mintedTil ? "MINTED IN TIL ✓" : minting ? "MINTING..." : "→ MINT AS A TIL CLAIM"}</span>
            </button>

            {/* COPY MARKDOWN Button */}
            <button
              onClick={handleCopy}
              disabled={!streamedText}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: copied ? "#B8F04A" : "#FFFFFF",
                color: "#0A0A0A",
                border: "2px solid #0A0A0A",
                boxShadow: "2.5px 2.5px 0 #0A0A0A",
                fontFamily: "Space Mono, monospace",
                fontSize: "11px",
                fontWeight: 800,
                padding: "8px 12px",
                cursor: !streamedText ? "not-allowed" : "pointer",
                opacity: !streamedText ? 0.6 : 1,
              }}
              title="Copy markdown summary"
            >
              {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
              <span>{copied ? "COPIED!" : "COPY MARKDOWN"}</span>
            </button>

            {/* SAVE DIGEST Button (After Copy Markdown) */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!streamedText || saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: isSavedLocally ? "#B8F04A" : "#FCE94F",
                color: "#0A0A0A",
                border: "2px solid #0A0A0A",
                boxShadow: isSavedLocally ? "3px 3px 0 #0A0A0A" : "3px 3px 0 #FF2D8A",
                fontFamily: "Space Mono, monospace",
                fontSize: "11px",
                fontWeight: 800,
                padding: "8px 14px",
                cursor: !streamedText || saving ? "not-allowed" : "pointer",
                opacity: !streamedText ? 0.6 : 1,
              }}
              title="Save this digest to HOARD"
            >
              {isSavedLocally ? (
                <Check size={13} strokeWidth={3} />
              ) : (
                <Save size={13} />
              )}
              <span>
                {isSavedLocally
                  ? "DIGEST SAVED ✓"
                  : saving
                  ? "SAVING..."
                  : "💾 SAVE DIGEST"}
              </span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => {
                if (url) {
                  lastFetchedKeyRef.current = null;
                  startStream(url);
                }
              }}
              disabled={loading || !url}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#FFFFFF",
                color: "#0A0A0A",
                border: "1.5px solid #0A0A0A",
                fontFamily: "Space Mono, monospace",
                fontSize: "10.5px",
                fontWeight: 800,
                padding: "6px 10px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              title="Re-generate fresh digest"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              <span>↻ REGENERATE</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: "#0A0A0A",
                color: "#FFFFFF",
                border: "1.5px solid #0A0A0A",
                fontFamily: "Space Mono, monospace",
                fontSize: "10.5px",
                fontWeight: 800,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
