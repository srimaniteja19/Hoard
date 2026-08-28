"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";
import { BookRow } from "@/db/schema";
import { ShelfGrid } from "@/components/marginalia/ShelfGrid";
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
  const [selectedBook, setSelectedBook] = useState<BookRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Restore saved theme and mode from localStorage
  useEffect(() => {
    try {
      const savedPaper = localStorage.getItem("hoard-marginalia-paper") as PaperTheme | null;
      if (savedPaper && ["cream", "sand", "ink"].includes(savedPaper)) {
        setPaperTheme(savedPaper);
      }
      const savedMode = localStorage.getItem("hoard-marginalia-cover-mode") as CoverViewMode | null;
      if (savedMode && ["jackets", "poster", "house"].includes(savedMode)) {
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
              <span className="sp" />

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
              ) : (
                <>JACKETS PULLS REAL PUBLISHER ART · POSTER RENDERS MODERN ILLUSTRATED EDITORIAL JACKETS · HOUSE REBINDS IN UNIFIED GEOMETRIC MINIMALISM.</>
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
                onSelectBook={(b) => setSelectedBook(b)}
                onAddVolume={() => setIsAddModalOpen(true)}
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

            {/* ── HOW A JACKET IS FOUND (PROVENANCE RESOLVER) ── */}
            <div className="chain">
              <div className="chain__h">
                <span>HOW A JACKET IS FOUND</span>
                <span>FIRST HIT WINS · CACHED LOCALLY AFTER</span>
              </div>
              <div className="chain__r">
                <span className="n">1</span>
                <span className="src">YOUR UPLOAD</span>
                <span className="d">
                  A file you dropped in, or a URL you pasted. Always wins — nothing overrides a cover you chose.
                </span>
                <span className="st ok">ALWAYS WORKS</span>
              </div>
              <div className="chain__r">
                <span className="n">2</span>
                <span className="src">OPEN LIBRARY</span>
                <span className="d">
                  Free, no key, by ISBN or OLID. Best licensing position of any source. Coverage is patchy on recent and self-published titles.
                </span>
                <span className="st ok">NO KEY</span>
              </div>
              <div className="chain__r">
                <span className="n">3</span>
                <span className="src">GOOGLE BOOKS</span>
                <span className="d">
                  Broadest catalogue. Thumbnails are small unless you raise the zoom parameter. Their terms require you use the API rather than hotlink.
                </span>
                <span className="st warn">TERMS APPLY</span>
              </div>
              <div className="chain__r">
                <span className="n">4</span>
                <span className="src">iTUNES SEARCH</span>
                <span className="d">
                  The one that actually knows audiobooks. Artwork URL size is swappable — request 600×600 instead of the default 100.
                </span>
                <span className="st ok">BEST FOR AUDIO</span>
              </div>
              <div className="chain__r">
                <span className="n">5</span>
                <span className="src">HOUSE EDITION</span>
                <span className="d">
                  Generated from title, author and a colour seeded off the title. Never fails, never 404s, never needs a licence.
                </span>
                <span className="st ok">GUARANTEED</span>
              </div>
              <div className="chain__f">
                COVER ART IS COPYRIGHTED. USING IT TO IDENTIFY A BOOK IN YOUR OWN PRIVATE LIBRARY IS THE SAFEST POSSIBLE USE,
                BUT IT IS STILL SOMEONE ELSE&apos;S ARTWORK — SO THE FALLBACK ISN&apos;T A NICETY, IT&apos;S THE FLOOR.
                IF YOU EVER MAKE A SHELF PUBLIC, HOUSE MODE IS THE ONE TO SHIP.
              </div>
            </div>
          </>
        )}

        {/* ── ADD BOOK MODAL ── */}
        <AddBookModal
          isOpen={isAddModalOpen}
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
