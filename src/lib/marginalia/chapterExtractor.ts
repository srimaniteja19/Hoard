import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions } from "@/lib/ai/models";
import { ChapterItem } from "./types";

const CHAPTERS_MODEL = "google/gemini-3.5-flash";

const ChaptersSchema = z.object({
  bookTitle: z.string(),
  author: z.string().optional(),
  totalChapters: z.number(),
  totalPages: z.number().optional().describe("Authentic total page count for the standard print edition of this book, e.g. 400"),
  chapters: z.array(
    z.object({
      number: z.number().describe("Chapter sequence number (1, 2, 3...)"),
      title: z.string().describe("The clean chapter title without 'Chapter 1:' prefixes (e.g. 'Genesis', 'Promise', 'Rejection', 'Breakthrough')"),
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
    const query = encodeURIComponent(`"${title}" ${author || ""} "contents" OR "chapter"`).slice(0, 150);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=3`,
      { headers: { "User-Agent": "Hoard-Shelf/1.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const snippets: string[] = [];
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.volumeInfo?.description) {
          snippets.push(item.volumeInfo.description);
        }
        if (item.searchInfo?.textSnippet) {
          snippets.push(item.searchInfo.textSnippet);
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
    ? `\n\n--- BIBLIOGRAPHICAL SNIPPETS FROM PUBLISHER & SEARCH ---\n${snippets.join("\n\n")}`
    : "";

  const system = `You are an expert bibliographical reference librarian and Table of Contents curator.
Your task is to return the **EXACT, AUTHENTIC, PUBLISHED Table of Contents (TOC)** and chapter titles for the real-world published book "${title}" by ${author || "the author"}.

### CRITICAL RULES:
1. **NO HALLUCINATIONS**: Retrieve the actual published chapter titles verbatim from the book's Table of Contents.
   - For example, in *Genius Makers* by Cade Metz, the chapters are: "Genesis", "Promise", "Rejection", "Breakthrough", "Testament", "Ambition", "Rivalry", "Hype", "Anti-hype", "Explosion", "Expansion", "Dreamland", "Deceit", "Hubris", "Bigotry", "Weaponization", "Impotence", "Debate", "Automation", "Religion", "X Factor".
   - For *Thinking, Fast and Slow* by Daniel Kahneman, the chapters are: "Two Systems", "Attention and Effort", "The Lazy Controller", "The Associative Machine", "Cognitive Ease", "Norms, Surprises, and Causes", etc.
2. **CLEAN TITLES**: Do NOT prepend "Chapter 1:", "Chapter 2:", etc. inside the title field. Return the clean, beautiful chapter name.
3. **PAGES & SEQUENCE**: Include starting page numbers for standard print editions and sequence numbers starting from 1.`;

  const prompt = `Book: "${title}" by ${author || "the author"}${snippetContext}\n\nProvide the authentic Table of Contents and total pages for this book now.`;

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
