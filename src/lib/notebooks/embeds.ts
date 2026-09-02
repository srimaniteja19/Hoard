/**
 * Interactive Embed and Rich Link Helpers for Notebooks
 */

import { extractYouTubeVideoId } from "@/lib/cleanTitle";

export type EmbedType =
  | "youtube"
  | "vimeo"
  | "loom"
  | "spotify"
  | "codepen"
  | "figma"
  | "pdf"
  | "generic";

export interface EmbedInfo {
  embedType: EmbedType;
  embedUrl: string;
  originalUrl: string;
  title: string;
  providerName: string;
  aspectRatio: string; // e.g. "16/9", "4/3", "1/1", or "custom"
  defaultHeight?: number; // e.g. 152 for spotify track, 500 for pdf
  canIframe: boolean;
}

/**
 * Extracts timestamp in seconds from a URL query (e.g. ?t=1m30s, ?t=90, ?start=90)
 */
function parseTimestampToSeconds(param: string | null): number | null {
  if (!param) return null;
  const numOnly = parseInt(param, 10);
  if (!isNaN(numOnly) && /^\d+s?$/.test(param)) {
    return numOnly;
  }
  let total = 0;
  let matched = false;
  const hours = param.match(/(\d+)h/i);
  if (hours) {
    total += parseInt(hours[1], 10) * 3600;
    matched = true;
  }
  const minutes = param.match(/(\d+)m/i);
  if (minutes) {
    total += parseInt(minutes[1], 10) * 60;
    matched = true;
  }
  const seconds = param.match(/(\d+)s/i);
  if (seconds) {
    total += parseInt(seconds[1], 10);
    matched = true;
  }
  return matched ? total : null;
}

/**
 * Detects the embed type for a given URL
 */
export function detectEmbedType(rawUrl: string): EmbedType {
  if (!rawUrl) return "generic";
  const url = rawUrl.trim();

  try {
    const full = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(full);
    const host = urlObj.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = urlObj.pathname.toLowerCase();

    // 1. YouTube
    if (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      extractYouTubeVideoId(urlObj) !== null
    ) {
      return "youtube";
    }

    // 2. Vimeo
    if (host.includes("vimeo.com")) {
      return "vimeo";
    }

    // 3. Loom
    if (host.includes("loom.com")) {
      return "loom";
    }

    // 4. Spotify
    if (host.includes("spotify.com")) {
      return "spotify";
    }

    // 5. CodePen
    if (host.includes("codepen.io")) {
      return "codepen";
    }

    // 6. Figma
    if (host.includes("figma.com")) {
      return "figma";
    }

    // 7. PDF
    if (pathname.endsWith(".pdf") || pathname.includes("/pdf/")) {
      return "pdf";
    }

    return "generic";
  } catch {
    return "generic";
  }
}

/**
 * Computes the interactive embed information for a given URL
 */
export function getEmbedInfo(rawUrl: string): EmbedInfo {
  const full = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  let urlObj: URL;
  try {
    urlObj = new URL(full);
  } catch {
    return {
      embedType: "generic",
      embedUrl: full,
      originalUrl: full,
      title: "Web Link",
      providerName: "WEB",
      aspectRatio: "16/9",
      defaultHeight: 460,
      canIframe: true,
    };
  }

  const host = urlObj.hostname.toLowerCase().replace(/^www\./, "");
  const type = detectEmbedType(full);

  // 1. YouTube
  if (type === "youtube") {
    const videoId = extractYouTubeVideoId(urlObj) || "";
    let timeParam = "";
    const rawT = urlObj.searchParams.get("t") || urlObj.searchParams.get("start");
    const seconds = parseTimestampToSeconds(rawT);
    if (seconds && seconds > 0) {
      timeParam = `&start=${seconds}`;
    }

    const embedUrl = videoId
      ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1${timeParam}`
      : full;

    return {
      embedType: "youtube",
      embedUrl,
      originalUrl: full,
      title: "YouTube Video",
      providerName: "YOUTUBE",
      aspectRatio: "16/9",
      canIframe: true,
    };
  }

  // 2. Vimeo
  if (type === "vimeo") {
    const vimeoMatch = urlObj.pathname.match(/\/(\d+)/);
    const videoId = vimeoMatch ? vimeoMatch[1] : "";
    const embedUrl = videoId
      ? `https://player.vimeo.com/video/${videoId}?dnt=1`
      : full;

    return {
      embedType: "vimeo",
      embedUrl,
      originalUrl: full,
      title: "Vimeo Video",
      providerName: "VIMEO",
      aspectRatio: "16/9",
      canIframe: true,
    };
  }

  // 3. Loom
  if (type === "loom") {
    const loomMatch = urlObj.pathname.match(/\/share\/([a-zA-Z0-9_-]+)/);
    const videoId = loomMatch ? loomMatch[1] : "";
    const embedUrl = videoId
      ? `https://www.loom.com/embed/${videoId}`
      : full;

    return {
      embedType: "loom",
      embedUrl,
      originalUrl: full,
      title: "Loom Recording",
      providerName: "LOOM",
      aspectRatio: "16/9",
      canIframe: true,
    };
  }

  // 4. Spotify
  if (type === "spotify") {
    // open.spotify.com/(track|album|playlist|episode|show)/<id>
    const spotifyMatch = urlObj.pathname.match(/\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/i);
    if (spotifyMatch) {
      const mediaType = spotifyMatch[1];
      const mediaId = spotifyMatch[2];
      const isCompactTrack = mediaType === "track";
      return {
        embedType: "spotify",
        embedUrl: `https://open.spotify.com/embed/${mediaType}/${mediaId}?utm_source=generator&theme=0`,
        originalUrl: full,
        title: `Spotify ${mediaType.toUpperCase()}`,
        providerName: "SPOTIFY",
        aspectRatio: isCompactTrack ? "custom" : "16/9",
        defaultHeight: isCompactTrack ? 152 : 380,
        canIframe: true,
      };
    }
  }

  // 5. CodePen
  if (type === "codepen") {
    // codepen.io/<user>/pen/<id>
    const penMatch = urlObj.pathname.match(/\/([^/]+)\/pen\/([^/?#]+)/i);
    if (penMatch) {
      const user = penMatch[1];
      const penId = penMatch[2];
      return {
        embedType: "codepen",
        embedUrl: `https://codepen.io/${user}/embed/${penId}?default-tab=result&theme-id=dark`,
        originalUrl: full,
        title: "CodePen Demonstration",
        providerName: "CODEPEN",
        aspectRatio: "custom",
        defaultHeight: 460,
        canIframe: true,
      };
    }
  }

  // 6. Figma
  if (type === "figma") {
    return {
      embedType: "figma",
      embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(full)}`,
      originalUrl: full,
      title: "Figma Prototype",
      providerName: "FIGMA",
      aspectRatio: "16/9",
      defaultHeight: 480,
      canIframe: true,
    };
  }

  // 7. PDF
  if (type === "pdf") {
    return {
      embedType: "pdf",
      embedUrl: `${full}#toolbar=1&navpanes=0`,
      originalUrl: full,
      title: "PDF Document",
      providerName: "PDF",
      aspectRatio: "custom",
      defaultHeight: 560,
      canIframe: true,
    };
  }

  // 8. Generic Webpage
  return {
    embedType: "generic",
    embedUrl: full,
    originalUrl: full,
    title: host.toUpperCase(),
    providerName: host.split(".")[0].toUpperCase() || "WEB",
    aspectRatio: "custom",
    defaultHeight: 460,
    canIframe: true,
  };
}

/**
 * Returns a high-res favicon URL for a given domain/URL
 */
export function getFaviconUrl(url: string): string {
  try {
    const full = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(full);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  } catch {
    return "";
  }
}

/**
 * Formats a clean hostname string from a URL
 */
export function formatDomain(url: string): string {
  try {
    const full = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(full);
    return urlObj.hostname.replace(/^www\./, "").toUpperCase();
  } catch {
    return "WEB LINK";
  }
}
