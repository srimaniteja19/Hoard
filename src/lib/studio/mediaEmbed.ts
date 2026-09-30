/**
 * Media Embed Parser & Resolver for Studio
 * Parses YouTube, Instagram, and TikTok links into embeds and thumbnails
 */

import { extractYouTubeVideoId } from "@/lib/cleanTitle";

export type ParsedMedia =
  | {
      type: "youtube";
      videoId: string;
      embedUrl: string;
      thumbnailUrl: string;
      originalUrl: string;
      isShort: boolean;
    }
  | {
      type: "instagram";
      mediaId: string;
      mediaType: "reel" | "p";
      embedUrl: string;
      originalUrl: string;
    }
  | {
      type: "tiktok";
      videoId: string;
      embedUrl: string;
      originalUrl: string;
    }
  | {
      type: "image";
      url: string;
    }
  | null;

/**
 * Extracts a link URL if the user pasted an entire embed snippet (iframe, blockquote, etc.)
 */
export function extractUrlFromEmbedCode(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // If already a clean URL or data url, return it
  if (!trimmed.includes("<") && !trimmed.includes(">")) {
    return trimmed;
  }

  // Check data-instgrm-permalink="..."
  const igMatch = trimmed.match(/data-instgrm-permalink=["']([^"']+)["']/i);
  if (igMatch && igMatch[1]) return igMatch[1];

  // Check src="..."
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
  if (srcMatch && srcMatch[1]) return srcMatch[1];

  // Check href="..."
  const hrefMatch = trimmed.match(/href=["']([^"']+)["']/i);
  if (hrefMatch && hrefMatch[1]) return hrefMatch[1];

  return trimmed;
}

export function extractInstagramId(rawUrl: string): { id: string; type: "reel" | "p" } | null {
  if (!rawUrl) return null;
  const cleaned = extractUrlFromEmbedCode(rawUrl);
  try {
    const full = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
    const url = new URL(full);
    if (!url.hostname.includes("instagram.com") && !url.hostname.includes("instagr.am")) {
      return null;
    }

    // Match /reel/ID, /reels/ID, /p/ID, /tv/ID, /share/reel/ID
    const match = url.pathname.match(/\/(?:share\/)?(reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i);
    if (match && match[2]) {
      const type = match[1].toLowerCase().startsWith("reel") ? "reel" : "p";
      return { id: match[2], type };
    }
    return null;
  } catch {
    return null;
  }
}

export function extractTikTokId(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const cleaned = extractUrlFromEmbedCode(rawUrl);
  try {
    const full = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
    const url = new URL(full);
    if (!url.hostname.includes("tiktok.com")) return null;
    const match = url.pathname.match(/\/video\/(\d+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function parseMediaUrl(url: string | null | undefined): ParsedMedia {
  if (!url || typeof url !== "string") return null;
  const cleaned = extractUrlFromEmbedCode(url);
  const trimmed = cleaned.trim();
  if (!trimmed) return null;

  // 1. YouTube (shorts, watch, youtu.be, embed)
  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId) {
    const isShort = trimmed.toLowerCase().includes("/shorts/");
    return {
      type: "youtube",
      videoId: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      originalUrl: trimmed,
      isShort,
    };
  }

  // 2. Instagram (reels, posts)
  const ig = extractInstagramId(trimmed);
  if (ig) {
    return {
      type: "instagram",
      mediaId: ig.id,
      mediaType: ig.type,
      embedUrl: `https://www.instagram.com/${ig.type}/${ig.id}/embed/`,
      originalUrl: trimmed,
    };
  }

  // 3. TikTok
  const ttId = extractTikTokId(trimmed);
  if (ttId) {
    return {
      type: "tiktok",
      videoId: ttId,
      embedUrl: `https://www.tiktok.com/embed/v2/${ttId}`,
      originalUrl: trimmed,
    };
  }

  // 4. Regular image URL or Data URL
  return {
    type: "image",
    url: trimmed,
  };
}

/** Returns the best static thumbnail image URL for card previews */
export function getMediaThumbnailUrl(url: string | null | undefined): string | null {
  const parsed = parseMediaUrl(url);
  if (!parsed) return null;
  if (parsed.type === "youtube") return parsed.thumbnailUrl;
  if (parsed.type === "image") return parsed.url;
  return null;
}

