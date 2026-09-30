"use client";

import { useState } from "react";
import { Camera, Clapperboard, Flame, Tv } from "lucide-react";
import { parseMediaUrl } from "@/lib/studio/mediaEmbed";

interface Props {
  coverUrl: string | null | undefined;
  className?: string;
  size?: "card" | "list";
}

export function StudioCardThumbnail({ coverUrl, className = "", size = "card" }: Props) {
  const [error, setError] = useState(false);
  const parsed = parseMediaUrl(coverUrl);

  if (!coverUrl || !parsed || error) {
    if (size === "list") {
      return (
        <span className={`studio-thumb studio-thumb-none ${className}`}>
          <Clapperboard size={14} className="studio-muted" aria-hidden="true" />
        </span>
      );
    }
    return (
      <div className={`studio-card-thumb-mock ${className}`}>
        <Clapperboard size={20} aria-hidden="true" />
        <span className="studio-mono studio-small" style={{ fontSize: "9px" }}>
          9:16
        </span>
      </div>
    );
  }

  // YouTube Thumbnail
  if (parsed.type === "youtube") {
    return (
      <div className={`studio-thumb-container ${size === "list" ? "studio-thumb" : "studio-card-thumb"} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={parsed.thumbnailUrl}
          alt="YouTube Thumbnail"
          className="studio-thumb-media"
          onError={() => setError(true)}
        />
        <span className="studio-thumb-mini-badge studio-badge-yt" title="YouTube video">
          <Tv size={8} aria-hidden="true" />
        </span>
      </div>
    );
  }

  // Instagram Reel Card
  if (parsed.type === "instagram") {
    return (
      <div
        className={`studio-thumb-container studio-thumb-ig ${size === "list" ? "studio-thumb" : "studio-card-thumb"} ${className}`}
        title="Instagram Reel"
      >
        <Camera size={size === "list" ? 12 : 18} aria-hidden="true" />
        {size === "card" && (
          <span className="studio-mono studio-small" style={{ fontSize: "9px", marginTop: "2px" }}>
            REEL
          </span>
        )}
        <span className="studio-thumb-mini-badge studio-badge-ig" title="Instagram Reel">
          <Camera size={8} aria-hidden="true" />
        </span>
      </div>
    );
  }

  // TikTok Video Card
  if (parsed.type === "tiktok") {
    return (
      <div
        className={`studio-thumb-container studio-thumb-tt ${size === "list" ? "studio-thumb" : "studio-card-thumb"} ${className}`}
        title="TikTok Video"
      >
        <Flame size={size === "list" ? 12 : 18} aria-hidden="true" />
        <span className="studio-thumb-mini-badge studio-badge-tt" title="TikTok">
          <Flame size={8} aria-hidden="true" />
        </span>
      </div>
    );
  }

  // Regular Image
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={size === "list" ? `studio-thumb ${className}` : `studio-card-thumb ${className}`}
      src={parsed.url}
      alt="Cover"
      onError={() => setError(true)}
    />
  );
}
