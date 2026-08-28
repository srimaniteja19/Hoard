"use client";

import React, { useState, useEffect, useRef } from "react";
import { BookFormat, BookMotif, BookRow } from "@/db/schema";
import { EDITORIAL_PALETTE, MOTIFS, seedHouseStyle } from "@/lib/marginalia/houseMotifs";
import { HouseCover } from "./HouseCover";
import { PosterCover } from "./PosterCover";
import { playSound } from "@/lib/sound";

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookCreated: (newBook: BookRow) => void;
}

interface CoverCandidate {
  source: string;
  url: string;
  label: string;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  isOpen,
  onClose,
  onBookCreated,
}) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [format, setFormat] = useState<BookFormat>("AUDIO");
  const [totalChapters, setTotalChapters] = useState("12");
  const [totalPages, setTotalPages] = useState("");
  const [audioDuration, setAudioDuration] = useState("");
  const [customCoverUrl, setCustomCoverUrl] = useState("");

  // House Styling choices
  const [selectedAccent, setSelectedAccent] = useState("#7B5CF0");
  const [selectedFg, setSelectedFg] = useState("#FFFFFF");
  const [selectedMotif, setSelectedMotif] = useState<BookMotif>("arcs");

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverSource, setCoverSource] = useState<string>("HOUSE");
  const [candidates, setCandidates] = useState<CoverCandidate[]>([]);
  const [autoDetectedNotice, setAutoDetectedNotice] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-seed house style when title or author changes
  useEffect(() => {
    if (!title.trim()) return;
    const seeded = seedHouseStyle(title, author);
    setSelectedAccent(seeded.accentColor);
    setSelectedFg(seeded.fgColor);
    setSelectedMotif(seeded.motif);
  }, [title, author]);

  // Debounced cover candidate & metadata lookup
  useEffect(() => {
    if (!isOpen || !title.trim()) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        setLookingUp(true);
        const res = await fetch("/api/books/lookup-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            author: author.trim() || undefined,
            isbn: isbn.trim() || undefined,
            format,
            customCoverUrl: customCoverUrl.trim() || undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setCoverUrl(data.best?.coverUrl || null);
          setCoverSource(data.best?.coverSource || "HOUSE");
          setCandidates(data.candidates || []);

          const meta = data.metadata;
          if (meta) {
            if (meta.pageCount && (!totalPages || totalPages === "380")) {
              setTotalPages(String(meta.pageCount));
            }
            if (meta.chapterCount) {
              setTotalChapters(String(meta.chapterCount));
            }
            if (meta.audioDuration) {
              setAudioDuration(meta.audioDuration);
            }
            if (meta.suggestedAuthor && !author.trim()) {
              setAuthor(meta.suggestedAuthor);
            }
            if (meta.suggestedIsbn && !isbn.trim()) {
              setIsbn(meta.suggestedIsbn);
            }

            const notices: string[] = [];
            if (meta.pageCount) notices.push(`${meta.pageCount} pages`);
            if (meta.chapterCount) notices.push(`${meta.chapterCount} chapters`);
            if (meta.audioDuration) notices.push(`${meta.audioDuration} audio`);
            if (notices.length > 0) {
              setAutoDetectedNotice(`✓ Found: ${notices.join(" · ")}`);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLookingUp(false);
      }
    }, 550);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [title, author, isbn, format, customCoverUrl, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      playSound.click();

      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim() || "Unknown Author",
          isbn: isbn.trim() || undefined,
          format,
          totalChapters: totalChapters ? parseInt(totalChapters, 10) : 1,
          totalPages: totalPages ? parseInt(totalPages, 10) : undefined,
          audioDuration: audioDuration.trim() || undefined,
          accentColor: selectedAccent,
          fgColor: selectedFg,
          motif: selectedMotif,
          coverUrl: coverSource === "HOUSE" ? null : coverUrl,
          coverSource,
          customCoverUrl: customCoverUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add book volume");
      }

      const created: BookRow = await res.json();
      playSound.fileIt();
      onBookCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create book");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 10, 10, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)",
          border: "var(--b) solid var(--ink)",
          boxShadow: "8px 8px 0 var(--ink)",
          maxWidth: "680px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "0",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "2px solid var(--ink)",
            background: "var(--shelf)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                background: "var(--yellow)",
                padding: "3px 7px",
                border: "1.5px solid var(--ink)",
                boxShadow: "1.5px 1.5px 0 var(--ink)",
              }}
            >
              📚 BINDERY
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.1em",
              }}
            >
              ADD A NEW VOLUME
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--card)",
              border: "1.5px solid var(--ink)",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 900,
              width: "26px",
              height: "26px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--shelf)",
                border: "1.5px solid var(--pink)",
                color: "var(--pink)",
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "24px" }}>
            {/* Left Inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    marginBottom: "4px",
                  }}
                >
                  TITLE *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Designing Data-Intensive Applications"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontFamily: "var(--body)",
                    fontSize: "14px",
                    border: "2px solid var(--ink)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    marginBottom: "4px",
                  }}
                >
                  AUTHOR
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Martin Kleppmann"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontFamily: "var(--body)",
                    fontSize: "14px",
                    border: "2px solid var(--ink)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      marginBottom: "4px",
                    }}
                  >
                    FORMAT
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as BookFormat)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      fontFamily: "var(--mono)",
                      fontSize: "11px",
                      fontWeight: 700,
                      border: "2px solid var(--ink)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                    }}
                  >
                    <option value="AUDIO">🎧 AUDIOBOOK</option>
                    <option value="PHYSICAL">📖 PHYSICAL / PRINT</option>
                    <option value="EBOOK">📱 EBOOK</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      marginBottom: "4px",
                    }}
                  >
                    ISBN / OLID (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="9781449373320"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      border: "2px solid var(--ink)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                    }}
                  />
                </div>
              </div>

              {autoDetectedNotice && (
                <div
                  style={{
                    padding: "4px 8px",
                    background: "var(--lime)",
                    border: "1.5px solid var(--ink)",
                    fontFamily: "var(--mono)",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{autoDetectedNotice}</span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      marginBottom: "4px",
                    }}
                  >
                    TOTAL CHAPTERS
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={totalChapters}
                    onChange={(e) => setTotalChapters(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      fontFamily: "var(--mono)",
                      fontSize: "12px",
                      border: "2px solid var(--ink)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      marginBottom: "4px",
                    }}
                  >
                    {format === "AUDIO" ? "DURATION (HH:MM)" : "TOTAL PAGES"}
                  </label>
                  {format === "AUDIO" ? (
                    <input
                      type="text"
                      value={audioDuration}
                      onChange={(e) => setAudioDuration(e.target.value)}
                      placeholder="14:35"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        fontFamily: "var(--mono)",
                        fontSize: "12px",
                        border: "2px solid var(--ink)",
                        background: "var(--paper)",
                        color: "var(--ink)",
                      }}
                    />
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={totalPages}
                      onChange={(e) => setTotalPages(e.target.value)}
                      placeholder="380"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        fontFamily: "var(--mono)",
                        fontSize: "12px",
                        border: "2px solid var(--ink)",
                        background: "var(--paper)",
                        color: "var(--ink)",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Custom Cover URL */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    marginBottom: "4px",
                  }}
                >
                  CUSTOM JACKET URL (OPTIONAL)
                </label>
                <input
                  type="url"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    border: "2px solid var(--ink)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                />
              </div>

              {/* House Edition Customizer */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    marginBottom: "6px",
                  }}
                >
                  HOUSE MOTIF &amp; PALETTE
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {MOTIFS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMotif(m)}
                      style={{
                        padding: "3px 8px",
                        fontFamily: "var(--mono)",
                        fontSize: "9px",
                        fontWeight: 800,
                        border: "1.5px solid var(--ink)",
                        background: selectedMotif === m ? "var(--ink)" : "var(--card)",
                        color: selectedMotif === m ? "var(--paper)" : "var(--ink)",
                        cursor: "pointer",
                      }}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  {EDITORIAL_PALETTE.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setSelectedAccent(p.accent);
                        setSelectedFg(p.fg);
                      }}
                      style={{
                        width: "22px",
                        height: "22px",
                        background: p.accent,
                        border: selectedAccent === p.accent ? "3px solid var(--ink)" : "1.5px solid var(--ink)",
                        boxShadow: selectedAccent === p.accent ? "2px 2px 0 var(--ink)" : "none",
                        cursor: "pointer",
                      }}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Live Preview */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "9.5px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                  opacity: 0.6,
                }}
              >
                {lookingUp ? "LOOKING UP..." : "COVER PREVIEW"}
              </div>

              <div
                style={{
                  width: "160px",
                  aspectRatio: "2/3",
                  border: "var(--b) solid var(--ink)",
                  boxShadow: "5px 5px 0 var(--ink)",
                  position: "relative",
                  overflow: "hidden",
                  background: "var(--shade)",
                }}
              >
                {coverSource === "POSTER" ? (
                  <PosterCover
                    title={title || "TITLE HERE"}
                    author={author || "Author Name"}
                  />
                ) : coverUrl && coverSource !== "HOUSE" ? (
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <HouseCover
                    title={title || "TITLE HERE"}
                    author={author || "Author Name"}
                    accentColor={selectedAccent}
                    fgColor={selectedFg}
                    motif={selectedMotif}
                  />
                )}
                <div className="cv__spine" />
                <span className="cv__fmt">{format}</span>
              </div>

              {/* Cover Source Selector */}
              <div style={{ marginTop: "12px", width: "100%" }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: "8.5px",
                    fontWeight: 800,
                    opacity: 0.6,
                    marginBottom: "4px",
                  }}
                >
                  COVER STYLE:
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {coverUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverSource("JACKET");
                      }}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "8.5px",
                        fontWeight: 800,
                        padding: "3px 6px",
                        textAlign: "left",
                        border: "1px solid var(--ink)",
                        background: coverSource === "JACKET" || coverSource === "OPEN_LIBRARY" || coverSource === "GOOGLE_BOOKS" || coverSource === "ITUNES" || coverSource === "UPLOAD" ? "var(--yellow)" : "var(--card)",
                        cursor: "pointer",
                      }}
                    >
                      PUBLISHER JACKET
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCoverSource("POSTER");
                    }}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "8.5px",
                      fontWeight: 800,
                      padding: "3px 6px",
                      textAlign: "left",
                      border: "1px solid var(--ink)",
                      background: coverSource === "POSTER" ? "var(--yellow)" : "var(--card)",
                      cursor: "pointer",
                    }}
                  >
                    POSTER (ILLUSTRATED)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCoverSource("HOUSE");
                    }}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "8.5px",
                      fontWeight: 800,
                      padding: "3px 6px",
                      textAlign: "left",
                      border: "1px solid var(--ink)",
                      background: coverSource === "HOUSE" ? "var(--yellow)" : "var(--card)",
                      cursor: "pointer",
                    }}
                  >
                    HOUSE EDITION
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "2px solid rgba(10, 10, 10, 0.12)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "var(--mono)",
                fontWeight: 700,
                fontSize: "11px",
                padding: "8px 16px",
                border: "2px solid var(--ink)",
                background: "var(--card)",
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                fontFamily: "var(--mono)",
                fontWeight: 800,
                fontSize: "11px",
                padding: "8px 18px",
                border: "2px solid var(--ink)",
                boxShadow: "2.5px 2.5px 0 var(--ink)",
                background: "var(--yellow)",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              {submitting ? "BINDING..." : "＋ BIND & ADD TO SHELF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
