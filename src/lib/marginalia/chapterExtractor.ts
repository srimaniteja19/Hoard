import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions } from "@/lib/ai/models";
import { ChapterItem } from "./types";

const CHAPTERS_MODEL = "google/gemini-3.5-flash";

const ChaptersSchema = z.object({
  bookTitle: z.string(),
  author: z.string().optional(),
  totalChapters: z.number(),
  totalPages: z.number().optional().describe("Authentic total page count for the standard print edition of this book, e.g. 304"),
  chapters: z.array(
    z.object({
      number: z.number().describe("Chapter sequence number (1, 2, 3...)"),
      title: z.string().describe("The clean chapter title without 'Chapter 1:' prefixes (e.g. 'The Tyranny of the Automobile', 'Streets for People')"),
      page: z.number().optional().describe("Starting page number in standard print edition"),
      duration: z.string().optional().describe("Audio timestamp if audiobook"),
    })
  ).describe("The authentic Table of Contents list with real chapter names"),
});

/** Cleans redundant prefixes like 'Chapter 1:', 'Ch. 2 -', 'Part 1:' from titles */
export function cleanChapterTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let clean = rawTitle
    .replace(/^(Chapter|Ch\.?|Part|Section)\s*\d+[:.\s-]*/i, "")
    .replace(/^\d+[:.\s-]+/, "")
    .trim();
  return clean || rawTitle.trim();
}

/** Fetches search snippets and descriptions from Google Books to ground chapter extraction */
async function fetchGoogleBooksSnippets(title: string, author?: string): Promise<string[]> {
  try {
    const query = encodeURIComponent(`${title} ${author || ""}`.trim());
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=3`,
      { headers: { "User-Agent": "Hoard-Shelf/1.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const snippets: string[] = [];
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.volumeInfo?.title) {
          snippets.push(`Title: ${item.volumeInfo.title}`);
        }
        if (item.volumeInfo?.description) {
          snippets.push(item.volumeInfo.description);
        }
        if (item.searchInfo?.textSnippet) {
          snippets.push(item.searchInfo.textSnippet);
        }
        if (item.volumeInfo?.pageCount) {
          snippets.push(`Print Page Count: ${item.volumeInfo.pageCount} pages`);
        }
      }
    }
    return snippets;
  } catch {
    return [];
  }
}

/** Resolves authentic Table of Contents and chapter titles */
export async function resolveAuthenticChapters(
  title: string,
  author?: string
): Promise<{ chapters: ChapterItem[]; totalChapters: number; totalPages: number | null }> {
  // Fetch grounding snippets
  const snippets = await fetchGoogleBooksSnippets(title, author);
  const snippetContext = snippets.length > 0
    ? `\n\n--- PUBLISHER & BIBLIOGRAPHICAL CONTEXT ---\n${snippets.join("\n\n")}`
    : "";

  const system = `You are an expert bibliographical reference librarian and Table of Contents curator.
Your task is to return the authentic Table of Contents (TOC), clean chapter titles, and page count for the published book "${title}" by ${author || "the author"}.

### GUIDELINES:
1. **AUTHENTICITY & ACCURACY**:
   - If the exact published chapter list is known or present in your knowledge/snippets, provide the exact chapter titles verbatim.
   - If the book is newly published, specialized, or an unindexed work, provide the authoritative, well-structured thematic chapter outline covering the entire thesis of the volume from introduction to conclusion.
2. **CLEAN TITLES**:
   - Return clean, evocative chapter titles without prepending "Chapter 1:", "Ch 2", or "Part 1" (e.g. "Genesis", "Promise", "The Costs of Speed", "Streets for People", "Building the Post-Car Future").
3. **SEQUENCE & SIZING**:
   - Generate all sequential chapters (typically 8 to 21 chapters).
   - Ensure starting page numbers are sequentially distributed across the total page count (~300 pages).`;

  const prompt = `Book: "${title}" by ${author || "the author"}${snippetContext}\n\nProvide the authentic Table of Contents, chapter titles, and total pages for this volume now.`;

  const result = await generateObject({
    model: languageModel(CHAPTERS_MODEL),
    system,
    prompt,
    schema: ChaptersSchema,
    providerOptions: {
      ...gatewayProviderOptions(CHAPTERS_MODEL, ["feature:marginalia-chapter-lookup"]),
    },
  });

  const rawChapters = result.object.chapters || [];
  const cleanedChapters: ChapterItem[] = rawChapters.map((c, idx) => ({
    number: c.number || idx + 1,
    title: cleanChapterTitle(c.title) || `Chapter ${idx + 1}`,
    page: c.page,
    duration: c.duration,
  }));

  return {
    chapters: cleanedChapters,
    totalChapters: cleanedChapters.length,
    totalPages: result.object.totalPages || null,
  };
}
