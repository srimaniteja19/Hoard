import { parseHTML } from "linkedom";
import { FavoriteReview } from "./types";

function cleanText(raw: string): string {
  return raw
    .replace(/\[\d+\]/g, "")
    .replace(/\[citation needed\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildLetterboxdUrl(
  title: string,
  slugFromWikidata?: string | null
): string {
  if (slugFromWikidata && /^[a-z0-9-]+$/i.test(slugFromWikidata.trim())) {
    return `https://letterboxd.com/film/${slugFromWikidata.trim().toLowerCase()}/reviews/by/activity/`;
  }
  return `https://letterboxd.com/search/films/${encodeURIComponent(title.trim())}/`;
}

function extractRating(context: string): string | undefined {
  const starFrac = context.match(/\b(\d(?:\.\d{1,2})?)\s*(?:out of|\/)\s*(5|4|10)\b/i);
  if (starFrac) {
    return `${starFrac[1]}/${starFrac[2]}`;
  }
  const letterGrade = context.match(/\bgrade of ["“]?([A-D][+-]?)["”]?\b/i);
  if (letterGrade) {
    return letterGrade[1];
  }
  return undefined;
}

function extractAuthorFromLead(lead: string): string | null {
  const trimmed = lead
    .replace(/^.*?(?:Meanwhile,|However,|Similarly,|Additionally,|On the other hand,)\s*/i, "")
    .trim();

  // Look for patterns like "X of The Times of India gave...", "The Guardian wrote...", "Idlebrain.com gave..."
  const verbMatch = trimmed.match(
    /^(.{2,70}?)\s+(?:gave|wrote|stated|called|praised|described|noted|rated|awarded|remarked|commented|opined|said|concluded|reviewed|summarized|called it|felt|found|observed)\b/i
  );
  if (verbMatch?.[1]) {
    let candidate = verbMatch[1]
      .replace(/^(?:Writing for|Reviewing for|In|For)\s+/i, "")
      .replace(/,\s*writing for\s+/i, " · ")
      .replace(/[,:;–—-]+$/, "")
      .trim();
    // Keep last two clauses max if there's a stray prefix
    if (candidate.length > 48) {
      const parts = candidate.split(/(?:,\s*|\sof\s)/i);
      candidate = parts[parts.length - 1]?.trim() || candidate.slice(0, 48);
    }
    if (candidate.length >= 2 && !/^(the film|it|this|he|she|they|critics|reviewers|audiences)$/i.test(candidate)) {
      return candidate;
    }
  }

  // Fallback: look for capitalized publication name near end of lead
  const pubMatch = trimmed.match(
    /((?:The\s+)?[A-Z][A-Za-z0-9.'-]+(?:\s+[A-Z][A-Za-z0-9.'-]+){0,3}(?:\.com)?)\s*(?:,|\s+in\s+its\s+review|\s+review)?\s*$/
  );
  if (pubMatch?.[1] && pubMatch[1].length >= 3) {
    return pubMatch[1].trim();
  }

  return null;
}

/**
 * Extracts up to `limit` real, attributed review quotes from a Wikipedia
 * "Reception" / "Critical response" section's rendered HTML.
 */
export function parseWikipediaReceptionReviews(
  html: string,
  limit = 4
): FavoriteReview[] {
  if (!html) return [];

  const { document } = parseHTML(`<div>${html}</div>`);
  // Remove footnote superscripts & citation brackets before reading text
  document.querySelectorAll("sup, style, script, .mw-editsection").forEach((el) => el.remove());

  const paragraphs = Array.from(document.querySelectorAll("p"))
    .map((p) => cleanText(p.textContent || ""))
    .filter((t) => t.length > 40);

  const reviews: FavoriteReview[] = [];
  const seenQuotes = new Set<string>();
  const seenAuthors = new Set<string>();

  for (const para of paragraphs) {
    if (reviews.length >= limit) break;

    // Split into rough sentences while keeping quoted text intact
    const quoteRegex = /["“]([^"”]{28,320})["”]/g;
    let match: RegExpExecArray | null;

    while ((match = quoteRegex.exec(para)) !== null) {
      if (reviews.length >= limit) break;

      const rawQuote = match[1].trim().replace(/\s+/g, " ");
      // Skip non-review fragments (e.g. Rotten Tomatoes boilerplate "critical consensus reads...")
      const beforeStart = Math.max(0, match.index - 180);
      const leadWindow = para.slice(beforeStart, match.index);
      const lastBoundary = Math.max(
        leadWindow.lastIndexOf(". "),
        leadWindow.lastIndexOf("; "),
        leadWindow.lastIndexOf('" '),
        leadWindow.lastIndexOf("” ")
      );
      const localLead = (
        lastBoundary >= 0 ? leadWindow.slice(lastBoundary + 2) : leadWindow
      ).trim();

      const afterWindow = para.slice(
        match.index + match[0].length,
        match.index + match[0].length + 90
      );

      // Skip aggregate consensus blurb if we can get individual critic reviews, unless author is Rotten Tomatoes
      const isConsensus = /consensus\s+reads/i.test(localLead);
      let author = isConsensus
        ? "Rotten Tomatoes Consensus"
        : extractAuthorFromLead(localLead);

      if (!author) {
        const italicNodes = para.slice(beforeStart, match.index);
        if (/Metacritic/i.test(italicNodes)) author = "Metacritic";
        else if (/Rotten Tomatoes/i.test(italicNodes)) author = "Rotten Tomatoes";
        else author = "Critic Review";
      }

      const normQuote = rawQuote.toLowerCase().slice(0, 40);
      const normAuthor = author.toLowerCase();
      if (seenQuotes.has(normQuote)) continue;
      if (author !== "Critic Review" && seenAuthors.has(normAuthor)) continue;

      const rating = extractRating(`${localLead} ${afterWindow}`);
      seenQuotes.add(normQuote);
      seenAuthors.add(normAuthor);

      reviews.push({
        author,
        rating,
        text: rawQuote,
        source: "critic",
      });
    }
  }

  return reviews.slice(0, limit);
}

export function formatWikidataGenre(rawGenres: string[]): string {
  const cleaned = rawGenres
    .map((g) =>
      g
        .replace(/\b(film|television series|TV series|drama television series|genre)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((g) => g.length >= 2)
    .map((g) => g.charAt(0).toUpperCase() + g.slice(1));

  return Array.from(new Set(cleaned)).slice(0, 3).join(", ");
}
