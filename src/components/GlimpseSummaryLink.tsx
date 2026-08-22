"use client";

import React, { useEffect, useState } from "react";
import { GLIMPSE_HOME, youtubeUrlForGlimpse } from "@/lib/glimpse";
import { Sparkles, Check, ArrowUpRight } from "lucide-react";

interface GlimpseSummaryLinkProps {
  url: string;
  variant?: "button" | "link" | "pill";
  className?: string;
}

export const GlimpseSummaryLink: React.FC<GlimpseSummaryLinkProps> = ({
  url,
  variant = "pill",
  className = "",
}) => {
  const youtubeUrl = youtubeUrlForGlimpse(url);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!youtubeUrl) return null;

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(youtubeUrl);
      setCopied(true);
    } catch {
      // Still open Glimpse even if clipboard is blocked.
    }
    window.open(GLIMPSE_HOME, "_blank", "noopener,noreferrer");
  };

  const label = copied ? "COPIED · OPENING GLIMPSE" : "SUMMARY ON GLIMPSE";

  if (variant === "button") {
    return (
      <button
        type="button"
        className={`glimpse-summary-btn ${className}`}
        onClick={handleClick}
        title="Copy YouTube URL and open Glimpse Summary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: copied ? "var(--lime)" : "var(--ink)",
          color: copied ? "var(--ink)" : "var(--yellow, #FFE94A)",
          border: "2px solid var(--ink)",
          boxShadow: copied ? "2px 2px 0 var(--ink)" : "2.5px 2.5px 0 var(--pink)",
          fontFamily: "var(--mono)",
          fontSize: "10.5px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          cursor: "pointer",
          padding: "5px 10px",
          transition: "all 0.12s ease",
          textTransform: "uppercase",
        }}
      >
        {copied ? (
          <Check size={12} strokeWidth={3} />
        ) : (
          <Sparkles size={12} fill="var(--pink)" color="var(--pink)" />
        )}
        <span>{label}</span>
        {!copied && <ArrowUpRight size={12} style={{ opacity: 0.7 }} />}
      </button>
    );
  }

  if (variant === "link") {
    return (
      <a
        href={GLIMPSE_HOME}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        title="Copy YouTube URL and open Glimpse Summary"
        className={`glimpse-summary-link ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontFamily: "var(--mono)",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          color: copied ? "var(--ink)" : "var(--ink)",
          textDecoration: "none",
          border: "1px solid var(--ink)",
          background: copied ? "var(--lime)" : "color-mix(in srgb, var(--pink) 12%, var(--paper))",
          padding: "2px 6px",
          boxShadow: "1px 1px 0 var(--ink)",
          width: "fit-content",
          transition: "all 0.1s ease",
        }}
      >
        {copied ? (
          <Check size={10} strokeWidth={3} />
        ) : (
          <Sparkles size={10} fill="var(--pink)" color="var(--pink)" />
        )}
        <span>{copied ? "COPIED" : "GLIMPSE ↗"}</span>
      </a>
    );
  }

  // Default "pill" variant (full-width brutalist bar for video preview cards)
  return (
    <button
      type="button"
      className={`glimpse-summary-pill ${className}`}
      onClick={handleClick}
      title="Copy YouTube URL and open Glimpse Summary"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        width: "100%",
        background: copied ? "var(--lime)" : "var(--ink)",
        color: copied ? "var(--ink)" : "var(--yellow, #FFE94A)",
        border: "1.5px solid var(--ink)",
        boxShadow: copied ? "1.5px 1.5px 0 var(--ink)" : "2px 2px 0 var(--pink)",
        fontFamily: "var(--mono)",
        fontSize: "9.5px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        padding: "6px 10px",
        cursor: "pointer",
        transition: "all 0.12s cubic-bezier(0.2, 0, 0, 1)",
        textTransform: "uppercase",
        boxDecorationBreak: "clone",
      }}
    >
      {copied ? (
        <Check size={11} strokeWidth={3} />
      ) : (
        <Sparkles size={11} fill="var(--pink)" color="var(--pink)" />
      )}
      <span>{label}</span>
      {!copied && <ArrowUpRight size={11} style={{ opacity: 0.8 }} />}
    </button>
  );
};
