"use client";

import React, { useState, useMemo } from "react";
import { BookRow, BookMotif } from "@/db/schema";
import { HouseCover } from "./HouseCover";
import { PosterCover } from "./PosterCover";
import { DreamCover } from "./DreamCover";
import { CoverViewMode, PosterSeries } from "@/lib/marginalia/types";
import { seedPosterStyle } from "@/lib/marginalia/posterMotifs";

interface BookCoverFrameProps {
  book: BookRow;
  mode?: CoverViewMode;
  posterSeries?: PosterSeries;
  tiltDeg?: number;
  isAlchemizing?: boolean;
  onAlchemize?: (book: BookRow) => void;
  onSearchAgain?: (book: BookRow) => void;
  onPasteUrl?: (book: BookRow) => void;
  onUpload?: (book: BookRow) => void;
  className?: string;
}

export const BookCoverFrame: React.FC<BookCoverFrameProps> = ({
  book,
  mode = "jackets",
  posterSeries = "daylight",
  tiltDeg = 0,
  isAlchemizing = false,
  onAlchemize,
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
  const isDreamMode = mode === "dream";

  // In JACKETS mode, strictly show ONLY original publisher jackets (http/https or uploads, never SVG data URIs)
  const originalJacketUrl =
    book.coverUrl && !book.coverUrl.startsWith("data:image/svg+xml")
      ? book.coverUrl
      : book.customCoverUrl && !book.customCoverUrl.startsWith("data:image/svg+xml")
      ? book.customCoverUrl
      : null;

  const hasOriginalJacket = Boolean(originalJacketUrl && !imgError);
  const isMissingState = !isHouseMode && !isPosterMode && !isDreamMode && !hasOriginalJacket && !book.isbn;

  // In AI DREAM mode, retrieve the bespoke Gemini vector SVG
  const dreamCoverUrl =
    book.customCoverUrl && book.customCoverUrl.startsWith("data:image/svg+xml")
      ? book.customCoverUrl
      : book.coverUrl && book.coverUrl.startsWith("data:image/svg+xml")
      ? book.coverUrl
      : null;

  const posterTheme = useMemo(() => {
    if (!isPosterMode) return null;
    return seedPosterStyle(book.title, book.author, posterSeries);
  }, [isPosterMode, book.title, book.author, posterSeries]);

  const isNeon = isPosterMode && posterTheme?.series === "neon";

  return (
    <div
      className={`cv ${isNeon ? "cv--neon" : ""} ${className}`}
      style={
        {
          "--r": `${tiltDeg}deg`,
          ...(isNeon ? { "--p-accent": posterTheme?.tokens.a } : {}),
        } as React.CSSProperties
      }
    >
      {isDreamMode ? (
        <DreamCover
          title={book.title}
          author={book.author}
          coverUrl={dreamCoverUrl}
          coverSource={dreamCoverUrl ? "ALCHEMIST" : book.coverSource}
          isAlchemizing={isAlchemizing}
          onAlchemize={onAlchemize ? () => onAlchemize(book) : undefined}
        />
      ) : isPosterMode ? (
        <PosterCover title={book.title} author={book.author} series={posterSeries} />
      ) : isHouseMode ? (
        <HouseCover
          title={book.title}
          author={book.author}
          accentColor={book.accentColor}
          fgColor={book.fgColor}
          motif={(book.motif as BookMotif) || "arcs"}
        />
      ) : hasOriginalJacket ? (
        <>
          <img
            src={originalJacketUrl!}
            alt={`Original publisher cover for ${book.title}`}
            onError={() => setImgError(true)}
            loading="lazy"
          />
          {book.coverSource &&
            book.coverSource !== "HOUSE" &&
            book.coverSource !== "ALCHEMIST" && (
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
