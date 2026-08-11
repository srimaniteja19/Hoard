import { KindType } from "@/types";
import { fetchMetaForUrl } from "@/lib/fetchMeta";
import { enrichCoverData, CoverData } from "@/lib/cover-data";
import { cleanTitle, isGenericTitle, sanitizeTitleText } from "@/lib/cleanTitle";

export interface EnrichedBookmarkValues {
  title: string;
  note: string;
  coverImage: string | null;
  coverData: CoverData | null;
}

/**
 * Server-side auto-enricher for saved bookmarks.
 * Ensures `coverImage`, `title`, `note` (description), and `coverData` are completely
 * populated even if the client/extension/import didn't pass full metadata.
 */
export async function enrichBookmarkValues(
  url: string,
  kind: KindType,
  inputTitle?: string | null,
  inputNote?: string | null,
  inputCoverImage?: string | null
): Promise<EnrichedBookmarkValues> {
  const isDefaultNote =
    !inputNote ||
    inputNote === "Saved via HOARD Extension" ||
    inputNote.startsWith("Full text is archived at save time") ||
    inputNote.startsWith("Tools and apps skip the reading queue") ||
    inputNote.startsWith("Chapters are stored too") ||
    inputNote.startsWith("Playlists never enter");

  const isGenericOrUnclean = !inputTitle || isGenericTitle(inputTitle) || inputTitle.includes(" | ") || inputTitle.includes(" · ");
  const needsImage = !inputCoverImage;

  let title = inputTitle ? sanitizeTitleText(inputTitle) : "";
  let note = isDefaultNote ? "" : (inputNote || "");
  let coverImage = inputCoverImage || null;

  try {
    // Fetch server-side metadata if image, clean title, or description is missing
    if (needsImage || isGenericOrUnclean || isDefaultNote) {
      const meta = await fetchMetaForUrl(url);

      if (needsImage && meta.image) {
        coverImage = meta.image;
      }

      if (isGenericOrUnclean && meta.title) {
        title = cleanTitle(meta.title, url);
      }

      if (isDefaultNote && meta.description) {
        note = meta.description;
      }

      const coverData = meta.html
        ? await enrichCoverData(url, kind, meta.html)
        : await enrichCoverData(url, kind);

      return {
        title: title || cleanTitle(inputTitle, url),
        note,
        coverImage,
        coverData,
      };
    }
  } catch {
    // Fallback on network failure
  }

  const coverData = await enrichCoverData(url, kind);
  return {
    title: title || cleanTitle(inputTitle, url),
    note,
    coverImage,
    coverData,
  };
}
