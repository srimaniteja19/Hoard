import { z } from "zod";
import { tilTypeValues } from "@/db/schema";

export const linkDensityValues = ["inline", "card", "quote", "full"] as const;
export type LinkDensity = typeof linkDensityValues[number];

export const createTilSchema = z.object({
  type: z.enum(tilTypeValues).default("FACT"),
  body: z.string().max(4000).optional().nullable(),
  code: z.string().max(10000).optional().nullable(),
  codeLang: z.string().max(24).optional().nullable(),
  linkUrl: z.string().url().optional().nullable().or(z.literal("")),
  linkDensity: z.enum(linkDensityValues).default("card"),
  dischargesBookmarkId: z.number().int().positive().optional().nullable(),
  loggedFor: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD")
    .optional(),
  replacesEntryId: z.string().max(128).optional().nullable(),
  supersededById: z.string().max(128).optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).optional().default([]),
  idempotencyKey: z.string().max(128).optional().nullable(),
  clientLoggedAt: z.string().optional().nullable(),
});

export type CreateTilInput = z.infer<typeof createTilSchema>;

export const updateTilSchema = createTilSchema.partial();
export type UpdateTilInput = z.infer<typeof updateTilSchema>;
