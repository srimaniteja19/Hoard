"use client";

import React, { useMemo } from "react";
import { BookRow } from "@/db/schema";
import { BookCoverFrame } from "./BookCoverFrame";
import { CoverViewMode, PosterSeries } from "@/lib/marginalia/types";
import { playSound } from "@/lib/sound";

interface ShelfGridProps {
  books: BookRow[];
  coverMode: CoverViewMode;
  posterSeries?: PosterSeries;
  onSelectBook: (book: BookRow) => void;
  onAddVolume: () => void;
  onSearchAgain?: (book: BookRow) => void;
  onPasteUrl?: (book: BookRow) => void;
  onUpload?: (book: BookRow) => void;
}

export const ShelfGrid: React.FC<ShelfGridProps> = ({
  books,
  coverMode,
  posterSeries = "daylight",
  onSelectBook,
  onAddVolume,
  onSearchAgain,
  onPasteUrl,
  onUpload,
}) => {
  // Deterministic tilt per book based on ID
  const bookTilts = useMemo(() => {
    const map: Record<string, number> = {};
    books.forEach((b, idx) => {
      // Small natural tilt between -0.8deg and +0.8deg
      const pseudoRand = ((idx * 37) % 16 - 8) / 10;
      map[b.id] = Number(pseudoRand.toFixed(2));
    });
    return map;
  }, [books]);

  return (
    <div className="shelf-grid" id="grid">
      {books.map((book) => {
        let chText = "";
        if (book.status === "FINISHED") {
          chText = "FINISHED";
        } else if (book.status === "UNSTARTED") {
          chText = "NOT STARTED";
        } else if (book.totalChapters && book.totalChapters > 1) {
          chText = `CH ${book.currentChapter || 1} / ${book.totalChapters}`;
        } else if (book.totalPages && book.currentPage) {
          chText = `P. ${book.currentPage} / ${book.totalPages}`;
        } else {
          chText = book.status;
        }

        return (
          <div
            key={book.id}
            className="vol"
            onClick={() => {
              playSound.click();
              onSelectBook(book);
            }}
          >
            <BookCoverFrame
              book={book}
              mode={coverMode}
              posterSeries={posterSeries}
              tiltDeg={bookTilts[book.id] || 0}
              onSearchAgain={onSearchAgain}
              onPasteUrl={onPasteUrl}
              onUpload={onUpload}
            />

            <div className="vol__m">
              <b>{book.title}</b>
              <div className="au">{book.author}</div>
              <span>
                <em>{book.notesCount || "—"}</em> NOTES
                {book.promotedCount && book.promotedCount > 0 ? (
                  <>
                    <em>{book.promotedCount}</em> PROMOTED
                  </>
                ) : null}
                <span style={{ opacity: 0.7, marginLeft: "auto" }}>{chText}</span>
              </span>
            </div>
          </div>
        );
      })}

      {/* ── ADD A VOLUME CARD ── */}
      <div
        className="vol vol--new"
        onClick={() => {
          playSound.click();
          onAddVolume();
        }}
      >
        <div className="cv">
          <span>＋ ADD A VOLUME</span>
        </div>
      </div>
    </div>
  );
};
