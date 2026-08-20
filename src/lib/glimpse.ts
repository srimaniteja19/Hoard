import { extractYouTubeVideoId } from "@/lib/cleanTitle";

export const GLIMPSE_HOME = "https://glimpse.wozart.com/";

/** Canonical watch URL to copy into Glimpse, or null if this is not a YouTube video. */
export function youtubeUrlForGlimpse(url: string): string | null {
  if (!url) return null;
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}
