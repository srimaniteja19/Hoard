"use client";

import React, { useState } from "react";
import { BookRow, BookMotif } from "@/db/schema";
import { HouseCover } from "./HouseCover";
import { PosterCover } from "./PosterCover";
import { CoverViewMode } from "@/lib/marginalia/types";

interface BookCoverFrameProps {
  book: BookRow;
  mode?: CoverViewMode;
  tiltDeg?: number;
  onSearchAgain?: (book: BookRow) => void;
  onPasteUrl?: (book: BookRow) => void;
  onUpload?: (book: BookRow) => void;
  className?: string;
}

export const BookCoverFrame: React.FC<BookCoverFrameProps> = ({
  book,
  mode = "jackets",
  tiltDeg = 0,
  onSearchAgain,
  onPasteUrl,
  onUpload,
  className = "",
}) => {
  const [imgError, setImgError] = useState(false);

  // Calculate reading progress percentage
  let progressPct = 0;
  if (book.status === "FINISHED") {
    progressPct = 100;
  } else if (book.totalChapters && book.totalChapters > 0) {
    progressPct = Math.min(100, Math.round(((book.currentChapter || 1) / book.totalChapters) * 100));
  } else if (book.totalPages && book.totalPages > 0 && book.currentPage) {
    progressPct = Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
  }

  const isHouseMode = mode === "house";
  const isPosterMode = mode === "poster";
  const hasRealCover = Boolean(book.coverUrl && !imgError);
  const isMissingState = !isHouseMode && !isPosterMode && !hasRealCover && !book.isbn;

  return (
    <div
      className={`cv ${className}`}
      style={
        {
          "--r": `${tiltDeg}deg`,
        } as React.CSSProperties
      }
    >
      {isPosterMode ? (
        <PosterCover title={book.title} author={book.author} />
      ) : isHouseMode ? (
        <HouseCover
          title={book.title}
          author={book.author}
          accentColor={book.accentColor}
          fgColor={book.fgColor}
          motif={(book.motif as BookMotif) || "arcs"}
        />
      ) : isMissingState ? (
        <div className="cv__miss">
          <b>NO JACKET FOUND</b>
          <div className="acts">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSearchAgain?.(book);
              }}
            >
              SEARCH AGAIN
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPasteUrl?.(book);
              }}
            >
              PASTE A URL
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpload?.(book);
              }}
            >
              UPLOAD
            </button>
          </div>
        </div>
      ) : hasRealCover ? (
        <>
          <img
            src={book.coverUrl!}
            alt={`Cover for ${book.title}`}
            onError={() => setImgError(true)}
            loading="lazy"
          />
          {book.coverSource && book.coverSource !== "HOUSE" && (
            <span className="cv__src">
              {book.coverSource === "OPEN_LIBRARY"
                ? "OPEN LIBRARY"
                : book.coverSource === "GOOGLE_BOOKS"
                ? "GOOGLE BOOKS"
                : book.coverSource === "ITUNES"
                ? "iTUNES"
                : "UPLOAD"}
            </span>
          )}
        </>
      ) : (
        <HouseCover
          title={book.title}
          author={book.author}
          accentColor={book.accentColor}
          fgColor={book.fgColor}
          motif={(book.motif as BookMotif) || "arcs"}
        />
      )}

      {/* Spine shadow overlay */}
      <div className="cv__spine" aria-hidden="true" />

      {/* Format badge */}
      <span className="cv__fmt">{book.format || "PRINT"}</span>

      {/* Reading progress bar */}
      <div className="cv__prog" aria-hidden="true">
        <i style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
};
