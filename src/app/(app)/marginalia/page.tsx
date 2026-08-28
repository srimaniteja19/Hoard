"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";
import { BookRow, BookStatus } from "@/db/schema";
import { ShelfGrid, ShelfStatusFilter } from "@/components/marginalia/ShelfGrid";
import { AddBookModal } from "@/components/marginalia/AddBookModal";
import { BookDetailView } from "@/components/marginalia/BookDetailView";
import { CoverViewMode, PaperTheme, PosterSeries, BookStatsSummary } from "@/lib/marginalia/types";
import { playSound } from "@/lib/sound";

const SAMPLE_BOOKS = [
  {
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    isbn: "9781449373320",
    accentColor: "#1B8FA8",
    fgColor: "#FFFFFF",
    motif: "grid",
    format: "PHYSICAL",
    totalChapters: 12,
    currentChapter: 7,
    status: "READING",
    notesCount: 88,
    promotedCount: 22,
  },
  {
    title: "Genius Makers",
    author: "Cade Metz",
    isbn: "9781524742676",
    accentColor: "#7B5CF0",
    fgColor: "#FFFFFF",
    motif: "arcs",
    format: "AUDIO",
    totalChapters: 17,
    currentChapter: 11,
    status: "READING",
    notesCount: 41,
    promotedCount: 9,
  },
  {
    title: "The Dawn of Everything",
    author: "Graeber & Wengrow",
    isbn: "9780374157357",
    accentColor: "#C4562A",
    fgColor: "#FFF6EC",
    motif: "strata",
    format: "AUDIO",
    totalChapters: 14,
    currentChapter: 14,
    status: "FINISHED",
    notesCount: 54,
    promotedCount: 11,
  },
  {
    title: "The Elements of Typographic Style",
    author: "Robert Bringhurst",
    isbn: "9780881792126",
    accentColor: "#2E6B3E",
    fgColor: "#F4F1E6",
    motif: "rules",
    format: "PHYSICAL",
    totalChapters: 10,
    currentChapter: 10,
    status: "FINISHED",
    notesCount: 37,
    promotedCount: 8,
  },
  {
    title: "Shape Up",
    author: "Ryan Singer",
    isbn: null,
    accentColor: "#D8A200",
    fgColor: "#141005",
    motif: "blocks",
    format: "EBOOK",
    totalChapters: 14,
    currentChapter: 14,
    status: "FINISHED",
    notesCount: 22,
    promotedCount: 5,
  },
  {
    title: "Crafting Interpreters",
    author: "Robert Nystrom",
    isbn: "9780990582939",
    accentColor: "#4A4A46",
    fgColor: "#F2EFE8",
    motif: "grid",
    format: "PHYSICAL",
    totalChapters: 30,
    currentChapter: 1,
    status: "UNSTARTED",
    notesCount: 0,
    promotedCount: 0,
  },
  {
    title: "The Mom Test",
    author: "Rob Fitzpatrick",
    isbn: "9781492180746",
    accentColor: "#C2185B",
    fgColor: "#FFF0F5",
    motif: "diag",
    format: "EBOOK",
    totalChapters: 8,
    currentChapter: 8,
    status: "FINISHED",
    notesCount: 19,
    promotedCount: 4,
  },
  {
    title: "Kafka: The Definitive Guide",
    author: "Narkhede, Shapira & Palino",
    isbn: "9781491936160",
    accentColor: "#7A5230",
    fgColor: "#F6EEE2",
    motif: "strata",
    format: "PHYSICAL",
    totalChapters: 12,
    currentChapter: 1,
    status: "UNSTARTED",
    notesCount: 0,
    promotedCount: 0,
  },
];

function MarginaliaPageContent() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [stats, setStats] = useState<BookStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paperTheme, setPaperTheme] = useState<PaperTheme>("cream");
  const [coverMode, setCoverMode] = useState<CoverViewMode>("jackets");
  const [posterSeries, setPosterSeries] = useState<PosterSeries>("daylight");
  const [statusFilter, setStatusFilter] = useState<ShelfStatusFilter>("ALL");
  const [addModalStatus, setAddModalStatus] = useState<BookStatus>("READING");
  const [selectedBook, setSelectedBook] = useState<BookRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [alchemizingBookId, setAlchemizingBookId] = useState<string | null>(null);
  const [alchemizingAll, setAlchemizingAll] = useState(false);

  // Live shelf status counts
  const readingCount = useMemo(() => books.filter((b) => b.status === "READING").length, [books]);
  const queueCount = useMemo(
    () => books.filter((b) => b.status === "UNSTARTED" || b.status === "WANT_TO_READ" || b.status === "PAUSED").length,
    [books]
  );
  const finishedCount = useMemo(() => books.filter((b) => b.status === "FINISHED").length, [books]);

  // Restore saved theme and mode from localStorage
  useEffect(() => {
    try {
      const savedPaper = localStorage.getItem("hoard-marginalia-paper") as PaperTheme | null;
      if (savedPaper && ["cream", "sand", "ink"].includes(savedPaper)) {
        setPaperTheme(savedPaper);
      }
      const savedMode = localStorage.getItem("hoard-marginalia-cover-mode") as CoverViewMode | null;
      if (savedMode && ["jackets", "poster", "dream", "house"].includes(savedMode)) {
        setCoverMode(savedMode);
      }
      const savedSeries = localStorage.getItem("hoard-marginalia-poster-series") as PosterSeries | null;
      if (savedSeries && ["daylight", "neon", "mixed"].includes(savedSeries)) {
        setPosterSeries(savedSeries);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
        setStats(data.stats || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Apply paper theme to data-paper attribute & save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-paper", paperTheme);
    try {
      localStorage.setItem("hoard-marginalia-paper", paperTheme);
    } catch {
      // ignore
    }
    return () => {
      document.documentElement.removeAttribute("data-paper");
    };
  }, [paperTheme]);

  // Save cover mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hoard-marginalia-cover-mode", coverMode);
    } catch {
      // ignore
    }
  }, [coverMode]);

  // Save poster series to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hoard-marginalia-poster-series", posterSeries);
    } catch {
      // ignore
    }
  }, [posterSeries]);

  const handleGenerateAiCoverForBook = async (book: BookRow) => {
    try {
      setAlchemizingBookId(book.id);
      playSound.click();
      const res = await fetch("/api/books/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate cover");

      const data = await res.json();
      const generated = data.cover;
      const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(generated.svgMarkup)}`;

      const originalIsHttp = book.coverUrl && !book.coverUrl.startsWith("data:image/svg+xml");
      const patchRes = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customCoverUrl: svgDataUri,
          coverUrl: originalIsHttp ? book.coverUrl : svgDataUri,
          coverSource: originalIsHttp ? book.coverSource : "ALCHEMIST",
          accentColor: generated.accentColor || book.accentColor,
          fgColor: generated.fgColor || book.fgColor,
        }),
      });

      if (patchRes.ok) {
        const updated: BookRow = await patchRes.json();
        setBooks((prev) => prev.map((b) => (b.id === book.id ? updated : b)));
        playSound.fileIt();
      }
    } catch {
      // ignore
    } finally {
      setAlchemizingBookId(null);
    }
  };

  const handleGenerateAllAiCovers = async () => {
    const ungenerated = books.filter(
      (b) =>
        (!b.customCoverUrl || !b.customCoverUrl.startsWith("data:image/svg+xml")) &&
        (!b.coverUrl || !b.coverUrl.startsWith("data:image/svg+xml"))
    );
    if (ungenerated.length === 0) return;

    try {
      setAlchemizingAll(true);
      playSound.click();

      for (const book of ungenerated) {
        setAlchemizingBookId(book.id);
        const res = await fetch("/api/books/generate-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: book.title,
            author: book.author,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const generated = data.cover;
          const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(generated.svgMarkup)}`;

          const originalIsHttp = book.coverUrl && !book.coverUrl.startsWith("data:image/svg+xml");
          const patchRes = await fetch(`/api/books/${book.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customCoverUrl: svgDataUri,
              coverUrl: originalIsHttp ? book.coverUrl : svgDataUri,
              coverSource: originalIsHttp ? book.coverSource : "ALCHEMIST",
              accentColor: generated.accentColor || book.accentColor,
              fgColor: generated.fgColor || book.fgColor,
            }),
          });

          if (patchRes.ok) {
            const updated: BookRow = await patchRes.json();
            setBooks((prev) => prev.map((b) => (b.id === book.id ? updated : b)));
            playSound.fileIt();
          }
        }
      }
    } finally {
      setAlchemizingAll(false);
      setAlchemizingBookId(null);
    }
  };

  const handleSeedSamples = async () => {
    try {
      setSeeding(true);
      playSound.click();
      for (const sample of SAMPLE_BOOKS) {
        await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sample),
        });
      }
      await fetchBooks();
      playSound.fileIt();
    } catch {
      // ignore
    } finally {
      setSeeding(false);
    }
  };

  const totalVols = stats?.totalVolumes || books.length;
  const totalNotes = stats?.totalNotes || books.reduce((acc, b) => acc + (b.notesCount || 0), 0);
  const totalPromoted = stats?.totalPromoted || books.reduce((acc, b) => acc + (b.promotedCount || 0), 0);

  return (
    <AppPage width="wide">
      <div className="marginalia-wrap">
        {/* ── DETAIL VIEW OR MAIN SHELF ── */}
        {selectedBook ? (
          <BookDetailView
            book={selectedBook}
            onBack={() => {
              setSelectedBook(null);
              fetchBooks();
            }}
            onUpdateBook={(updated) => {
              setSelectedBook(updated);
              setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            }}
            onDeleteBook={(deletedId) => {
              setSelectedBook(null);
              setBooks((prev) => prev.filter((b) => b.id !== deletedId));
              fetchBooks();
            }}
          />
        ) : (
          <>
            {/* ── SUB-NAV RAIL ── */}
            <div className="m-rail">
              <span style={{ fontWeight: 900, color: "var(--ink)" }}>MARGINALIA</span>

              {/* Status Shelf Filter Tabs */}
              <span className="m-seg" id="shelf-filter" style={{ marginLeft: "6px" }}>
                <button
                  data-f="all"
                  aria-pressed={statusFilter === "ALL"}
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setStatusFilter("ALL");
                  }}
                  title="View all categorized status shelves"
                >
                  ALL SHELVES ({books.length})
                </button>
                <button
                  data-f="reading"
                  aria-pressed={statusFilter === "READING"}
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setStatusFilter("READING");
                  }}
                  title="View Currently Reading volumes"
                >
                  ⚡ READING ({readingCount})
                </button>
                <button
                  data-f="queue"
                  aria-pressed={statusFilter === "QUEUE"}
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setStatusFilter("QUEUE");
                  }}
                  title="View Queue and To-Read volumes"
                >
                  ⏳ TO READ ({queueCount})
                </button>
                <button
                  data-f="finished"
                  aria-pressed={statusFilter === "FINISHED"}
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setStatusFilter("FINISHED");
                  }}
                  title="View Completed volumes"
                >
                  🏆 FINISHED ({finishedCount})
                </button>
              </span>

              <span className="sp" />

              {/* Top ADD VOLUME Button */}
              <button
                type="button"
                className="m-top-add-btn"
                onClick={() => {
                  playSound.click();
                  setAddModalStatus("READING");
                  setIsAddModalOpen(true);
                }}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10.5px",
                  fontWeight: 900,
                  padding: "5px 12px",
                  border: "var(--b) solid var(--ink)",
                  background: "var(--yellow)",
                  color: "#0A0A0A",
                  boxShadow: "2px 2px 0 var(--ink)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  marginRight: "8px",
                  whiteSpace: "nowrap",
                }}
                title="Add a new volume to your library"
              >
                ＋ ADD VOLUME
              </button>

              {/* Paper Theme Switcher */}
              <span className="m-seg" id="papers">
                <button
                  data-p="cream"
                  aria-pressed={paperTheme === "cream"}
                  suppressHydrationWarning
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setPaperTheme("cream");
                  }}
                >
                  CREAM
                </button>
                <button
                  data-p="sand"
                  aria-pressed={paperTheme === "sand"}
                  suppressHydrationWarning
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setPaperTheme("sand");
                  }}
                >
                  SAND
                </button>
                <button
                  data-p="ink"
                  aria-pressed={paperTheme === "ink"}
                  suppressHydrationWarning
                  type="button"
                  onClick={() => {
                    playSound.click();
                    setPaperTheme("ink");
                  }}
                >
                  INK
                </button>
              </span>
            </div>

            {/* ── SHELF HEADER ── */}
            <div className="shead">
              <div>
                <h1>The Shelf</h1>
                <div className="sub">
                  {totalVols} VOLUMES · {totalNotes} NOTES · {totalPromoted} PROMOTED TO TIL
                </div>
              </div>

              {/* Cover Mode Toggle */}
              <div className="jack">
                <span className="lb">COVERS</span>
                <span className="m-seg" id="jack">
                  <button
                    data-j="real"
                    aria-pressed={coverMode === "jackets"}
                    suppressHydrationWarning
                    type="button"
                    onClick={() => {
                      playSound.click();
                      setCoverMode("jackets");
                    }}
                  >
                    JACKETS
                  </button>
                  <button
                    data-j="poster"
                    aria-pressed={coverMode === "poster"}
                    suppressHydrationWarning
                    type="button"
                    onClick={() => {
                      playSound.click();
                      setCoverMode("poster");
                    }}
                  >
                    POSTER
                  </button>
                  <button
                    data-j="dream"
                    aria-pressed={coverMode === "dream"}
                    suppressHydrationWarning
                    type="button"
                    onClick={() => {
                      playSound.click();
                      setCoverMode("dream");
                    }}
                  >
                    AI DREAM
                  </button>
                  <button
                    data-j="house"
                    aria-pressed={coverMode === "house"}
                    suppressHydrationWarning
                    type="button"
                    onClick={() => {
                      playSound.click();
                      setCoverMode("house");
                    }}
                  >
                    HOUSE
                  </button>
                </span>

                {/* AI Dream Batch Trigger */}
                {coverMode === "dream" && (
                  <button
                    type="button"
                    disabled={alchemizingAll}
                    onClick={handleGenerateAllAiCovers}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9.5px",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      height: "32px",
                      padding: "0 10px",
                      marginLeft: "6px",
                      background: "linear-gradient(135deg, #FFE600 0%, #00F0FF 100%)",
                      color: "#000000",
                      border: "1.5px solid var(--ink)",
                      boxShadow: "2px 2px 0 var(--ink)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      whiteSpace: "nowrap",
                    }}
                    title="Batch synthesize bespoke AI Dream vector jackets with Gemini for ungenerated volumes"
                  >
                    {alchemizingAll ? "✨ ALCHEMIZING..." : "✨ ALCHEMIZE ALL"}
                  </button>
                )}

                {/* Poster Series Sub-Toggle */}
                {coverMode === "poster" && (
                  <span className="m-seg" id="poster-series" style={{ marginLeft: "4px" }}>
                    <button
                      data-s="daylight"
                      aria-pressed={posterSeries === "daylight"}
                      suppressHydrationWarning
                      type="button"
                      onClick={() => {
                        playSound.click();
                        setPosterSeries("daylight");
                      }}
                      title="Daylight: Pale grounds, dark ink type, zero glow"
                    >
                      DAYLIGHT
                    </button>
                    <button
                      data-s="neon"
                      aria-pressed={posterSeries === "neon"}
                      suppressHydrationWarning
                      type="button"
                      onClick={() => {
                        playSound.click();
                        setPosterSeries("neon");
                      }}
                      title="Neon: Dark ground, glowing saturated ink & authentic sign flicker"
                    >
                      NEON
                    </button>
                    <button
                      data-s="mixed"
                      aria-pressed={posterSeries === "mixed"}
                      suppressHydrationWarning
                      type="button"
                      onClick={() => {
                        playSound.click();
                        setPosterSeries("mixed");
                      }}
                      title="Mixed: Dynamic blend of Daylight and Neon series"
                    >
                      MIXED
                    </button>
                  </span>
                )}
              </div>
            </div>

            <div className="m-note">
              {coverMode === "poster" ? (
                posterSeries === "neon" ? (
                  <>NEON SERIES · NEAR-BLACK GROUNDS WITH SATURATED GLOWING INK &amp; REAL SIGN FLICKER.</>
                ) : posterSeries === "daylight" ? (
                  <>DAYLIGHT SERIES · PALE GROUNDS, DARK INK TYPE, FLAT COLOUR &amp; PIN-SHARP THUMBNAIL READABILITY.</>
                ) : (
                  <>MIXED SERIES · DYNAMIC DETERMINISTIC DUAL-SERIES PALETTES PER TITLE.</>
                )
              ) : coverMode === "dream" ? (
                <>AI DREAM EDITION · BESPOKE GEMINI VECTOR JACKETS &amp; CONCEPTUAL ESSENCE SYNTHESIS.</>
              ) : (
                <>JACKETS PULLS REAL PUBLISHER ART · POSTER RENDERS MODERN ILLUSTRATED EDITORIAL JACKETS · AI DREAM SYNTHESIZES BESPOKE VECTOR ART · HOUSE REBINDS IN UNIFIED GEOMETRIC MINIMALISM.</>
              )}
            </div>

            {/* Empty State Banner with 1-click Seed Sample */}
            {!loading && books.length === 0 && (
              <div
                style={{
                  padding: "24px",
                  background: "var(--card)",
                  border: "var(--b) dashed var(--ink)",
                  marginBottom: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div>
                  <div style={{ fontFamily: "var(--display)", fontSize: "20px", fontWeight: 800 }}>
                    YOUR SHELF IS EMPTY
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      opacity: 0.65,
                      marginTop: "4px",
                    }}
                  >
                    Bind your first book volume or populate a starter shelf of classics.
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeedSamples}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      padding: "8px 14px",
                      border: "2px solid var(--ink)",
                      boxShadow: "2px 2px 0 var(--ink)",
                      background: "var(--yellow)",
                      cursor: "pointer",
                    }}
                  >
                    {seeding ? "POPULATING..." : "📚 LOAD SAMPLE SHELF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      padding: "8px 14px",
                      border: "2px solid var(--ink)",
                      boxShadow: "2px 2px 0 var(--ink)",
                      background: "var(--card)",
                      cursor: "pointer",
                    }}
                  >
                    ＋ ADD VOLUME
                  </button>
                </div>
              </div>
            )}

            {/* ── THE SHELF GRID ── */}
            {loading ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: "12px", padding: "40px 0" }}>
                LOADING THE SHELF...
              </div>
            ) : (
              <ShelfGrid
                books={books}
                coverMode={coverMode}
                posterSeries={posterSeries}
                statusFilter={statusFilter}
                alchemizingBookId={alchemizingBookId}
                onAlchemize={handleGenerateAiCoverForBook}
                onSelectBook={(b) => setSelectedBook(b)}
                onAddVolume={(defaultStatus) => {
                  setAddModalStatus(defaultStatus || "READING");
                  setIsAddModalOpen(true);
                }}
                onSearchAgain={(b) => {
                  setSelectedBook(b);
                }}
                onPasteUrl={(b) => {
                  setSelectedBook(b);
                }}
                onUpload={(b) => {
                  setSelectedBook(b);
                }}
              />
            )}
          </>
        )}

        {/* ── ADD BOOK MODAL ── */}
        <AddBookModal
          isOpen={isAddModalOpen}
          initialStatus={addModalStatus}
          onClose={() => setIsAddModalOpen(false)}
          onBookCreated={(newBook) => {
            setBooks((prev) => [newBook, ...prev]);
            setSelectedBook(newBook);
          }}
        />
      </div>
    </AppPage>
  );
}

export default function MarginaliaPage() {
  return (
    <Suspense fallback={<AppLoading label="LOADING THE SHELF..." />}>
      <MarginaliaPageContent />
    </Suspense>
  );
}
