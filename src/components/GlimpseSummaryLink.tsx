"use client";

import React, { useEffect, useState } from "react";
import { GLIMPSE_HOME, youtubeUrlForGlimpse } from "@/lib/glimpse";
import { Sparkles, Check } from "lucide-react";

interface GlimpseSummaryLinkProps {
  url: string;
  variant?: "button" | "link";
}

export const GlimpseSummaryLink: React.FC<GlimpseSummaryLinkProps> = ({
  url,
  variant = "link",
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

  const label = copied ? "Copied — paste into Glimpse" : "Summary on Glimpse";

  if (variant === "button") {
    return (
      <button
        type="button"
        className="p3"
        onClick={handleClick}
        title="Copy the YouTube URL and open Glimpse"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          background: copied ? "var(--lime)" : "var(--paper)",
          color: "var(--ink)",
          border: "1.5px solid var(--ink)",
          boxShadow: "1.5px 1.5px 0 var(--ink)",
          fontFamily: "var(--mono)",
          fontSize: "11px",
          fontWeight: 800,
          cursor: "pointer",
          padding: "4px 8px",
        }}
      >
        {copied ? <Check size={12} /> : <Sparkles size={12} color="var(--pink)" />}
        {label}
      </button>
    );
  }

  return (
    <a
      href={GLIMPSE_HOME}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      title="Copy the YouTube URL and open Glimpse"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "8px",
        fontFamily: "var(--mono)",
        fontSize: "11px",
        fontWeight: 800,
        color: copied ? "var(--lime)" : "var(--ink)",
        textDecoration: "none",
        border: "1px solid var(--ink)",
        background: copied ? "var(--ink)" : "var(--paper)",
        padding: "2px 7px",
        boxShadow: "1px 1px 0 var(--ink)",
        width: "fit-content",
      }}
    >
      {copied ? <Check size={11} /> : <Sparkles size={11} color="var(--pink)" />}
      {label} ↗
    </a>
  );
};
