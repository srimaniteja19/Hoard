const MAX_SINGLE_FRAGMENT = 300;
const START_CHARS = 120;
const END_CHARS = 80;
const MAX_QUOTE_NOTE = 2000;

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripHash(pageUrl: string): string {
  const hash = pageUrl.indexOf("#");
  return hash === -1 ? pageUrl : pageUrl.slice(0, hash);
}

export function buildTextFragmentUrl(pageUrl: string, selection: string): string {
  const collapsed = collapseWhitespace(selection);
  const base = stripHash(pageUrl);
  if (!collapsed) return base;

  if (collapsed.length <= MAX_SINGLE_FRAGMENT) {
    return `${base}#:~:text=${encodeURIComponent(collapsed)}`;
  }

  const start = collapsed.slice(0, START_CHARS);
  const end = collapsed.slice(-END_CHARS);
  return `${base}#:~:text=${encodeURIComponent(start)},${encodeURIComponent(end)}`;
}

export function applyQuoteCapture(input: {
  url: string;
  quote?: unknown;
  note?: string;
}): { url: string; note: string; isQuote: boolean } {
  const quote =
    typeof input.quote === "string" ? collapseWhitespace(input.quote).slice(0, MAX_QUOTE_NOTE) : "";
  if (!quote) {
    return { url: input.url, note: input.note ?? "", isQuote: false };
  }
  return {
    url: buildTextFragmentUrl(input.url, quote),
    note: quote,
    isQuote: true,
  };
}
