import { z } from "zod";

export const TodoItemSchema = z.union([
  z.object({
    text: z.string(),
    done: z.boolean().optional().default(false),
  }),
  z.string().transform((str) => ({ text: str, done: false })),
]);

export const AnchorItemSchema = z.union([
  z.object({
    timestamp: z.string().optional().default("0:00"),
    label: z.string(),
    sectionTag: z.string().optional().default("§"),
  }),
  z.string().transform((str) => {
    const match = str.match(/^(\d+:\d+)\s+(.+?)(?:\s*—\s*(§\d+|NEXT))?$/);
    if (match) {
      return {
        timestamp: match[1],
        label: match[2],
        sectionTag: match[3] || "§",
      };
    }
    return {
      timestamp: "0:00",
      label: str,
      sectionTag: "§",
    };
  }),
]);

export const ScaleItemSchema = z.union([
  z.object({
    name: z.string(),
    pct: z.number().optional().default(50),
    color: z.string().optional(),
  }),
  z.string().transform((str) => ({
    name: str,
    pct: 50,
    color: "shade",
  })),
]);

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("paragraph"),
    text: z.string(), // inline markdown: **bold**, `code`, etc.
  }),
  z.object({
    id: z.string(),
    type: z.literal("bullet"),
    text: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("numbered"),
    number: z.number().optional().default(1),
    text: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]).default(2),
    text: z.string(),
    ts: z.string().optional(), // timestamp anchor e.g. "0:07", "1:01"
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
    type: z.literal("example"), // Before/After worked example
    title: z.string().default("THE EXAMPLE HE USED"),
    timestampRange: z.string().optional(),
    v1Title: z.string().default("DRAFT 1 · TYPED FAST"),
    v1Text: z.string(),
    v1BadWords: z.array(z.string()).optional(),
    v2Title: z.string().default("DRAFT 2 · AFTER REREADING"),
    v2Text: z.string(),
    v2FixWords: z.array(z.string()).optional(),
    caughtLegend: z.string().optional(),
    fixedLegend: z.string().optional(),
    summaryPill: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("scale"), // Honest size of the win
    title: z.string().default("HIS WORDS, NOT MEASUREMENTS"),
    items: z.array(ScaleItemSchema),
    footer: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("anchors"), // The lecture, indexed
    title: z.string().default("THE LECTURE, INDEXED"),
    duration: z.string().optional(),
    items: z.array(AnchorItemSchema),
  }),
  z.object({
    id: z.string(),
    type: z.literal("next"), // Next lecture trailer
    initial: z.string().default("A"),
    title: z.string(),
    meta: z.string().default("ANNOUNCED · NOT YET WATCHED"),
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
      case "bullet":
      case "numbered":
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
      case "example":
        textAccum += " " + b.v1Text + " " + b.v2Text + " " + (b.summaryPill || "");
        break;
      case "scale":
        textAccum += " " + b.items.map((i) => i.name).join(" ") + " " + (b.footer || "");
        break;
      case "anchors":
        textAccum += " " + b.items.map((i) => i.label).join(" ");
        break;
      case "next":
        textAccum += " " + b.title + " " + b.meta;
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
    if (
      b.type === "paragraph" ||
      b.type === "heading" ||
      b.type === "callout" ||
      b.type === "quote" ||
      b.type === "bullet" ||
      b.type === "numbered"
    ) {
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

/**
 * Converts note blocks into clean GitHub-Flavored Markdown
 */
export function convertBlocksToMarkdown(title: string, blocks: Block[]): string {
  const lines: string[] = [`# ${title}\n`];

  for (const b of blocks) {
    switch (b.type) {
      case "paragraph":
        lines.push(`${b.text}\n`);
        break;
      case "bullet":
        lines.push(`- ${b.text}`);
        break;
      case "numbered":
        lines.push(`${b.number || 1}. ${b.text}`);
        break;
      case "heading": {
        const prefix = b.level === 3 ? "###" : "##";
        const ts = b.ts ? ` \`[⏱ ${b.ts}]\`` : "";
        lines.push(`${prefix} ${b.text}${ts}\n`);
        break;
      }
      case "callout":
        lines.push(`> [!${b.kind.toUpperCase()}]\n> ${b.text}\n`);
        break;
      case "quote":
        lines.push(`> "${b.text}"\n${b.attribution ? `> — *${b.attribution}*\n` : ""}`);
        break;
      case "code":
        lines.push(`\`\`\`${(b.lang || "").toLowerCase()}\n${b.code}\n\`\`\`\n`);
        break;
      case "todo":
        for (const item of b.items) {
          lines.push(`- [${item.done ? "x" : " "}] ${item.text}`);
        }
        lines.push("");
        break;
      case "toggle":
        lines.push(`<details>\n<summary>${b.summary}</summary>\n\n${b.body}\n</details>\n`);
        break;
      case "image":
        lines.push(`![${b.caption || "Image"}](${b.url})\n`);
        break;
      case "divider":
        lines.push(`---\n`);
        break;
      case "link":
        lines.push(`[${b.title || b.url}](${b.url})\n`);
        break;
      case "example":
        lines.push(`**Before:**\n> ${b.v1Text}\n\n**After:**\n> ${b.v2Text}\n`);
        break;
    }
  }

  return lines.join("\n");
}
