export type AskMarkdownBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string };

export function parseAskAnswer(text: string): { summary: string; body: string } {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  const heading = trimmed.match(/^##\s*Summary\s*\n+/i);
  if (!heading) return { summary: "", body: trimmed };

  const rest = trimmed.slice(heading[0].length);
  const nextHeading = rest.search(/\n##\s+/);
  if (nextHeading >= 0) {
    return {
      summary: rest.slice(0, nextHeading).trim(),
      body: rest.slice(nextHeading).trim(),
    };
  }

  const paraBreak = rest.search(/\n\s*\n/);
  if (paraBreak >= 0) {
    return {
      summary: rest.slice(0, paraBreak).trim(),
      body: rest.slice(paraBreak).trim(),
    };
  }

  return { summary: rest.trim(), body: "" };
}

const NEXT_BLOCK = /^(#{2,3}\s|[-*]\s|\d+\.\s|>\s?)/;

export function parseAskMarkdown(content: string): AskMarkdownBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: AskMarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length === 3 ? 3 : 2,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        parts.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: parts.join("\n") });
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      const items = [unordered[1]];
      i += 1;
      while (i < lines.length) {
        const next = lines[i].match(/^[-*]\s+(.+)$/);
        if (!next) break;
        items.push(next[1]);
        i += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      const items = [ordered[1]];
      i += 1;
      while (i < lines.length) {
        const next = lines[i].match(/^\d+\.\s+(.+)$/);
        if (!next) break;
        items.push(next[1]);
        i += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const para = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !NEXT_BLOCK.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

export function isThinSnippet(title: string, snippet: string): boolean {
  const clipped = snippet.replace(/\s+/g, " ").trim();
  if (clipped.length < 80) return true;
  return clipped.toLowerCase() === title.replace(/\s+/g, " ").trim().toLowerCase();
}
