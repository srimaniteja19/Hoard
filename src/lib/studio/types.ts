import type { StudioPart, StudioScene, StudioSource } from "@/db/schema";

export type { StudioPart, StudioScene, StudioSource };

export const STUDIO_STATUSES = ["writing", "recording", "making", "ready", "posted"] as const;
export type StudioStatus = (typeof STUDIO_STATUSES)[number];

export const STATUS_LABEL: Record<StudioStatus, string> = {
  writing: "Writing",
  recording: "Recording",
  making: "Making",
  ready: "Ready for Buffer",
  posted: "Posted",
};

export const STUDIO_FORMATS = ["reel", "carousel", "youtube", "short"] as const;
export type StudioFormat = (typeof STUDIO_FORMATS)[number];

export const FORMAT_LABEL: Record<StudioFormat, string> = {
  reel: "Reel",
  carousel: "Carousel",
  youtube: "YouTube",
  short: "Short",
};

export const STUDIO_PILLARS = ["finance", "sports", "tech", "world", "concepts", "psych", "sites", "tools", "repos"] as const;
export type StudioPillar = (typeof STUDIO_PILLARS)[number];

export const PILLAR_LABEL: Record<StudioPillar, string> = {
  finance: "Finance",
  sports: "Sports science",
  tech: "Tech & AI",
  world: "World",
  concepts: "Concepts",
  psych: "Psychology",
  sites: "Websites",
  tools: "Tools",
  repos: "Repos",
};

export interface StudioPiece {
  id: string;
  title: string;
  status: StudioStatus;
  format: StudioFormat;
  pillar: StudioPillar;
  seriesId: string | null;
  part: number | null;
  script: StudioScene[];
  caption: string;
  /** Instagram hashtags (up to 5). */
  hashtags: string;
  /** The longer TikTok and YouTube set. */
  extraHashtags: string;
  sources: StudioSource[];
  notes: string;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StudioSeriesStatus = "active" | "completed";

export interface StudioSeries {
  id: string;
  title: string;
  theme: string;
  pillar: StudioPillar;
  parts: StudioPart[];
  nextPart: number;
  status: StudioSeriesStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudioIdea {
  id: string;
  title: string;
  hook: string;
  pillar: StudioPillar;
  format: StudioFormat;
  status: "new" | "started";
  createdAt: string;
}

export interface StudioData {
  pieces: StudioPiece[];
  series: StudioSeries[];
  ideas: StudioIdea[];
}

/** Standing house rules, used by the checks and pasted into the production brief. */
export const HOUSE_RULES = [
  "Never use em dashes.",
  "Always include a caption and hashtags (Instagram allows 5 hashtags).",
  "Curious eye logo on every post and slide.",
  "Reels use the ElevenLabs \"Jeff - Social Media\" voice.",
  "Reels are 45 to 60 seconds; YouTube videos are 3 to 5 minutes, 16:9.",
  "Explainers run continuously with no section labels; only news and update Reels get sections.",
  "Credit sources when their content is used.",
  "Series keep one visual theme; standalone Reels can vary (3D and motion graphics welcome).",
  "Reel files under 12 MB, with the cover image inside the first 0.6s and delivered separately.",
  "Background music well below the voice.",
  "End with: please follow and share for interesting and random content like this.",
  "Finance and money topics first, with creative, non-basic angles.",
  "Carousels: 7 to 8 slides with illustrations and images, not just text boxes.",
] as const;

export const FOLLOW_LINE = "Please follow and share for interesting and random content like this.";
