"use client";

import React, { useState, useEffect, useRef } from "react";
import { BookRow, MarginaliaRow, MarginaliaPendingMarkRow, MarginaliaKind, BookStatus } from "@/db/schema";
import { BookCoverFrame } from "./BookCoverFrame";
import { ReadingSynthesisModal } from "./ReadingSynthesisModal";
import { TableOfContentsModal } from "./TableOfContentsModal";
import { BookSummaryModal } from "./BookSummaryModal";
import { ChapterItem } from "@/lib/marginalia/types";
import { cleanChapterTitle } from "@/lib/marginalia/chapterExtractor";
import { playSound } from "@/lib/sound";

type GhostPersona = "SOCRATES" | "NIETZSCHE" | "FEYNMAN" | "MARCUS_AURELIUS" | "AUTHOR";

const PERSONA_CONFIG: Record<GhostPersona, { label: string; icon: string; bg: string }> = {
  SOCRATES: { label: "SOCRATES", icon: "🧙‍♂️", bg: "#FBBF24" },
  NIETZSCHE: { label: "NIETZSCHE", icon: "⚡", bg: "#EF4444" },
  FEYNMAN: { label: "FEYNMAN", icon: "🔬", bg: "#38BDF8" },
  MARCUS_AURELIUS: { label: "MARCUS AURELIUS", icon: "🏛️", bg: "#34D399" },
  AUTHOR: { label: "AUTHOR", icon: "✍️", bg: "#A78BFA" },
};

interface BookDetailViewProps {
  book: BookRow;
  onBack: () => void;
  onUpdateBook: (updated: BookRow) => void;
  onDeleteBook?: (bookId: string) => void;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  book: initialBook,
  onBack,
  onUpdateBook,
  onDeleteBook,
}) => {
  const [book, setBook] = useState<BookRow>(initialBook);
  const [notes, setNotes] = useState<MarginaliaRow[]>([]);
  const [pendingMarks, setPendingMarks] = useState<MarginaliaPendingMarkRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Capture State
  const [captureMode, setCaptureMode] = useState<MarginaliaKind>("VERBATIM");
  const [quoteInput, setQuoteInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [chapterInput, setChapterInput] = useState(String(book.currentChapter || 1));
  const [pageInput, setPageInput] = useState(book.currentPage ? String(book.currentPage) : "");
  const [timestampInput, setTimestampInput] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Pending mark state
  const [newMarkTime, setNewMarkTime] = useState("");
  const [newMarkNote, setNewMarkNote] = useState("");
  const [addingMark, setAddingMark] = useState(false);

  // Filter / Chapter view
  const [filterChapter, setFilterChapter] = useState<number | "ALL">("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);

  // ── AI FEATURE: GHOST READER SPARRING ──
  const [sparringNote, setSparringNote] = useState<MarginaliaRow | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<GhostPersona>("SOCRATES");
  const [ghostResponse, setGhostResponse] = useState<string>("");
  const [ghostLoading, setGhostLoading] = useState(false);

  // ── AI FEATURE: VISION OCR PAGE SNAPPER ──
  const [ocrScanning, setOcrScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── AI FEATURE: READING SYNTHESIS & ZINE ──
  const [synthesisModalOpen, setSynthesisModalOpen] = useState(false);
  const [synthesisData, setSynthesisData] = useState<any>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);

  // ── AI FEATURE: CHAPTER-BY-CHAPTER BRIEFING ──
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── TABLE OF CONTENTS STATE ──
  const [tocModalOpen, setTocModalOpen] = useState(false);
  const [resolvingToc, setResolvingToc] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);

  const chapters: ChapterItem[] = (book.chapters as ChapterItem[]) || [];
  const currentChapterObj = chapters.find((c) => c.number === (book.currentChapter || 1));
  const currentChapterTitle = currentChapterObj?.title || null;

  // Fetch full notes & marks on mount
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/books/${book.id}`);
        if (res.ok && active) {
          const data = await res.json();
          setBook(data.book);
          setNotes(data.marginalia || []);
          setPendingMarks(data.pendingMarks || []);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [book.id]);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleAutoResolveToc = async () => {
    try {
      setResolvingToc(true);
      playSound.click();
      showToast("Resolving Table of Contents via AI...");
      const res = await fetch(`/api/books/${book.id}/chapters`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setBook(data.book);
        onUpdateBook(data.book);
        playSound.fileIt();
        showToast(`✓ Resolved ${data.chapters.length} chapter titles!`);
      } else {
        showToast("Could not resolve chapter names");
      }
    } catch {
      showToast("Error resolving chapters");
    } finally {
      setResolvingToc(false);
    }
  };

  // ── CHAPTER BRIEFING HANDLERS ──
  const handleOpenSummary = () => {
    playSound.click();
    setSummaryModalOpen(true);
  };

  const handleGenerateSummary = async () => {
    try {
      setSummaryLoading(true);
      playSound.click();
      showToast("Synthesizing Executive Chapter Briefing...");
      const res = await fetch(`/api/books/${book.id}/summary`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setBook(data.book);
        onUpdateBook(data.book);
        playSound.fileIt();
        showToast("✓ Executive Chapter Briefing generated!");
      } else {
        showToast("Failed to generate chapter summary");
      }
    } catch {
      showToast("Error generating chapter summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  // Progress Updater
  const handleUpdateProgress = async (newChapter: number, newStatus?: BookStatus) => {
    try {
      playSound.click();
      const payload: Partial<BookRow> = {
        currentChapter: newChapter,
        ...(newStatus ? { status: newStatus } : {}),
      };
      if (newChapter >= (book.totalChapters || 1)) {
        payload.status = "FINISHED";
      }

      const res = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setBook(updated);
        onUpdateBook(updated);
        setChapterInput(String(updated.currentChapter || 1));
      }
    } catch {
      // ignore
    }
  };

  // Create Marginalia Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteInput.trim() && !noteInput.trim()) return;

    try {
      setSubmittingNote(true);
      playSound.click();

      const res = await fetch(`/api/books/${book.id}/marginalia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: captureMode,
          quote: quoteInput.trim() || undefined,
          note: noteInput.trim() || undefined,
          chapter: parseInt(chapterInput, 10) || (book.currentChapter || 1),
          page: pageInput ? parseInt(pageInput, 10) : undefined,
          timestamp: timestampInput.trim() || undefined,
        }),
      });

      if (res.ok) {
        const created: MarginaliaRow = await res.json();
        setNotes((prev) => [created, ...prev]);
        setQuoteInput("");
        setNoteInput("");
        setTimestampInput("");
        playSound.fileIt();
        showToast("✓ Note bound to marginalia");

        setBook((prev) => ({
          ...prev,
          notesCount: (prev.notesCount || 0) + 1,
        }));
      }
    } catch {
      showToast("Error saving note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleGenerateAiCover = async () => {
    try {
      setGeneratingCover(true);
      playSound.click();
      showToast("✨ Alchemizing AI Dream Cover...");

      const res = await fetch("/api/books/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate AI cover");
      }

      const data = await res.json();
      const generated = data.cover;
      const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(generated.svgMarkup)}`;

      const patchRes = await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverUrl: svgDataUri,
          coverSource: "ALCHEMIST",
          customCoverUrl: svgDataUri,
          accentColor: generated.accentColor || book.accentColor,
          fgColor: generated.fgColor || book.fgColor,
        }),
      });

      if (patchRes.ok) {
        const updated: BookRow = await patchRes.json();
        setBook(updated);
        onUpdateBook(updated);
        playSound.fileIt();
        showToast("✨ AI Dream Cover successfully bound!");
      }
    } catch {
      showToast("Failed to generate AI Dream Cover");
    } finally {
      setGeneratingCover(false);
    }
  };

  // ── GHOST READER SPARRING HANDLER ──
  const handleStartSparring = async (note: MarginaliaRow, persona?: GhostPersona) => {
    const activePersona = persona || selectedPersona;
    setSparringNote(note);
    setSelectedPersona(activePersona);
    setGhostResponse("");
    setGhostLoading(true);
    playSound.click();

    try {
      const res = await fetch(`/api/books/${book.id}/marginalia/ghost-reader`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteContent: note.note,
          quote: note.quote,
          chapter: note.chapter,
          persona: activePersona,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setGhostResponse(accumulated);
        }
        playSound.fileIt();
      }
    } catch {
      showToast("Ghost Reader unavailable");
    } finally {
      setGhostLoading(false);
    }
  };

  const handleSaveGhostNote = async () => {
    if (!ghostResponse || !sparringNote) return;
    try {
      playSound.click();
      const res = await fetch(`/api/books/${book.id}/marginalia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "COUNTER",
          quote: sparringNote.quote || sparringNote.note,
          note: `[${PERSONA_CONFIG[selectedPersona].icon} ${selectedPersona}]: ${ghostResponse}`,
          chapter: sparringNote.chapter,
          page: sparringNote.page,
        }),
      });

      if (res.ok) {
        const created: MarginaliaRow = await res.json();
        setNotes((prev) => [created, ...prev]);
        setSparringNote(null);
        setGhostResponse("");
        playSound.fileIt();
        showToast("✓ Ghost critique added as counter-note");
      }
    } catch {
      // ignore
    }
  };

  // ── VISION OCR IMAGE SCANNER ──
  const handleOcrFile = async (file: File) => {
    try {
      setOcrScanning(true);
      playSound.click();
      showToast("Scanning page with Vision AI...");

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch("/api/books/ocr-snapper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
            bookTitle: book.title,
            bookAuthor: book.author,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const scan = data.result;
          if (scan.quote) setQuoteInput(scan.quote);
          if (scan.pageNumber) setPageInput(String(scan.pageNumber));
          if (scan.chapterTitle) {
            const match = scan.chapterTitle.match(/\d+/);
            if (match) setChapterInput(match[0]);
          }
          if (scan.suggestedReflection) {
            setNoteInput(scan.suggestedReflection);
          }
          setCaptureMode("VERBATIM");
          playSound.fileIt();
          showToast("✓ Highlight & Page parsed via OCR!");
        } else {
          showToast("Could not scan text from image");
        }
        setOcrScanning(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setOcrScanning(false);
      showToast("OCR scanning failed");
    }
  };

  // Clipboard paste detection for screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleOcrFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [book.title, book.author]);

  // ── READING SYNTHESIS GENERATOR ──
  const handleOpenSynthesis = async () => {
    setSynthesisModalOpen(true);
    if (!synthesisData) {
      await fetchSynthesis();
    }
  };

  const fetchSynthesis = async () => {
    try {
      setSynthesisLoading(true);
      playSound.click();
      const res = await fetch(`/api/books/${book.id}/synthesis`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSynthesisData(data.synthesis);
        playSound.fileIt();
      } else {
        const err = await res.json();
        showToast(err.error || "Synthesis failed");
      }
    } catch {
      showToast("Error creating reading synthesis");
    } finally {
      setSynthesisLoading(false);
    }
  };

  // Promote Note to TIL or Todo
  const handlePromote = async (noteId: string, target: "TIL" | "TODO") => {
    try {
      playSound.click();
      const res = await fetch(`/api/books/${book.id}/marginalia/${noteId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, promotedTo: target, promotedId: data.tilId || data.todoId } : n))
        );
        playSound.pin(true);
        showToast(target === "TIL" ? `✓ Minted as TIL #${data.shortHash}` : "✓ Added to Todos");

        setBook((prev) => ({
          ...prev,
          promotedCount: (prev.promotedCount || 0) + 1,
        }));
      }
    } catch {
      showToast("Failed to promote note");
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    try {
      playSound.bury();
      const res = await fetch(`/api/books/${book.id}/marginalia/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setBook((prev) => ({
          ...prev,
          notesCount: Math.max(0, (prev.notesCount || 0) - 1),
        }));
        showToast("Note deleted");
      }
    } catch {
      // ignore
    }
  };

  // Add Quick Audio Bookmark
  const handleAddPendingMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarkTime.trim()) return;

    try {
      setAddingMark(true);
      playSound.click();

      const res = await fetch(`/api/books/${book.id}/pending-marks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: newMarkTime.trim(),
          chapter: parseInt(chapterInput, 10) || book.currentChapter,
          note: newMarkNote.trim() || undefined,
        }),
      });

      if (res.ok) {
        const created: MarginaliaPendingMarkRow = await res.json();
        setPendingMarks((prev) => [...prev, created]);
        setNewMarkTime("");
        setNewMarkNote("");
        showToast("✓ Timestamp bookmarked");
      }
    } catch {
      // ignore
    } finally {
      setAddingMark(false);
    }
  };

  // Convert Pending Mark into Note
  const handleConvertMark = (mark: MarginaliaPendingMarkRow) => {
    playSound.click();
    setTimestampInput(mark.timestamp);
    if (mark.chapter) setChapterInput(String(mark.chapter));
    if (mark.note) setNoteInput(mark.note);
    fetch(`/api/books/${book.id}/pending-marks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markId: mark.id, status: "PROCESSED" }),
    }).then(() => {
      setPendingMarks((prev) => prev.filter((m) => m.id !== mark.id));
    });
  };

  const filteredNotes =
    filterChapter === "ALL"
      ? notes
      : notes.filter((n) => n.chapter === filterChapter);

  return (
    <div
      className="book-studio"
      style={
        {
          "--book-accent": book.accentColor || "#7B5CF0",
        } as React.CSSProperties
      }
    >
      {/* ── TOP NAV BAR WITH AI & VOLUME CONTROLS ── */}
      <div className="book-studio-head">
        {/* Left: Navigation & Volume State */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              playSound.click();
              onBack();
            }}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              height: "32px",
              padding: "0 12px",
              background: "var(--card)",
              color: "var(--ink)",
              border: "1.5px solid var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            ← THE SHELF
          </button>

          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              height: "32px",
              padding: "0 10px",
              background: "var(--shade)",
              border: "1.5px solid var(--ink)",
              display: "inline-flex",
              alignItems: "center",
              color: "var(--ink)",
            }}
          >
            {book.format}
          </span>

          <select
            value={book.status}
            onChange={(e) => handleUpdateProgress(book.currentChapter || 1, e.target.value as BookStatus)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10.5px",
              fontWeight: 800,
              height: "32px",
              padding: "0 8px",
              border: "1.5px solid var(--ink)",
              background: "var(--card)",
              color: "var(--ink)",
              cursor: "pointer",
              boxShadow: "2px 2px 0 var(--ink)",
            }}
          >
            <option value="READING">📖 READING</option>
            <option value="FINISHED">✓ FINISHED</option>
            <option value="UNSTARTED">⏸ NOT STARTED</option>
            <option value="PAUSED">⏳ PAUSED</option>
            <option value="WANT_TO_READ">🔖 WANT TO READ</option>
          </select>
        </div>

        {/* Right: AI Intelligence Suite & Volume Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Chapter Briefing Trigger */}
          <button
            type="button"
            onClick={handleOpenSummary}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              height: "32px",
              padding: "0 12px",
              background: book.summary ? "var(--lime)" : "var(--card)",
              color: "#0A0A0A",
              border: "1.5px solid var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⚡ BRIEFING</span>
            {book.summary && (
              <span
                style={{
                  fontSize: "9px",
                  background: "#0A0A0A",
                  color: "#FFFFFF",
                  padding: "1px 4px",
                  fontWeight: 900,
                }}
              >
                SAVED
              </span>
            )}
          </button>

          {/* Table of Contents Trigger */}
          <button
            type="button"
            onClick={() => setTocModalOpen(true)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              height: "32px",
              padding: "0 12px",
              background: "var(--card)",
              color: "var(--ink)",
              border: "1.5px solid var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            📑 TOC ({chapters.length > 0 ? chapters.length : "DETECT"})
          </button>

          {/* AI Synthesis Trigger */}
          <button
            type="button"
            onClick={handleOpenSynthesis}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              height: "32px",
              padding: "0 12px",
              background: "var(--yellow)",
              color: "#0A0A0A",
              border: "1.5px solid var(--ink)",
              boxShadow: "2px 2px 0 var(--ink)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            🔮 SYNTHESIS
          </button>

          {/* Remove Book Button */}
          <button
            type="button"
            onClick={async () => {
              if (window.confirm(`Are you sure you want to remove "${book.title}" and all its notes from your shelf?`)) {
                try {
                  playSound.bury();
                  const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
                  if (res.ok) {
                    onDeleteBook?.(book.id);
                    onBack();
                  }
                } catch {
                  showToast("Failed to remove volume");
                }
              }
            }}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 800,
              height: "32px",
              padding: "0 10px",
              border: "1.5px solid var(--ink)",
              background: "var(--card)",
              color: "#EF4444",
              boxShadow: "2px 2px 0 var(--ink)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Remove volume from shelf"
          >
            🗑️
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "8px 14px",
            background: "var(--yellow)",
            border: "2px solid var(--ink)",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            marginBottom: "16px",
            color: "#0A0A0A",
          }}
        >
          {feedback}
        </div>
      )}

      {/* ── STUDIO LAYOUT ── */}
      <div className="book-studio-grid">
        {/* ── LEFT SIDEBAR: COVER & PROGRESS ── */}
        <div className="book-studio-sidebar">
          <div style={{ width: "190px", margin: "0 auto 12px" }}>
            <BookCoverFrame book={book} mode="jackets" tiltDeg={-1} />
          </div>

          <div style={{ width: "190px", margin: "0 auto 18px", textAlign: "center" }}>
            <button
              type="button"
              onClick={handleGenerateAiCover}
              disabled={generatingCover}
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                padding: "6px 10px",
                background: "linear-gradient(135deg, #FFE600 0%, #00F0FF 100%)",
                color: "#000000",
                border: "1.5px solid var(--ink)",
                boxShadow: "2px 2px 0 var(--ink)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
              title="Generate a bespoke AI vector artwork jacket for this book"
            >
              {generatingCover ? "✨ ALCHEMIZING..." : "✨ AI DREAM COVER"}
            </button>
          </div>

          <h2
            style={{
              fontFamily: "var(--display)",
              fontSize: "20px",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "0 0 4px",
            }}
          >
            {book.title}
          </h2>
          <div
            style={{
              fontFamily: "var(--quote)",
              fontStyle: "italic",
              fontSize: "15px",
              opacity: 0.7,
              marginBottom: "16px",
            }}
          >
            by {book.author}
          </div>

          {/* Reading Progress Stepper */}
          <div
            style={{
              borderTop: "2px solid rgba(10, 10, 10, 0.14)",
              paddingTop: "14px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                marginBottom: "8px",
              }}
            >
              <span>CURRENT CHAPTER</span>
              <span style={{ color: "var(--b-theme)" }}>
                {book.currentChapter || 1} / {book.totalChapters || 1}
              </span>
            </div>

            {currentChapterTitle && (
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: "13px",
                  fontWeight: 800,
                  lineHeight: 1.25,
                  marginBottom: "8px",
                  color: "var(--ink)",
                }}
              >
                “{currentChapterTitle}”
              </div>
            )}

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                type="button"
                disabled={(book.currentChapter || 1) <= 1}
                onClick={() => handleUpdateProgress(Math.max(1, (book.currentChapter || 1) - 1))}
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 900,
                  fontSize: "12px",
                  padding: "4px 10px",
                  border: "1.5px solid var(--ink)",
                  background: "var(--card)",
                  cursor: "pointer",
                }}
              >
                ◀
              </button>

              <input
                type="range"
                min="1"
                max={book.totalChapters || 12}
                value={book.currentChapter || 1}
                onChange={(e) => handleUpdateProgress(parseInt(e.target.value, 10))}
                style={{ flex: 1, accentColor: book.accentColor || "#7B5CF0" }}
              />

              <button
                type="button"
                disabled={(book.currentChapter || 1) >= (book.totalChapters || 1)}
                onClick={() =>
                  handleUpdateProgress(
                    Math.min(book.totalChapters || 1, (book.currentChapter || 1) + 1)
                  )
                }
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 900,
                  fontSize: "12px",
                  padding: "4px 10px",
                  border: "1.5px solid var(--ink)",
                  background: "var(--card)",
                  cursor: "pointer",
                }}
              >
                ▶
              </button>
            </div>

            <button
              type="button"
              onClick={() => setTocModalOpen(true)}
              style={{
                marginTop: "10px",
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: "9px",
                fontWeight: 800,
                padding: "4px 8px",
                border: "1px solid var(--ink)",
                background: "var(--shade)",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              {chapters.length > 0 ? `📑 VIEW TABLE OF CONTENTS (${chapters.length})` : "⚡ AUTO-DETECT CHAPTER TITLES"}
            </button>

            <button
              type="button"
              onClick={handleOpenSummary}
              style={{
                marginTop: "6px",
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: "9px",
                fontWeight: 800,
                padding: "5px 8px",
                border: "1.5px solid var(--ink)",
                background: book.summary ? "var(--lime)" : "var(--card)",
                color: "#0A0A0A",
                cursor: "pointer",
                textAlign: "center",
                boxShadow: "1px 1px 0 var(--ink)",
              }}
            >
              {book.summary ? "⚡ VIEW CHAPTER BRIEFING (SAVED)" : "⚡ GENERATE CHAPTER BRIEFING"}
            </button>
          </div>

          {/* Quick Audio Timestamp Bookmarks */}
          {book.format === "AUDIO" && (
            <div
              style={{
                borderTop: "2px solid rgba(10, 10, 10, 0.14)",
                paddingTop: "14px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                }}
              >
                🎧 AUDIO BOOKMARKS
              </div>

              <form onSubmit={handleAddPendingMark} style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                <input
                  type="text"
                  placeholder="01:24:15"
                  value={newMarkTime}
                  onChange={(e) => setNewMarkTime(e.target.value)}
                  style={{
                    width: "70px",
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    padding: "4px 6px",
                    border: "1.5px solid var(--ink)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Memo..."
                  value={newMarkNote}
                  onChange={(e) => setNewMarkNote(e.target.value)}
                  style={{
                    flex: 1,
                    fontFamily: "var(--body)",
                    fontSize: "12px",
                    padding: "4px 6px",
                    border: "1.5px solid var(--ink)",
                  }}
                />
                <button
                  type="submit"
                  disabled={addingMark}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "4px 8px",
                    border: "1.5px solid var(--ink)",
                    background: "var(--yellow)",
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </form>

              {pendingMarks.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {pendingMarks.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "4px 8px",
                        background: "var(--shelf)",
                        border: "1px solid var(--ink)",
                        fontFamily: "var(--mono)",
                        fontSize: "10px",
                      }}
                    >
                      <span>
                        ⏱ <b>{m.timestamp}</b> {m.note ? `— ${m.note}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConvertMark(m)}
                        style={{
                          fontSize: "8.5px",
                          fontWeight: 800,
                          padding: "2px 5px",
                          background: "var(--card)",
                          border: "1px solid var(--ink)",
                          cursor: "pointer",
                        }}
                      >
                        EXPAND
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", opacity: 0.5 }}>
                  No pending audio marks.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT MAIN STUDIO: 3 CAPTURE MODES + NOTES STREAM ── */}
        <div className="book-studio-main">
          {/* Capture Box */}
          <div className="capture-box">
            {/* Mode Switcher + OCR Trigger */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`note-mode-tab ${captureMode === "VERBATIM" ? "active" : ""}`}
                  onClick={() => setCaptureMode("VERBATIM")}
                >
                  &ldquo; VERBATIM (QUOTE)
                </button>
                <button
                  type="button"
                  className={`note-mode-tab ${captureMode === "PARAPHRASE" ? "active" : ""}`}
                  onClick={() => setCaptureMode("PARAPHRASE")}
                >
                  ✎ PARAPHRASE
                </button>
                <button
                  type="button"
                  className={`note-mode-tab ${captureMode === "THOUGHT" ? "active" : ""}`}
                  onClick={() => setCaptureMode("THOUGHT")}
                >
                  💡 THOUGHT
                </button>
              </div>

              {/* 📸 Vision OCR Snapper Button */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleOcrFile(file);
                  }}
                />
                <button
                  type="button"
                  disabled={ocrScanning}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    padding: "6px 10px",
                    border: "1.5px solid var(--ink)",
                    background: ocrScanning ? "var(--yellow)" : "var(--card)",
                    color: "var(--ink)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  title="Upload page photo or paste screenshot with Cmd+V"
                >
                  {ocrScanning ? "🔄 SCANNING OCR..." : "📸 SNAP / PASTE PAGE"}
                </button>
              </div>
            </div>

            <form onSubmit={handleAddNote} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Quote Input (for Verbatim or reference) */}
              {captureMode === "VERBATIM" && (
                <div>
                  <textarea
                    rows={3}
                    value={quoteInput}
                    onChange={(e) => setQuoteInput(e.target.value)}
                    placeholder="Enter the verbatim passage or paste a page screenshot..."
                    required
                    style={{
                      width: "100%",
                      fontFamily: "var(--quote)",
                      fontSize: "16px",
                      fontStyle: "italic",
                      padding: "10px 12px",
                      border: "2px solid var(--ink)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                      lineHeight: 1.4,
                    }}
                  />
                </div>
              )}

              {/* Reader Note Input */}
              <div>
                <textarea
                  rows={captureMode === "VERBATIM" ? 2 : 3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder={
                    captureMode === "VERBATIM"
                      ? "Add your commentary, synthesis, or notes on this quote..."
                      : captureMode === "PARAPHRASE"
                      ? "Restate the core concept in your own words..."
                      : "Record your reflection, hypothesis, or insight..."
                  }
                  required={captureMode !== "VERBATIM"}
                  style={{
                    width: "100%",
                    fontFamily: "var(--body)",
                    fontSize: "14px",
                    padding: "10px 12px",
                    border: "2px solid var(--ink)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                />
              </div>

              {/* Location Bar & Submit */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "4px",
                }}
              >
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <label
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                    }}
                  >
                    CH
                    {chapters.length > 0 ? (
                      <select
                        value={chapterInput}
                        onChange={(e) => setChapterInput(e.target.value)}
                        style={{
                          marginLeft: "4px",
                          maxWidth: "170px",
                          padding: "3px 6px",
                          fontFamily: "var(--mono)",
                          fontSize: "11px",
                          fontWeight: 700,
                          border: "1.5px solid var(--ink)",
                          background: "var(--paper)",
                          color: "var(--ink)",
                        }}
                      >
                        {chapters.map((c) => (
                          <option key={c.number} value={c.number}>
                            {c.number}. {cleanChapterTitle(c.title)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        value={chapterInput}
                        onChange={(e) => setChapterInput(e.target.value)}
                        style={{
                          width: "48px",
                          marginLeft: "4px",
                          padding: "3px 5px",
                          fontFamily: "var(--mono)",
                          fontSize: "11px",
                          border: "1.5px solid var(--ink)",
                        }}
                      />
                    )}
                  </label>

                  <label
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                    }}
                  >
                    {book.format === "AUDIO" ? "TIME" : "PAGE"}
                    <input
                      type="text"
                      placeholder={book.format === "AUDIO" ? "00:15:30" : "142"}
                      value={book.format === "AUDIO" ? timestampInput : pageInput}
                      onChange={(e) =>
                        book.format === "AUDIO"
                          ? setTimestampInput(e.target.value)
                          : setPageInput(e.target.value)
                      }
                      style={{
                        width: "65px",
                        marginLeft: "4px",
                        padding: "3px 5px",
                        fontFamily: "var(--mono)",
                        fontSize: "11px",
                        border: "1.5px solid var(--ink)",
                      }}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingNote}
                  style={{
                    fontFamily: "var(--mono)",
                    fontWeight: 800,
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    padding: "8px 18px",
                    border: "2px solid var(--ink)",
                    boxShadow: "2px 2px 0 var(--ink)",
                    background: "var(--b-theme)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {submittingNote ? "SAVING..." : "＋ BIND NOTE"}
                </button>
              </div>
            </form>
          </div>

          {/* ── GHOST READER SPARRING ACTIVE ARENA ── */}
          {sparringNote && (
            <div
              style={{
                border: "var(--b) solid var(--ink)",
                background: "var(--card)",
                boxShadow: "6px 6px 0 var(--ink)",
                padding: "18px 20px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em" }}>
                  🧙‍♂️ INTELLECTUAL SPARRING: {sparringNote.quote ? `"${sparringNote.quote.slice(0, 45)}..."` : "Note"}
                </div>
                <button
                  type="button"
                  onClick={() => setSparringNote(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontFamily: "var(--mono)",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✕ CLOSE
                </button>
              </div>

              {/* Persona Selector Pills */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                {(Object.keys(PERSONA_CONFIG) as GhostPersona[]).map((p) => {
                  const cfg = PERSONA_CONFIG[p];
                  const isSel = selectedPersona === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleStartSparring(sparringNote, p)}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        padding: "5px 9px",
                        border: "1.5px solid var(--ink)",
                        background: isSel ? cfg.bg : "var(--card)",
                        color: isSel ? "#0A0A0A" : "var(--ink)",
                        boxShadow: isSel ? "2px 2px 0 var(--ink)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>

              {/* Ghost commentary bubble */}
              <div
                style={{
                  background: "var(--shade)",
                  border: "2px dashed var(--ink)",
                  padding: "14px 18px",
                  marginBottom: "12px",
                  minHeight: "65px",
                }}
              >
                {ghostLoading && !ghostResponse ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.7 }}>
                    {PERSONA_CONFIG[selectedPersona].icon} {selectedPersona} is dissecting your note...
                  </div>
                ) : (
                  <p
                    style={{
                      fontFamily: "var(--body)",
                      fontSize: "14.5px",
                      lineHeight: 1.5,
                      margin: 0,
                      color: "var(--ink)",
                    }}
                  >
                    {ghostResponse}
                  </p>
                )}
              </div>

              {ghostResponse && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={handleSaveGhostNote}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 800,
                      padding: "6px 14px",
                      border: "2px solid var(--ink)",
                      background: "var(--lime)",
                      color: "#0A0A0A",
                      boxShadow: "2px 2px 0 var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    ✓ BIND AS COUNTER-NOTE
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chapter Filter Pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              borderBottom: "2px solid var(--ink)",
              paddingBottom: "12px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                opacity: 0.6,
              }}
            >
              FILTER:
            </span>

            <button
              type="button"
              onClick={() => setFilterChapter("ALL")}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "9.5px",
                fontWeight: 800,
                padding: "3px 8px",
                border: "1.5px solid var(--ink)",
                background: filterChapter === "ALL" ? "var(--ink)" : "var(--card)",
                color: filterChapter === "ALL" ? "var(--paper)" : "var(--ink)",
                cursor: "pointer",
              }}
            >
              ALL CHAPTERS ({notes.length})
            </button>

            {Array.from(new Set(notes.map((n) => n.chapter)))
              .sort((a, b) => a - b)
              .map((ch) => {
                const chInfo = chapters.find((c) => c.number === ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setFilterChapter(ch)}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      padding: "3px 8px",
                      border: "1.5px solid var(--ink)",
                      background: filterChapter === ch ? "var(--b-theme)" : "var(--card)",
                      color: filterChapter === ch ? "#fff" : "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    CH {ch}{chInfo ? ` · ${chInfo.title}` : ""} ({notes.filter((n) => n.chapter === ch).length})
                  </button>
                );
              })}
          </div>

          {/* Marginalia Notes Stream */}
          {loading ? (
            <div style={{ fontFamily: "var(--mono)", fontSize: "12px", padding: "20px" }}>
              LOADING MARGINALIA...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div
              style={{
                padding: "36px",
                textAlign: "center",
                background: "var(--card)",
                border: "var(--b) dashed var(--ink)",
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 700,
                opacity: 0.6,
              }}
            >
              NO MARGINALIA RECORDED YET. CAPTURE YOUR FIRST PASSAGE ABOVE OR PASTE A SCREENSHOT (CMD+V).
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredNotes.map((note) => (
                <div key={note.id} className="marginalia-card">
                  {/* Note Header & Badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "8.5px",
                          fontWeight: 800,
                          padding: "2px 6px",
                          background:
                            note.kind === "VERBATIM"
                              ? "var(--b-theme)"
                              : note.kind === "PARAPHRASE"
                              ? "var(--cyan)"
                              : note.kind === "COUNTER"
                              ? "var(--lime)"
                              : "var(--yellow)",
                          color: note.kind === "VERBATIM" ? "#fff" : "#0A0A0A",
                          border: "1px solid var(--ink)",
                        }}
                      >
                        {note.kind}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "9px",
                          fontWeight: 700,
                          opacity: 0.6,
                        }}
                      >
                        CH {note.chapter}
                        {note.page ? ` · P. ${note.page}` : ""}
                        {note.timestamp ? ` · ⏱ ${note.timestamp}` : ""}
                      </span>
                    </div>

                    {/* Spar & Promotion Actions */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {/* Ghost Reader Sparring Trigger */}
                      <button
                        type="button"
                        onClick={() => handleStartSparring(note)}
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "8.5px",
                          fontWeight: 800,
                          background: "var(--yellow)",
                          color: "#0A0A0A",
                          border: "1px solid var(--ink)",
                          padding: "2px 6px",
                          cursor: "pointer",
                        }}
                        title="Spar with Ghost Reader"
                      >
                        🧙‍♂️ SPAR
                      </button>

                      {note.promotedTo ? (
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "8.5px",
                            fontWeight: 800,
                            background: "var(--lime)",
                            border: "1px solid var(--ink)",
                            padding: "2px 6px",
                            color: "#0A0A0A",
                          }}
                        >
                          ✓ MINTED TO {note.promotedTo}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handlePromote(note.id, "TIL")}
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "8.5px",
                              fontWeight: 800,
                              background: "var(--card)",
                              border: "1px solid var(--ink)",
                              padding: "2px 6px",
                              cursor: "pointer",
                            }}
                            title="Mint to TIL Wall"
                          >
                            ＋ TIL
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromote(note.id, "TODO")}
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "8.5px",
                              fontWeight: 800,
                              background: "var(--card)",
                              border: "1px solid var(--ink)",
                              padding: "2px 6px",
                              cursor: "pointer",
                            }}
                            title="Promote to Todo item"
                          >
                            ＋ TODO
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          opacity: 0.4,
                          fontSize: "12px",
                          marginLeft: "4px",
                        }}
                        title="Delete note"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Verbatim Quote Body */}
                  {note.quote && (
                    <div>
                      <span className="quote-mark">&ldquo;</span>
                      <div className="quote-text">{note.quote}</div>
                    </div>
                  )}

                  {/* Commentary / Note Body */}
                  {note.note && <div className="note-text">{note.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TABLE OF CONTENTS MODAL ── */}
      <TableOfContentsModal
        isOpen={tocModalOpen}
        book={book}
        chapters={chapters}
        currentChapter={book.currentChapter || 1}
        resolving={resolvingToc}
        onClose={() => setTocModalOpen(false)}
        onSelectChapter={(ch) => {
          handleUpdateProgress(ch);
          setChapterInput(String(ch));
        }}
        onAutoResolveToc={handleAutoResolveToc}
      />

      {/* ── READING SYNTHESIS MODAL ── */}
      <ReadingSynthesisModal
        isOpen={synthesisModalOpen}
        book={book}
        synthesis={synthesisData}
        loading={synthesisLoading}
        onClose={() => setSynthesisModalOpen(false)}
        onRefresh={fetchSynthesis}
      />

      {/* ── CHAPTER-BY-CHAPTER BRIEFING MODAL ── */}
      <BookSummaryModal
        isOpen={summaryModalOpen}
        book={book}
        summary={book.summary || null}
        loading={summaryLoading}
        onClose={() => setSummaryModalOpen(false)}
        onGenerate={handleGenerateSummary}
      />
    </div>
  );
};
