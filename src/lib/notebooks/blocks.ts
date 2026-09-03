import { z } from "zod";
import { detectEmbedType, getEmbedInfo } from "./embeds";

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

export const TableColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  align: z.enum(["left", "center", "right"]).optional().default("left"),
  width: z.number().optional(),
});

export const TableBlockSchema = z.object({
  id: z.string(),
  type: z.literal("table"),
  title: z.string().optional(),
  columns: z.array(TableColumnSchema),
  rows: z.array(z.array(z.string())),
  hasHeaderRow: z.boolean().optional(),
  striped: z.boolean().optional(),
});

export const MathBlockSchema = z.object({
  id: z.string(),
  type: z.literal("math"),
  latex: z.string(),
  title: z.string().optional(),
  caption: z.string().optional(),
});

export const StatBlockSchema = z.object({
  id: z.string(),
  type: z.literal("stat"),
  label: z.string(),
  value: z.string(),
  change: z.string().optional(),
  trend: z.enum(["up", "down", "neutral"]).optional(),
  progress: z.number().optional(),
  target: z.string().optional(),
  note: z.string().optional(),
});

export const TimelineItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  dateOrPhase: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["completed", "current", "upcoming"]).default("upcoming"),
});

export const TimelineBlockSchema = z.object({
  id: z.string(),
  type: z.literal("timeline"),
  title: z.string().optional(),
  items: z.array(TimelineItemSchema),
});

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
    description: z.string().optional(),
    image: z.string().optional(),
    displayMode: z.enum(["card", "compact", "embed"]).optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("embed"),
    url: z.string(),
    embedType: z.string().optional(),
    title: z.string().optional(),
    caption: z.string().optional(),
    aspectRatio: z.string().optional(),
    height: z.number().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("diagram"),
    diagramType: z.enum(["mermaid", "architecture", "flowchart", "sequence"]).optional(),
    code: z.string(),
    caption: z.string().optional(),
    title: z.string().optional(),
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
  z.object({
    id: z.string(),
    type: z.literal("subpage"),
    pageId: z.string(),
    title: z.string().optional(),
    icon: z.string().optional(),
    coverUrl: z.string().optional(),
    wordCount: z.number().optional(),
  }),
  TableBlockSchema,
  MathBlockSchema,
  StatBlockSchema,
  TimelineBlockSchema,
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
        if (b.description) textAccum += " " + b.description;
        break;
      case "embed":
        if (b.title) textAccum += " " + b.title;
        if (b.caption) textAccum += " " + b.caption;
        break;
      case "diagram":
        if (b.title) textAccum += " " + b.title;
        if (b.caption) textAccum += " " + b.caption;
        textAccum += " " + b.code;
        break;
      case "table":
        if (b.title) textAccum += " " + b.title;
        textAccum += " " + b.columns.map((c) => c.title).join(" ");
        for (const row of b.rows) {
          textAccum += " " + row.join(" ");
        }
        break;
      case "math":
        if (b.title) textAccum += " " + b.title;
        if (b.caption) textAccum += " " + b.caption;
        textAccum += " " + b.latex;
        break;
      case "stat":
        textAccum += " " + b.label + " " + b.value + (b.change ? ` ${b.change}` : "") + (b.note ? ` ${b.note}` : "");
        break;
      case "timeline":
        if (b.title) textAccum += " " + b.title;
        for (const item of b.items) {
          textAccum += ` ${item.title} ${item.dateOrPhase || ""} ${item.description || ""}`;
        }
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
    } else if (b.type === "table") {
      const colStr = b.columns.map((c) => c.title).join(", ");
      const rowStr = b.rows.map((r) => r.join(" | ")).join("\n");
      t = `${b.title ? `${b.title}: ` : ""}${colStr}\n${rowStr}`.trim();
    } else if (b.type === "stat") {
      t = `${b.label}: ${b.value}${b.change ? ` (${b.change})` : ""}${b.note ? ` - ${b.note}` : ""}`.trim();
    } else if (b.type === "timeline") {
      t = b.items.map((i) => `${i.title} (${i.status}): ${i.description || ""}`).join("; ").trim();
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
      case "embed":
        lines.push(`[Embed: ${b.title || b.url}](${b.url})\n`);
        break;
      case "diagram":
        lines.push(`\`\`\`mermaid\n${b.code}\n\`\`\`\n${b.caption ? `*${b.caption}*\n` : ""}`);
        break;
      case "example":
        lines.push(`**Before:**\n> ${b.v1Text}\n\n**After:**\n> ${b.v2Text}\n`);
        break;
      case "subpage":
        lines.push(`${b.icon || "📄"} [${b.title || "Subpage"}](#${b.pageId})\n`);
        break;
      case "table": {
        if (b.title) lines.push(`### ${b.title}\n`);
        if (b.columns && b.columns.length > 0) {
          lines.push(`| ${b.columns.map((c) => c.title || " ").join(" | ")} |`);
          lines.push(
            `| ${b.columns
              .map((c) => {
                if (c.align === "center") return ":---:";
                if (c.align === "right") return "---:";
                return ":---";
              })
              .join(" | ")} |`
          );
          for (const row of b.rows) {
            const cells = b.columns.map((_, colIdx) => row[colIdx] ?? "");
            lines.push(`| ${cells.join(" | ")} |`);
          }
        }
        lines.push("");
        break;
      }
      case "math": {
        if (b.title) lines.push(`**${b.title}**\n`);
        lines.push(`$$\n${b.latex}\n$$`);
        if (b.caption) lines.push(`*${b.caption}*\n`);
        lines.push("");
        break;
      }
      case "stat": {
        const trendSymbol = b.trend === "up" ? "▲" : b.trend === "down" ? "▼" : "•";
        lines.push(`> **${b.label}**: **${b.value}** ${b.change ? `(${trendSymbol} ${b.change})` : ""}`);
        if (b.target) lines.push(`> Target: ${b.target}`);
        if (b.note) lines.push(`> *${b.note}*`);
        lines.push("");
        break;
      }
      case "timeline": {
        if (b.title) lines.push(`### ${b.title}\n`);
        for (const item of b.items) {
          const statusMark = item.status === "completed" ? "[x]" : item.status === "current" ? "[*]" : "[ ]";
          const dateStr = item.dateOrPhase ? ` (${item.dateOrPhase})` : "";
          lines.push(`- ${statusMark} **${item.title}**${dateStr}${item.description ? `: ${item.description}` : ""}`);
        }
        lines.push("");
        break;
      }
    }
  }

  return lines.join("\n");
}

/**
 * Parses raw markdown or pasted note content into typed Hoard Notebook blocks.
 * Accurately parses headings (#, ##, ###), code fences (```), math ($$), tables (|...|),
 * quotes (>), callouts (!gotcha, !q, etc.), checklists (- [ ]), bullets, numbered lists,
 * URLs/embeds, and regular text paragraphs.
 */
export function parseMarkdownToBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip blank lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Code Fence: ```
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim().toUpperCase() || "PYTHON";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: "code",
        lang,
        code: codeLines.join("\n"),
        note: "SNIPPET",
      });
      continue;
    }

    // 2. Math Block: $$
    if (trimmed.startsWith("$$")) {
      if (trimmed.length > 2 && trimmed.endsWith("$$")) {
        blocks.push({
          id: generateBlockId(),
          type: "math",
          latex: trimmed.slice(2, -2).trim(),
        });
        i++;
        continue;
      }
      const mathLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("$$")) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith("$$")) {
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: "math",
        latex: mathLines.join("\n").trim(),
      });
      continue;
    }

    // 3. Markdown Table: Starts and ends with |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());

        const sepCells = tableLines[1]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());

        const alignments: Array<"left" | "center" | "right"> = sepCells.map((s) => {
          if (s.startsWith(":") && s.endsWith(":")) return "center";
          if (s.endsWith(":")) return "right";
          return "left";
        });

        const columns = headerCells.map((title, colIdx) => ({
          id: `col_${colIdx + 1}`,
          title: title || `Column ${colIdx + 1}`,
          align: alignments[colIdx] || ("left" as const),
        }));

        const rows: string[][] = [];
        for (let r = 2; r < tableLines.length; r++) {
          const cells = tableLines[r]
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());
          while (cells.length < columns.length) cells.push("");
          rows.push(cells.slice(0, columns.length));
        }

        blocks.push({
          id: generateBlockId(),
          type: "table",
          columns,
          rows: rows.length > 0 ? rows : [new Array(columns.length).fill("")],
          hasHeaderRow: true,
          striped: false,
        });
        continue;
      }
      // If not a full table, step back and process normally
      i -= tableLines.length;
    }

    // 4. Headings: #, ##, ###, ####, #####, ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length === 1 ? 2 : 3;
      blocks.push({
        id: generateBlockId(),
        type: "heading",
        level: level as 2 | 3,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 5. Divider: ---, ***, ___
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({
        id: generateBlockId(),
        type: "divider",
      });
      i++;
      continue;
    }

    // 6. Blockquote: > text
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: "quote",
        text: quoteLines.join("\n"),
      });
      continue;
    }

    // 7. Callouts: !gotcha, !q, !fact, !connects
    const calloutMatch = trimmed.match(/^!(gotcha|q|fact|connects)\s+(.*)$/i);
    if (calloutMatch) {
      const kindMap: Record<string, "gotcha" | "question" | "fact" | "connects"> = {
        gotcha: "gotcha",
        q: "question",
        fact: "fact",
        connects: "connects",
      };
      blocks.push({
        id: generateBlockId(),
        type: "callout",
        kind: kindMap[calloutMatch[1].toLowerCase()] || "gotcha",
        text: calloutMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 8. Todo list item: - [ ] or - [x] or [ ] or [x]
    const todoMatch = trimmed.match(/^[-*•]?\s*\[([ xX])\]\s+(.*)$/);
    if (todoMatch) {
      const todoItems: Array<{ text: string; done: boolean }> = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-*•]?\s*\[([ xX])\]\s+(.*)$/);
        if (!m) break;
        todoItems.push({
          text: m[2].trim(),
          done: m[1].toLowerCase() === "x",
        });
        i++;
      }
      blocks.push({
        id: generateBlockId(),
        type: "todo",
        items: todoItems,
      });
      continue;
    }

    // 9. Bullet list item: - , * , •
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        id: generateBlockId(),
        type: "bullet",
        text: bulletMatch[1].trim(),
      });
      i++;
      continue;
    }

    // 10. Numbered list item: 1. or 1)
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (numMatch) {
      blocks.push({
        id: generateBlockId(),
        type: "numbered",
        number: parseInt(numMatch[1], 10) || 1,
        text: numMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 11. Standalone URL on its own line: https://... or http://...
    if (/^https?:\/\/[^\s]+$/i.test(trimmed)) {
      const url = trimmed;
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toUpperCase();
        const embedType = detectEmbedType(url);

        if (embedType !== "generic") {
          const embedInfo = getEmbedInfo(url);
          blocks.push({
            id: generateBlockId(),
            type: "embed",
            url,
            embedType,
            title: embedInfo.title,
          });
        } else {
          blocks.push({
            id: generateBlockId(),
            type: "link",
            url,
            title: url.slice(0, 60),
            site: `${hostname} · RESOURCE`,
            displayMode: "card",
          });
        }
        i++;
        continue;
      } catch {}
    }

    // 12. Markdown Image: ![caption](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push({
        id: generateBlockId(),
        type: "image",
        url: imgMatch[2].trim(),
        caption: imgMatch[1].trim() || "PASTED IMAGE",
      });
      i++;
      continue;
    }

    // 13. Regular Paragraph:
    blocks.push({
      id: generateBlockId(),
      type: "paragraph",
      text: rawLine,
    });
    i++;
  }

  return blocks;
}

