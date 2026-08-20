"use client";

import React, { useEffect, useState } from "react";
import { GLIMPSE_HOME, youtubeUrlForGlimpse } from "@/lib/glimpse";

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
      >
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
        marginTop: "8px",
        fontFamily: "var(--mono)",
        fontSize: "11px",
        fontWeight: 800,
        color: "var(--ink)",
        textDecoration: "underline",
        textUnderlineOffset: "3px",
      }}
    >
      {label} ↗
    </a>
  );
};
