"use client";

import React, { useMemo } from "react";
import { BookRow, BookStatus } from "@/db/schema";
import { BookCoverFrame } from "./BookCoverFrame";
import { CoverViewMode, PosterSeries } from "@/lib/marginalia/types";
import { playSound } from "@/lib/sound";

export type ShelfStatusFilter = "ALL" | "READING" | "QUEUE" | "FINISHED";

interface ShelfGridProps {
  books: BookRow[];
  coverMode: CoverViewMode;
  posterSeries?: PosterSeries;
  statusFilter?: ShelfStatusFilter;
  alchemizingBookId?: string | null;
  onAlchemize?: (book: BookRow) => void;
  onSelectBook: (book: BookRow) => void;
  onAddVolume: (defaultStatus?: BookStatus) => void;
  onSearchAgain?: (book: BookRow) => void;
  onPasteUrl?: (book: BookRow) => void;
  onUpload?: (book: BookRow) => void;
}

interface ShelfTierConfig {
  id: "reading" | "queue" | "finished";
  statusKey: ShelfStatusFilter;
  title: string;
  badge: string;
  badgeBg: string;
  dotColor: string;
  glowColor: string;
  accentColor: string;
  defaultStatus: BookStatus;
  books: BookRow[];
}

export const ShelfGrid: React.FC<ShelfGridProps> = ({
  books,
  coverMode,
  posterSeries = "daylight",
  statusFilter = "ALL",
  alchemizingBookId = null,
  onAlchemize,
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
      const pseudoRand = ((idx * 37) % 16 - 8) / 10;
      map[b.id] = Number(pseudoRand.toFixed(2));
    });
    return map;
  }, [books]);

  // Categorize books into dedicated physical shelf tiers
  const readingBooks = useMemo(() => books.filter((b) => b.status === "READING"), [books]);
  const queueBooks = useMemo(
    () => books.filter((b) => b.status === "UNSTARTED" || b.status === "WANT_TO_READ" || b.status === "PAUSED"),
    [books]
  );
  const finishedBooks = useMemo(() => books.filter((b) => b.status === "FINISHED"), [books]);

  const allTiers: ShelfTierConfig[] = useMemo(
    () => [
      {
        id: "reading",
        statusKey: "READING",
        title: "Currently Reading",
        badge: "ACTIVE",
        badgeBg: "var(--yellow)",
        dotColor: "#FFE600",
        glowColor: "rgba(255, 230, 0, 0.35)",
        accentColor: "#FFE600",
        defaultStatus: "READING",
        books: readingBooks,
      },
      {
        id: "queue",
        statusKey: "QUEUE",
        title: "Queue & To-Read",
        badge: "QUEUED",
        badgeBg: "var(--cyan)",
        dotColor: "#38BDF8",
        glowColor: "rgba(56, 189, 248, 0.35)",
        accentColor: "#38BDF8",
        defaultStatus: "UNSTARTED",
        books: queueBooks,
      },
      {
        id: "finished",
        statusKey: "FINISHED",
        title: "Finished & Archived",
        badge: "COMPLETED",
        badgeBg: "var(--lime)",
        dotColor: "#A3E635",
        glowColor: "rgba(163, 230, 53, 0.35)",
        accentColor: "#A3E635",
        defaultStatus: "FINISHED",
        books: finishedBooks,
      },
    ],
    [readingBooks, queueBooks, finishedBooks]
  );

  const visibleTiers = useMemo(() => {
    if (statusFilter === "ALL") {
      return allTiers;
    }
    return allTiers.filter((t) => t.statusKey === statusFilter);
  }, [allTiers, statusFilter]);

  const renderBookItem = (book: BookRow) => {
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
          isAlchemizing={alchemizingBookId === book.id}
          onAlchemize={onAlchemize}
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
  };

  return (
    <div className="shelf-bookcase" id="grid">
      {visibleTiers.map((tier) => (
        <section key={tier.id} className="shelf-tier" data-shelf={tier.id}>
          {/* ── SHELF TIER HEADER ── */}
          <div className="shelf-tier-header">
            <div className="shelf-tier-title-group">
              <span
                className="shelf-tier-dot"
                style={{ background: tier.dotColor, boxShadow: `0 0 8px ${tier.glowColor}` }}
                aria-hidden="true"
              />
              <h2 className="shelf-tier-title">{tier.title}</h2>
              <span
                className="shelf-tier-badge"
                style={{ background: tier.badgeBg }}
              >
                {tier.badge}
              </span>
              <span className="shelf-tier-count">
                {tier.books.length} {tier.books.length === 1 ? "VOLUME" : "VOLUMES"}
              </span>
            </div>

            <button
              type="button"
              className="shelf-tier-quick-add"
              onClick={() => {
                playSound.click();
                onAddVolume(tier.defaultStatus);
              }}
              title={`Add book directly to ${tier.title}`}
            >
              ＋ ADD TO {tier.badge}
            </button>
          </div>

          {/* ── SHELF GRID OF VOLUMES ── */}
          {tier.books.length === 0 ? (
            <div className="shelf-tier-empty">
              <span className="shelf-tier-empty-text">No volumes currently on this shelf.</span>
            </div>
          ) : (
            <div className="shelf-grid">
              {tier.books.map((book) => renderBookItem(book))}
            </div>
          )}

          {/* ── MINIMALIST 3D FLOATING SHELF PLANK ── */}
          <div className="shelf-deck" aria-hidden="true">
            <div
              className="shelf-deck__edge"
              style={{
                background: tier.accentColor,
                boxShadow: `0 0 10px ${tier.glowColor}`,
              }}
            />
            <div className="shelf-deck__plank" />
          </div>
        </section>
      ))}
    </div>
  );
};
