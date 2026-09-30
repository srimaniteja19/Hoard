import { z } from "zod";
import { STUDIO_FORMATS, STUDIO_PILLARS, STUDIO_STATUSES } from "./types";

const scene = z.object({
  text: z.string().max(20_000),
  cards: z.array(z.string().max(200)).max(200).optional(),
});
const source = z.object({ title: z.string().max(500), url: z.string().max(2_000).optional() });
const part = z.object({
  n: z.number().int().min(1).max(500),
  title: z.string().max(300),
  summary: z.string().max(2_000).optional(),
  pieceId: z.string().max(100).nullable().optional(),
});

export const pieceFields = z.object({
  title: z.string().trim().min(1).max(300),
  status: z.enum(STUDIO_STATUSES),
  format: z.enum(STUDIO_FORMATS),
  pillar: z.enum(STUDIO_PILLARS),
  seriesId: z.string().max(100).nullable(),
  part: z.number().int().min(1).max(500).nullable(),
  script: z.array(scene).max(100),
  caption: z.string().max(10_000),
  hashtags: z.string().max(2_000),
  extraHashtags: z.string().max(4_000),
  sources: z.array(source).max(100),
  notes: z.string().max(50_000),
  coverUrl: z.string().max(2_000).nullable(),
});

export const seriesFields = z.object({
  title: z.string().trim().min(1).max(300),
  theme: z.string().max(200),
  pillar: z.enum(STUDIO_PILLARS),
  parts: z.array(part).max(200),
  nextPart: z.number().int().min(1).max(500),
});

export const ideaFields = z.object({
  title: z.string().trim().min(1).max(500),
  hook: z.string().max(2_000),
  pillar: z.enum(STUDIO_PILLARS),
  format: z.enum(STUDIO_FORMATS),
  status: z.enum(["new", "started"]),
});

export const STUDIO_KINDS = ["pieces", "series", "ideas"] as const;
export type StudioKind = (typeof STUDIO_KINDS)[number];

export const createSchemas = {
  pieces: pieceFields.partial(),
  series: seriesFields.partial().required({ title: true }),
  ideas: ideaFields.partial().required({ title: true }),
} as const;

export const patchSchemas = {
  pieces: pieceFields.partial(),
  series: seriesFields.partial(),
  ideas: ideaFields.partial(),
} as const;

export function isStudioKind(value: string): value is StudioKind {
  return (STUDIO_KINDS as readonly string[]).includes(value);
}
