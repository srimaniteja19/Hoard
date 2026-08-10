import React from "react";
import { Bookmark } from "@/types";

interface RealContentCoverProps {
  bookmark: Bookmark;
}

const cleanExcerpt = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).trim()}…`;
};

const urlPath = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return url;
  }
};

/**
 * RealContentCover — "fetch log" view of what HOARD actually pulled from the
 * URL: the archived excerpt if we have one, or the raw scraped metadata
 * otherwise. Deliberately styled as a printed terminal/receipt slip so it
 * reads as unmistakably different from the abstract data-ink cover.
 */
export const RealContentCover: React.FC<RealContentCoverProps> = ({ bookmark }) => {
  const excerpt = bookmark.archivedText ? cleanExcerpt(bookmark.archivedText, 260) : null;
  const metaEntries = Object.entries(bookmark.ex || {})
    .filter(([k]) => k !== "Suggested")
    .slice(0, 2);
  const fetchedAt = bookmark.lastFetchedAt || bookmark.createdAt;

  return (
    <div className="fetch-log" role="img" aria-label={`Archived fetch log for ${bookmark.url}`}>
      <div className="fetch-log-req">
        <span className="fetch-log-verb">GET</span>
        <span className="fetch-log-path">{urlPath(bookmark.url)}</span>
      </div>
      <div className="fetch-log-status">
        <span className="fetch-log-dot" />
        200 OK · {bookmark.src}
        {fetchedAt && <> · {new Date(fetchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</>}
      </div>

      <div className="fetch-log-body">
        {excerpt ? (
          <p className="fetch-log-excerpt">&ldquo;{excerpt}&rdquo;</p>
        ) : metaEntries.length > 0 ? (
          <div className="fetch-log-receipt">
            {metaEntries.map(([k, v]) => (
              <div className="fetch-log-row" key={k}>
                <span>{k.toUpperCase()}</span>
                <span className="fetch-log-leader" />
                <span>{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="fetch-log-empty">NO SNAPSHOT CAPTURED YET</p>
        )}
      </div>

      <div className="fetch-log-barcode" aria-hidden="true" />
    </div>
  );
};
