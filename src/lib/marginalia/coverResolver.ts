import { seedHouseStyle } from "./houseMotifs";
import { ResolvedCoverResult, BookMetadataLookup, CoverSource } from "./types";
import { BookMotif } from "@/db/schema";

/** Clean ISBN by stripping hyphens and spaces */
export function cleanIsbn(isbn?: string | null): string | null {
  if (!isbn) return null;
  const cleaned = isbn.replace(/[-\s]/g, "").trim();
  return cleaned.length >= 10 ? cleaned : null;
}

interface LookupOptions {
  title: string;
  author?: string;
  isbn?: string | null;
  format?: string;
  customCoverUrl?: string | null;
  accentColor?: string;
  fgColor?: string;
  motif?: BookMotif;
}

import { ChapterItem } from "./types";

export interface ProviderResult {
  coverUrl: string | null;
  pageCount?: number | null;
  chapterCount?: number | null;
  chapters?: ChapterItem[] | null;
  audioDuration?: string | null;
  author?: string | null;
  isbn?: string | null;
  title?: string | null;
}

/** Check if an image URL returns 200 OK and is not a 1x1 dummy pixel */
async function testImageUrl(url: string, timeoutMs = 3500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Hoard-Shelf/1.0",
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return false;
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) < 100) {
      // Open Library returns a tiny 43-byte transparent pixel for 404s
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Open Library Cover & Metadata Finder */
export async function lookupOpenLibrary(
  isbn?: string | null,
  title?: string,
  author?: string
): Promise<ProviderResult> {
  const normIsbn = cleanIsbn(isbn);
  let coverUrl: string | null = null;
  let pageCount: number | null = null;
  let chapterCount: number | null = null;
  let chapters: ChapterItem[] | null = null;
  let foundIsbn: string | null = normIsbn;
  let foundAuthor: string | null = null;

  if (normIsbn) {
    const directUrl = `https://covers.openlibrary.org/b/isbn/${normIsbn}-L.jpg?default=false`;
    const ok = await testImageUrl(directUrl);
    if (ok) coverUrl = directUrl;

    try {
      const res = await fetch(`https://openlibrary.org/isbn/${normIsbn}.json`, {
        headers: { "User-Agent": "Hoard-Shelf/1.0" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.number_of_pages) pageCount = Number(data.number_of_pages);
        if (Array.isArray(data.table_of_contents)) {
          const parsed: ChapterItem[] = [];
          data.table_of_contents.forEach((item: any, idx: number) => {
            if (typeof item === "string") {
              const clean = item.replace(/^(Chapter\s*\d+[:.\s-]*|\d+[:.\s-]*)/i, "").trim() || item;
              parsed.push({ number: idx + 1, title: clean });
            } else if (item && typeof item === "object") {
              const t = item.title || item.label || `Chapter ${idx + 1}`;
              const p = item.pagenum ? parseInt(String(item.pagenum), 10) : undefined;
              parsed.push({
                number: idx + 1,
                title: t.replace(/^(Chapter\s*\d+[:.\s-]*|\d+[:.\s-]*)/i, "").trim() || t,
                page: isNaN(p as any) ? undefined : p,
              });
            }
          });
          if (parsed.length > 0) {
            chapters = parsed;
            chapterCount = parsed.length;
          }
        }
      }
    } catch {
      // fallback
    }
  }

  if (title && (!coverUrl || !pageCount)) {
    try {
      const q = new URLSearchParams({
        title,
        ...(author ? { author } : {}),
        limit: "5",
      });
      const res = await fetch(`https://openlibrary.org/search.json?${q.toString()}`, {
        headers: { "User-Agent": "Hoard-Shelf/1.0" },
      });
      if (res.ok) {
        const data = await res.json();
        const docs = Array.isArray(data.docs) ? data.docs : [];
        for (const doc of docs) {
          if (!coverUrl && doc.cover_i) {
            const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`;
            const ok = await testImageUrl(url);
            if (ok) coverUrl = url;
          }
          if (!pageCount) {
            if (doc.number_of_pages_median) pageCount = Number(doc.number_of_pages_median);
            else if (doc.number_of_pages) pageCount = Number(doc.number_of_pages);
          }
          if (!foundIsbn && Array.isArray(doc.isbn) && doc.isbn.length > 0) {
            foundIsbn = doc.isbn[0];
          }
          if (!foundAuthor && Array.isArray(doc.author_name) && doc.author_name.length > 0) {
            foundAuthor = doc.author_name[0];
          }
          if (coverUrl && pageCount) break;
        }
      }
    } catch {
      // fallback
    }
  }

  return {
    coverUrl,
    pageCount,
    chapterCount,
    chapters,
    isbn: foundIsbn,
    author: foundAuthor,
  };
}

/** Google Books Cover & Metadata Finder */
export async function lookupGoogleBooks(
  title: string,
  author?: string,
  isbn?: string | null
): Promise<ProviderResult> {
  try {
    const normIsbn = cleanIsbn(isbn);
    const queries = [
      normIsbn ? `isbn:${normIsbn}` : `intitle:${encodeURIComponent(title)}${author ? `+inauthor:${encodeURIComponent(author)}` : ""}`,
      `${encodeURIComponent(title)}${author ? `+${encodeURIComponent(author)}` : ""}`,
    ];

    for (const query of queries) {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`,
        { headers: { "User-Agent": "Hoard-Shelf/1.0" } }
      );

      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        if (items.length === 0) continue;

        let coverUrl: string | null = null;
        let pageCount: number | null = null;
        let foundIsbn = normIsbn;
        let foundAuthor: string | null = null;
        let foundTitle: string | null = null;

        for (const item of items) {
          const vol = item?.volumeInfo;
          if (!vol) continue;

          if (!coverUrl) {
            const links = vol.imageLinks;
            const rawThumbnail =
              links?.extraLarge || links?.large || links?.medium || links?.thumbnail || links?.smallThumbnail;
            if (rawThumbnail) {
              const cleaned = rawThumbnail.replace(/^http:\/\//, "https://");
              coverUrl = cleaned.includes("&zoom=") ? cleaned.replace(/&zoom=[0-9]/, "&zoom=1") : cleaned;
            }
          }

          if (!pageCount && (vol.pageCount || vol.printedPageCount)) {
            pageCount = Number(vol.pageCount || vol.printedPageCount);
          }

          if (!foundIsbn && Array.isArray(vol.industryIdentifiers)) {
            const isbn13 = vol.industryIdentifiers.find((i: any) => i.type === "ISBN_13");
            const isbn10 = vol.industryIdentifiers.find((i: any) => i.type === "ISBN_10");
            foundIsbn = (isbn13 || isbn10)?.identifier || null;
          }

          if (!foundAuthor && Array.isArray(vol.authors) && vol.authors.length > 0) {
            foundAuthor = vol.authors[0];
          }

          if (!foundTitle && vol.title) {
            foundTitle = vol.title;
          }

          if (coverUrl && pageCount) break;
        }

        return {
          coverUrl,
          pageCount,
          chapterCount: null,
          isbn: foundIsbn,
          author: foundAuthor,
          title: foundTitle,
        };
      }
    }
  } catch {
    // fallback
  }

  return { coverUrl: null };
}

/** iTunes Search API Cover & Audio Duration Finder */
export async function lookupItunes(title: string, author?: string): Promise<ProviderResult> {
  try {
    const term = `${title} ${author || ""}`.trim();
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=audiobook&limit=3`,
      { headers: { "User-Agent": "Hoard-Shelf/1.0" } }
    );

    if (res.ok) {
      const data = await res.json();
      const first = data.results?.[0];
      if (first) {
        let coverUrl: string | null = null;
        if (first.artworkUrl100) {
          coverUrl = first.artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg");
        }

        let audioDuration: string | null = null;
        if (first.trackTimeMillis && first.trackTimeMillis > 0) {
          const totalMinutes = Math.round(first.trackTimeMillis / 60000);
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          audioDuration = `${hours}:${mins < 10 ? "0" : ""}${mins}`;
        }

        const chapterCount = first.trackCount && first.trackCount > 1 ? Number(first.trackCount) : null;

        return {
          coverUrl,
          audioDuration,
          chapterCount,
          author: first.artistName || null,
          title: first.collectionName || null,
        };
      }
    }
  } catch {
    // fallback
  }

  return { coverUrl: null };
}

const EMPTY_PROVIDER_RESULT: ProviderResult = { coverUrl: null };

/** Main resolution pipeline returning cover + enriched page and chapter metadata */
export async function resolveBookCover(opts: LookupOptions): Promise<ResolvedCoverResult> {
  const { title, author, isbn, format, customCoverUrl } = opts;
  const house = seedHouseStyle(title, author);

  // 1. User Upload / Custom Cover URL (Always wins immediately)
  if (customCoverUrl && customCoverUrl.trim()) {
    return {
      coverUrl: customCoverUrl.trim(),
      coverSource: "UPLOAD",
      accentColor: opts.accentColor || house.accentColor,
      fgColor: opts.fgColor || house.fgColor,
      motif: opts.motif || house.motif,
      provenanceLabel: "YOUR UPLOAD",
    };
  }

  // Concurrently lookup all providers to get best cover and best metadata
  const [olRes, gbRes, itunesRes] = await Promise.all([
    lookupOpenLibrary(isbn, title, author).catch(() => EMPTY_PROVIDER_RESULT),
    lookupGoogleBooks(title, author, isbn).catch(() => EMPTY_PROVIDER_RESULT),
    lookupItunes(title, author).catch(() => EMPTY_PROVIDER_RESULT),
  ]);

  // Aggregate metadata
  const pageCount = gbRes.pageCount || olRes.pageCount || null;
  let chapterCount = olRes.chapterCount || itunesRes.chapterCount || null;

  // If no explicit chapter count from TOC or tracks, estimate intelligently from page count
  if (!chapterCount && pageCount && pageCount > 0) {
    // Typical non-fiction/fiction has ~25-30 pages per chapter
    chapterCount = Math.max(1, Math.min(50, Math.round(pageCount / 26)));
  }

  const chapters = olRes.chapters || itunesRes.chapters || null;
  if (chapters && chapters.length > 0) {
    chapterCount = chapters.length;
  }

  const audioDuration = itunesRes.audioDuration || null;
  const suggestedAuthor = author || gbRes.author || olRes.author || itunesRes.author || null;
  const suggestedIsbn = isbn || gbRes.isbn || olRes.isbn || null;

  const metadata: BookMetadataLookup = {
    pageCount,
    chapterCount,
    chapters,
    audioDuration,
    suggestedAuthor,
    suggestedIsbn,
  };

  // 2. Format-informed search prioritization
  const isAudio = format === "AUDIO";

  if (isAudio && itunesRes.coverUrl) {
    return {
      coverUrl: itunesRes.coverUrl,
      coverSource: "ITUNES",
      accentColor: opts.accentColor || house.accentColor,
      fgColor: opts.fgColor || house.fgColor,
      motif: opts.motif || house.motif,
      provenanceLabel: "iTUNES AUDIOBOOK",
      metadata,
    };
  }

  // 3. Open Library by ISBN or title
  if (olRes.coverUrl) {
    return {
      coverUrl: olRes.coverUrl,
      coverSource: "OPEN_LIBRARY",
      accentColor: opts.accentColor || house.accentColor,
      fgColor: opts.fgColor || house.fgColor,
      motif: opts.motif || house.motif,
      provenanceLabel: "OPEN LIBRARY",
      metadata,
    };
  }

  // 4. Google Books
  if (gbRes.coverUrl) {
    return {
      coverUrl: gbRes.coverUrl,
      coverSource: "GOOGLE_BOOKS",
      accentColor: opts.accentColor || house.accentColor,
      fgColor: opts.fgColor || house.fgColor,
      motif: opts.motif || house.motif,
      provenanceLabel: "GOOGLE BOOKS",
      metadata,
    };
  }

  // 5. Check iTunes as fallback for non-audio if available
  if (itunesRes.coverUrl) {
    return {
      coverUrl: itunesRes.coverUrl,
      coverSource: "ITUNES",
      accentColor: opts.accentColor || house.accentColor,
      fgColor: opts.fgColor || house.fgColor,
      motif: opts.motif || house.motif,
      provenanceLabel: "iTUNES AUDIOBOOK",
      metadata,
    };
  }

  // 6. House Edition Guaranteed Fallback
  return {
    coverUrl: null,
    coverSource: "HOUSE",
    accentColor: opts.accentColor || house.accentColor,
    fgColor: opts.fgColor || house.fgColor,
    motif: opts.motif || house.motif,
    provenanceLabel: "HOUSE EDITION",
    metadata,
  };
}
