"use client";

import React from "react";
import { LinkPreview } from "@/db/schema";
import { VideoFacade } from "@/components/til/embeds/VideoFacade";
import { GitHubEmbed } from "@/components/til/embeds/GitHubEmbed";
import { ArxivEmbed } from "@/components/til/embeds/ArxivEmbed";
import { XEmbed } from "@/components/til/embeds/XEmbed";
import { GenericEmbed } from "@/components/til/embeds/GenericEmbed";
import { AlertCircle } from "lucide-react";
import { extractYouTubeVideoId } from "@/lib/cleanTitle";

export type DensityOption = "inline" | "card" | "quote" | "full";

interface EmbedRouterProps {
  preview: LinkPreview | null;
  rawUrl?: string | null;
  density?: DensityOption;
  isSecondLink?: boolean;
}

export const EmbedRouter: React.FC<EmbedRouterProps> = ({
  preview,
  rawUrl,
  density = "card",
  isSecondLink = false,
}) => {
  const targetUrl = preview?.url || rawUrl;
  if (!targetUrl) return null;

  // Failed preview fallback: plain bordered link
  if (!preview || preview.failed) {
    return (
      <div
        style={{
          background: "var(--paper)",
          border: "var(--bd)",
          padding: "8px 12px",
          marginTop: "6px",
          marginBottom: "6px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <AlertCircle size={14} color="#FF007A" />
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--ink)",
            textDecoration: "underline",
            wordBreak: "break-all",
          }}
        >
          {targetUrl}
        </a>
      </div>
    );
  }

  // Hard rule: at most one FULL embed per entry. Force second link to "card".
  const effectiveDensity: DensityOption = isSecondLink && density === "full" ? "card" : density;

  // Render VideoFacade for video/audio with "full" density
  if (effectiveDensity === "full" && (preview.provider === "YOUTUBE" || preview.provider === "VIMEO")) {
    let embedUrl = "";
    if (preview.provider === "YOUTUBE") {
      const videoId = (preview.meta?.videoId as string) || extractYouTubeVideoId(targetUrl) || targetUrl.split("/").pop();
      embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
    } else if (preview.provider === "VIMEO") {
      const vimeoId = targetUrl.split("/").pop();
      embedUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    }

    return (
      <div style={{ marginTop: "10px", marginBottom: "10px" }}>
        <VideoFacade
          embedUrl={embedUrl}
          title={preview.title}
          author={preview.author}
          thumbnailUrl={preview.thumbnailKey}
          durationSec={preview.durationSec}
          providerName={preview.provider as "YOUTUBE" | "VIMEO"}
        />
      </div>
    );
  }

  // Density & Provider Routing
  switch (preview.provider) {
    case "GITHUB":
      return <GitHubEmbed preview={preview} density={effectiveDensity} />;
    case "ARXIV":
      return <ArxivEmbed preview={preview} density={effectiveDensity} />;
    case "X":
      return <XEmbed preview={preview} density={effectiveDensity} />;
    case "YOUTUBE":
    case "VIMEO":
    case "SPOTIFY":
    case "GENERIC":
    default:
      return <GenericEmbed preview={preview} density={effectiveDensity} />;
  }
};
