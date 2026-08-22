import { parseAskAnswer, parseAskMarkdown, type AskMarkdownBlock } from "@/lib/library/askAnswer";
import { plainAskText, splitProse } from "@/lib/library/askDesk";

export type AskTicketSpine = "cyan" | "yel" | "pink";
export type AskTicketGlyphKind = "prose" | "chain" | "stats" | "deck" | "weight";

export type AskTicketGlyph = {
  kind: AskTicketGlyphKind;
  count?: number;
  label: string;
};

export type AskDeckCard = {
  n: string;
  title: string;
  body: string;
};

export type AskTicketView = {
  thesis: string;
  asked: string;
  spine: AskTicketSpine;
  glyphs: AskTicketGlyph[];
  peek: string[];
  cards: AskDeckCard[];
  stamp: string;
};

export function clipTicketLine(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

export function stampDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${date.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}`;
}

export function splitDeckItem(item: string): { title: string; body: string } {
  const bold = item.match(/^\*\*(.+?)\*\*[\s:.—–-]*(.*)$/s);
  if (bold) {
    return { title: plainAskText(bold[1]), body: plainAskText(bold[2]) };
  }
  const plain = plainAskText(item);
  const cut = plain.match(/^(.{2,48}?)[:—–]\s+(.+)$/);
  if (cut) return { title: cut[1], body: cut[2] };
  const sentences = splitProse(plain);
  if (sentences.length > 1) {
    return { title: clipTicketLine(sentences[0], 52), body: sentences.slice(1).join(" ") };
  }
  return { title: clipTicketLine(plain, 52), body: "" };
}

function deckFromBlocks(blocks: AskMarkdownBlock[]): AskDeckCard[] {
  const items = blocks.flatMap((block) => (block.type === "list" && block.ordered ? block.items : []));
  if (items.length < 3) return [];
  return items.map((item, index) => {
    const split = splitDeckItem(item);
    return {
      n: String(index + 1).padStart(2, "0"),
      title: split.title,
      body: split.body,
    };
  });
}

export function composeAskTicket(input: {
  title?: string;
  question: string;
  answer: string;
  summary?: string;
  citations?: Array<{ title: string }>;
  createdAt: string;
}): AskTicketView {
  const parsed = parseAskAnswer(input.answer);
  const summary = plainAskText(input.summary || parsed.summary);
  const body = parsed.body || (!parsed.summary ? input.answer : "");
  const blocks = parseAskMarkdown(body);
  const paras = blocks.filter((block) => block.type === "paragraph" || block.type === "quote");
  const chainItems = blocks.flatMap((block) => (block.type === "list" && block.ordered ? block.items : []));
  const tables = blocks.filter((block) => block.type === "table");
  const cards = deckFromBlocks(blocks);
  const cites = input.citations?.length ?? 0;

  let thesis = summary;
  if (!thesis && paras[0] && (paras[0].type === "paragraph" || paras[0].type === "quote")) {
    thesis = plainAskText(paras[0].text);
  }
  if (!thesis && cards[0]) thesis = cards[0].title;
  if (!thesis) thesis = plainAskText(input.title || input.question);

  const glyphs: AskTicketGlyph[] = [];
  if (paras.length > 0 || (cards.length === 0 && tables.length === 0)) {
    glyphs.push({ kind: "prose", label: "PROSE" });
  }
  if (chainItems.length >= 2 && cards.length === 0) {
    glyphs.push({ kind: "chain", count: chainItems.length, label: `${chainItems.length}-STEP CHAIN` });
  }
  if (cards.length >= 3) {
    glyphs.push({ kind: "deck", count: cards.length, label: `${cards.length}-CARD DECK` });
  }
  if (tables.length > 0) {
    const rows = tables.reduce((count, block) => count + (block.type === "table" ? block.rows.length : 0), 0);
    glyphs.push({ kind: "stats", count: rows, label: rows === 1 ? "1 STAT" : `${rows} STATS` });
  }
  if (glyphs.length >= 2) glyphs.push({ kind: "weight", label: "COUNTERWEIGHT" });

  const peek: string[] = [];
  for (const block of blocks) {
    if (block.type === "heading") peek.push(plainAskText(block.text));
    if (block.type === "list") {
      peek.push(...block.items.slice(0, 6).map((item) => clipTicketLine(plainAskText(item), 56)));
    }
    if (block.type === "table") peek.push(block.headers.filter(Boolean).join(" · "));
  }

  return {
    thesis: clipTicketLine(thesis, 220),
    asked: clipTicketLine(input.question, 78),
    spine: cards.length >= 3 ? "yel" : cites >= 3 ? "pink" : "cyan",
    glyphs,
    peek: peek.slice(0, 8),
    cards,
    stamp: stampDate(input.createdAt),
  };
}

export function ticketSearchHay(item: { title?: string; question: string; answer: string; summary?: string }, ticket: AskTicketView): string {
  return `${item.title ?? ""} ${item.question} ${item.summary ?? ""} ${ticket.thesis} ${ticket.cards.map((card) => `${card.title} ${card.body}`).join(" ")} ${item.answer}`.toLowerCase();
}
