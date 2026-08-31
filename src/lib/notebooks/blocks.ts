import { z } from "zod";

export const TodoItemSchema = z.union([
  z.object({
    text: z.string(),
    done: z.boolean().optional().default(false),
  }),
  z.string().transform((str) => ({ text: str, done: false })),
]);

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("paragraph"),
    text: z.string(), // inline markdown: **bold**, `code`, etc.
  }),
  z.object({
    id: z.string(),
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]).default(2),
    text: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("callout"),
    kind: z.enum(["gotcha", "question", "fact", "connects"]),
    text: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("code"),
    lang: z.string().default("PYTHON"),
    note: z.string().optional(),
    code: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("toggle"),
    summary: z.string(),
    body: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("todo"),
    items: z.array(TodoItemSchema),
  }),
  z.object({
    id: z.string(),
    type: z.literal("quote"),
    text: z.string(),
    attribution: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("image"),
    url: z.string(),
    caption: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("link"),
    url: z.string(),
    title: z.string().optional(),
    site: z.string().optional(),
    favicon: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("mark"), // ⏱ during a lecture
    timestamp: z.string(),
    text: z.string().nullable().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("divider"),
  }),
]);

export type Block = z.infer<typeof BlockSchema>;
export const BlocksSchema = z.array(BlockSchema);

export type LessonState = "empty" | "stub" | "written";

/**
 * Derives the state of a lesson from its page content. Never stored.
 */
export function lessonState(page?: { wordCount?: number | null } | null): LessonState {
  if (!page || !page.wordCount || page.wordCount === 0) return "empty";
  if (page.wordCount < 120) return "stub";
  return "written";
}

/**
 * Computes word count across text-bearing blocks in a page
 */
export function computeWordCount(blocks: Block[]): number {
  if (!Array.isArray(blocks)) return 0;
  let textAccum = "";

  for (const b of blocks) {
    switch (b.type) {
      case "paragraph":
      case "heading":
      case "quote":
      case "callout":
        textAccum += " " + b.text;
        break;
      case "toggle":
        textAccum += " " + b.summary + " " + b.body;
        break;
      case "todo":
        textAccum += " " + b.items.map((i) => i.text).join(" ");
        break;
      case "code":
        textAccum += " " + b.code;
        break;
      case "mark":
        if (b.text) textAccum += " " + b.text;
        break;
      case "link":
        if (b.title) textAccum += " " + b.title;
        break;
    }
  }

  const words = textAccum.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * Chunks a page's blocks into text units for vector embedding / collision search
 */
export function blocksToChunks(blocks: Block[]): { blockId: string; text: string }[] {
  const chunks: { blockId: string; text: string }[] = [];

  for (const b of blocks) {
    let t = "";
    if (b.type === "paragraph" || b.type === "heading" || b.type === "callout" || b.type === "quote") {
      t = b.text.trim();
    } else if (b.type === "toggle") {
      t = `${b.summary} — ${b.body}`.trim();
    } else if (b.type === "code") {
      t = (b.note ? `${b.note}: ` : "") + b.code.trim();
    } else if (b.type === "todo") {
      t = b.items.map((i) => i.text).join("; ").trim();
    }

    if (t.length > 25) {
      chunks.push({ blockId: b.id, text: t });
    }
  }

  return chunks;
}

/**
 * Generates a random stable block ID
 */
export function generateBlockId(): string {
  return "blk_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
