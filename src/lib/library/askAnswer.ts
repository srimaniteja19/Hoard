export type AskMarkdownBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

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

const NEXT_BLOCK = /^(#{2,3}\s|[-*]\s|\d+\.\s|>\s?|\|)/;

function isTableSep(line: string): boolean {
  const cells = splitCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell) || cell === "");
}

function looksLikeTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes("|") && (trimmed.startsWith("|") || /\|.+\|/.test(trimmed));
}

function splitCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Models often smash a markdown table onto one line: `| A | B | |---|---| | 1 | 2 |` */
export function unsmashTable(text: string): string {
  return text.replace(/\|\s*\|/g, "|\n|").trim();
}

function parseTableChunk(raw: string): { headers: string[]; rows: string[][] } | null {
  const lines = unsmashTable(raw)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const body = lines.filter((line) => !isTableSep(line)).map(splitCells);
  if (body.length < 2) return null;
  const width = Math.max(...body.map((row) => row.length));
  if (width < 2) return null;
  const [headers, ...rows] = body.map((row) => {
    const next = row.slice(0, width);
    while (next.length < width) next.push("");
    return next;
  });
  if (!headers.some(Boolean) || rows.length === 0) return null;
  return { headers, rows };
}

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

    if (looksLikeTableRow(line)) {
      const chunk = [line];
      i += 1;
      while (i < lines.length && looksLikeTableRow(lines[i])) {
        chunk.push(lines[i]);
        i += 1;
      }
      const table = parseTableChunk(chunk.join("\n"));
      if (table) {
        blocks.push({ type: "table", ...table });
        continue;
      }
      blocks.push({ type: "paragraph", text: chunk.join(" ") });
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
    const smashed = parseTableChunk(para.join(" "));
    if (smashed) {
      blocks[blocks.length - 1] = { type: "table", ...smashed };
    }
  }

  return blocks;
}

export function isThinSnippet(title: string, snippet: string): boolean {
  const clipped = snippet.replace(/\s+/g, " ").trim();
  if (clipped.length < 80) return true;
  return clipped.toLowerCase() === title.replace(/\s+/g, " ").trim().toLowerCase();
}
