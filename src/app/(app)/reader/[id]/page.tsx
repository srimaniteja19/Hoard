"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ReaderRail } from "@/components/reader/ReaderRail";
import { ReaderDeckBar } from "@/components/reader/ReaderDeckBar";
import { ReaderMargin } from "@/components/reader/ReaderMargin";
import { ReaderPopover } from "@/components/reader/ReaderPopover";
import { ReaderLinksRail } from "@/components/reader/ReaderLinksRail";
import { ReaderBlockRenderer } from "@/components/reader/ReaderBlockRenderer";
import {
  ReaderIssue,
  ReaderDensity,
  ReaderPaperTheme,
  READER_CATEGORIES,
  ReaderKeep,
  ReaderLink,
} from "@/types/reader";

export default function ReaderIssuePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const issueId = params?.id;

  const [issue, setIssue] = useState<ReaderIssue | null>(null);
  const [deckIssues, setDeckIssues] = useState<ReaderIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // Density: 1 (skim), 2 (read), 3 (study)
  const [density, setDensity] = useState<ReaderDensity>("read");

  // Paper theme
  const [paperTheme, setPaperTheme] = useState<ReaderPaperTheme>("cream");

  // Keeps for this issue
  const [keeps, setKeeps] = useState<ReaderKeep[]>([]);
  const [savedLinkTitles, setSavedLinkTitles] = useState<Set<string>>(new Set());

  // Highlight Popover state
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const pendingRangeRef = useRef<Range | null>(null);
  const issueRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when switching issues
  useEffect(() => {
    if (issueId) {
      containerRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [issueId]);

  // Session read issue tracking
  const updateSessionRead = useCallback((id: string) => {
    try {
      const raw = sessionStorage.getItem("hoard-reader-session-read");
      const readIds: string[] = raw ? JSON.parse(raw) : [];
      if (!readIds.includes(id)) {
        readIds.push(id);
        sessionStorage.setItem("hoard-reader-session-read", JSON.stringify(readIds));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Theme & density initialization
  useEffect(() => {
    const savedPaper = localStorage.getItem("hoard-reader-paper") as ReaderPaperTheme;
    if (savedPaper === "ink" || savedPaper === "cream") {
      setPaperTheme(savedPaper);
      document.documentElement.dataset.paper = savedPaper;
    }
    document.documentElement.dataset.density = "read";
  }, []);

  const handleTogglePaper = (theme: ReaderPaperTheme) => {
    setPaperTheme(theme);
    localStorage.setItem("hoard-reader-paper", theme);
    document.documentElement.dataset.paper = theme;
  };

  const handleChangeDensity = (d: ReaderDensity) => {
    setDensity(d);
    document.documentElement.dataset.density = d;
  };

  // Load all deck issues & current issue
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/reader/issues");
        if (res.ok) {
          const data = await res.json();
          const allIssues: ReaderIssue[] = data.issues || [];

          // Deck is today's issues, or fallback to all issues
          const todayStr = new Date().toDateString();
          const today = allIssues.filter((iss) => {
            const arrDate = new Date(iss.arrivedAt).toDateString();
            return arrDate === todayStr;
          });

          const currentDeck = today.length > 0 ? today : allIssues;
          // Ensure current issue is included in deck
          const hasCurrent = currentDeck.some((iss) => iss.id === issueId);
          if (!hasCurrent && allIssues.some((iss) => iss.id === issueId)) {
            const found = allIssues.find((iss) => iss.id === issueId)!;
            setDeckIssues([found, ...currentDeck]);
          } else {
            setDeckIssues(currentDeck);
          }
        }

        // Fetch single issue details
        const issueRes = await fetch(`/api/reader/issues/${issueId}`);
        if (issueRes.ok) {
          const issueData = await issueRes.json();
          setIssue(issueData.issue);
          setKeeps(issueData.issue.keeps || []);

          const linkKeeps = (issueData.issue.keeps || [])
            .filter((k: ReaderKeep) => k.kind === "LINK")
            .map((k: ReaderKeep) => k.quote || k.reason);
          setSavedLinkTitles(new Set(linkKeeps));
        }
      } catch (err) {
        console.error("Failed to load reader issue data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (issueId) {
      loadData();
    }
  }, [issueId]);

  const currentIndex = useMemo(() => {
    return deckIssues.findIndex((iss) => iss.id === issueId);
  }, [deckIssues, issueId]);

  // Close issue on leaving/advancing
  const closeCurrentIssue = useCallback(async () => {
    if (!issueId) return;
    updateSessionRead(issueId);
    try {
      await fetch(`/api/reader/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", density }),
      });
    } catch (e) {
      console.error("Failed to close issue:", e);
    }
  }, [issueId, density, updateSessionRead]);

  // Navigation handlers
  const handlePrev = useCallback(async () => {
    if (currentIndex > 0) {
      await closeCurrentIssue();
      router.push(`/reader/${deckIssues[currentIndex - 1].id}`);
    }
  }, [currentIndex, deckIssues, closeCurrentIssue, router]);

  const handleNext = useCallback(async () => {
    await closeCurrentIssue();
    if (currentIndex < deckIssues.length - 1) {
      router.push(`/reader/${deckIssues[currentIndex + 1].id}`);
    } else {
      // Finished today's deck -> go to receipt!
      router.push("/reader/receipt");
    }
  }, [currentIndex, deckIssues, closeCurrentIssue, router]);

  const handleSelectDeckIndex = useCallback(
    async (idx: number) => {
      if (idx !== currentIndex && deckIssues[idx]) {
        await closeCurrentIssue();
        router.push(`/reader/${deckIssues[idx].id}`);
      }
    },
    [currentIndex, deckIssues, closeCurrentIssue, router]
  );

  const handleBackToList = useCallback(async () => {
    await closeCurrentIssue();
    router.push("/reader");
  }, [closeCurrentIssue, router]);

  // One-keystroke DROP: soft-delete with 30-day window, NO confirm dialog, advance immediately
  const handleDrop = useCallback(async () => {
    if (!issueId) return;

    fetch(`/api/reader/issues/${issueId}`, {
      method: "DELETE",
    }).catch((err) => console.error("Failed to drop issue:", err));

    setDeckIssues((prev) => prev.filter((iss) => iss.id !== issueId));

    if (currentIndex < deckIssues.length - 1) {
      router.push(`/reader/${deckIssues[currentIndex + 1].id}`);
    } else if (currentIndex > 0) {
      router.push(`/reader/${deckIssues[currentIndex - 1].id}`);
    } else {
      router.push("/reader");
    }
  }, [issueId, currentIndex, deckIssues, router]);

  // Text selection & Highlight popover
  const triggerPopover = useCallback((text: string, rect: DOMRect) => {
    if (!issueRef.current) return;
    const hostRect = issueRef.current.getBoundingClientRect();
    const top = rect.bottom - hostRect.top + 10;
    const left = Math.max(0, Math.min(rect.left - hostRect.left, hostRect.width - 400));

    setSelectedText(text);
    setPopoverPos({ top, left });
    setPopoverOpen(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (text.length < 5) return;

      try {
        const range = sel.getRangeAt(0);
        pendingRangeRef.current = range.cloneRange();
        triggerPopover(text, range.getBoundingClientRect());
      } catch (err) {
        console.error(err);
      }
    }, 10);
  }, [triggerPopover]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA";

      if (e.key === "Escape") {
        setPopoverOpen(false);
        return;
      }

      if (isInput) return;

      if (e.key === "1") {
        handleChangeDensity("skim");
      } else if (e.key === "2") {
        handleChangeDensity("read");
      } else if (e.key === "3") {
        handleChangeDensity("study");
      } else if (e.key.toLowerCase() === "d" || e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        handleDrop();
      } else if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        handleNext();
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlePrev();
      } else if (e.key.toLowerCase() === "s") {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length >= 5) {
          e.preventDefault();
          const text = sel.toString().trim();
          try {
            const range = sel.getRangeAt(0);
            pendingRangeRef.current = range.cloneRange();
            triggerPopover(text, range.getBoundingClientRect());
          } catch (err) {
            console.error(err);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleDrop, triggerPopover]);

  // Save Keep from popover
  const handleSaveKeep = async (quote: string, reason: string) => {
    if (!issueId) return;

    // Wrap highlighted range in <mark class="kept">
    if (pendingRangeRef.current) {
      try {
        const span = document.createElement("mark");
        span.className = "kept";
        span.appendChild(pendingRangeRef.current.extractContents());
        pendingRangeRef.current.insertNode(span);
      } catch (err) {
        console.warn("Could not wrap range in mark:", err);
      }
      window.getSelection()?.removeAllRanges();
    }

    try {
      const res = await fetch(`/api/reader/issues/${issueId}/keeps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "CLAIM",
          quote,
          reason,
          color: "var(--reader-pink)",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setKeeps((prev) => [data.keep, ...prev]);
        setIssue((prev) => (prev ? { ...prev, keptCount: prev.keptCount + 1, status: "kept" } : null));
      }
    } catch (err) {
      console.error("Failed to save claim keep:", err);
    } finally {
      setPopoverOpen(false);
      pendingRangeRef.current = null;
    }
  };

  // Remove Keep
  const handleRemoveKeep = async (keepId: string) => {
    try {
      const res = await fetch(`/api/reader/keeps/${keepId}`, { method: "DELETE" });
      if (res.ok) {
        setKeeps((prev) => prev.filter((k) => k.id !== keepId));
        setIssue((prev) =>
          prev
            ? {
                ...prev,
                keptCount: Math.max(0, prev.keptCount - 1),
                status: prev.keptCount - 1 > 0 ? "kept" : "nothing",
              }
            : null
        );
      }
    } catch (err) {
      console.error("Failed to delete keep:", err);
    }
  };

  // Save link to candidate queue
  const handleSaveLink = async (link: ReaderLink) => {
    if (!issueId) return;
    setSavedLinkTitles((prev) => new Set([...prev, link.title]));

    try {
      const res = await fetch(`/api/reader/issues/${issueId}/keeps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "LINK",
          quote: link.title,
          reason: `Candidate link from ${issue?.sender || "newsletter"}: ${link.title}`,
          linkUrl: link.url,
          color: "var(--reader-cyan)",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setKeeps((prev) => [data.keep, ...prev]);
        setIssue((prev) => (prev ? { ...prev, keptCount: prev.keptCount + 1, status: "kept" } : null));
      }
    } catch (err) {
      console.error("Failed to save link keep:", err);
    }
  };

  // Save figure
  const handleKeepFigure = async (figureId: string, caption: string) => {
    if (!issueId) return;

    try {
      const res = await fetch(`/api/reader/issues/${issueId}/keeps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "FIGURE",
          quote: `Figure: ${figureId}`,
          reason: caption || "Cascade vs classifier architectural distinction",
          color: "var(--reader-violet)",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setKeeps((prev) => [data.keep, ...prev]);
        setIssue((prev) => (prev ? { ...prev, keptCount: prev.keptCount + 1, status: "kept" } : null));
      }
    } catch (err) {
      console.error("Failed to keep figure:", err);
    }
  };

  // Fetch full text for preview-only issue
  const handleFetchFullText = async () => {
    if (!issueId) return;
    try {
      const res = await fetch(`/api/reader/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch-full" }),
      });
      if (res.ok) {
        const data = await res.json();
        setIssue(data.issue);
      }
    } catch (err) {
      console.error("Failed to fetch full text:", err);
    }
  };

  if (loading) {
    return (
      <div className="reader-container" data-paper={paperTheme} style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--reader-mono)", fontSize: "12px", opacity: 0.5 }}>
          LOADING ISSUE...
        </p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="reader-container" data-paper={paperTheme} style={{ padding: "40px", textAlign: "center" }}>
        <h2>Issue not found</h2>
        <button
          type="button"
          onClick={() => router.push("/reader")}
          style={{
            fontFamily: "var(--reader-mono)",
            border: "2px solid var(--reader-ink)",
            padding: "8px 16px",
            background: "var(--reader-card)",
            cursor: "pointer",
            marginTop: "16px",
          }}
        >
          ← BACK TO ALL ISSUES
        </button>
      </div>
    );
  }

  const cat = READER_CATEGORIES[issue.category] || READER_CATEGORIES.unsorted;
  const hasFullBlocks = issue.bodyBlocks && issue.bodyBlocks.length > 0;

  const formatArrival = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      ref={containerRef}
      className="reader-container"
      data-paper={paperTheme}
      data-density={density}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <ReaderRail
        activeView="read"
        paperTheme={paperTheme}
        onTogglePaperTheme={handleTogglePaper}
      />

      <ReaderDeckBar
        deckIssues={deckIssues}
        currentIndex={currentIndex >= 0 ? currentIndex : 0}
        onSelectIndex={handleSelectDeckIndex}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <div className="reader-rshell">
        {/* LEFT MARGIN */}
        <ReaderMargin
          keeps={keeps}
          sender={issue.sender}
          onRemoveKeep={handleRemoveKeep}
        />

        {/* CENTER ISSUE CONTENT */}
        <main className="reader-issue" id="issue" ref={issueRef}>
          {/* Pre-header */}
          <div className="reader-pre">
            <span className="k" style={{ background: cat.color, color: cat.fg }}>
              {cat.name}
            </span>
            <span className="t">
              {issue.wordCount.toLocaleString()} WORDS · {issue.readMinutes} MIN
            </span>
            {issue.links && issue.links.length > 0 ? (
              <span className="dim">{issue.links.length} LINKS</span>
            ) : null}
            <span className="hit">TOUCHES 2 THINGS YOU&apos;VE SAVED</span>
          </div>

          {/* Masthead */}
          <div className="reader-masthead">
            <div className="from">
              <i style={{ background: cat.color, color: cat.fg }}>{issue.sender[0]}</i>
              <b>{issue.sender.toUpperCase()}</b>
              <span>ARRIVED {formatArrival(issue.arrivedAt)}</span>
            </div>
            <h1>{issue.subject}</h1>
            <div className="dek">{issue.dek}</div>
          </div>

          {/* Article Body */}
          {hasFullBlocks ? (
            <div onMouseUp={handleMouseUp}>
              <ReaderBlockRenderer
                blocks={issue.bodyBlocks!}
                onKeepFigure={handleKeepFigure}
              />
            </div>
          ) : (
            <div className="reader-preview-only">
              <b>Preview only</b>
              <p>
                THE FULL TEXT HASN&apos;T BEEN FETCHED FOR THIS ISSUE YET. THE DEK AND THE METADATA ARE ALL WE HAVE — WHICH IS ENOUGH TO DECIDE WHETHER IT&apos;S WORTH THE {issue.readMinutes} MINUTES.
              </p>
              <button type="button" onClick={handleFetchFullText}>
                FETCH THE FULL TEXT
              </button>
              <button
                type="button"
                onClick={() => alert(`Original external URL or inbox pointer for: ${issue.subject}`)}
              >
                OPEN ORIGINAL ↗
              </button>
            </div>
          )}

          {/* Popover */}
          <ReaderPopover
            quote={selectedText}
            position={popoverPos}
            isOpen={popoverOpen}
            onKeep={handleSaveKeep}
            onClose={() => setPopoverOpen(false)}
          />
        </main>

        {/* RIGHT RAIL (LINKS) */}
        <ReaderLinksRail
          links={issue.links || []}
          savedLinks={savedLinkTitles}
          onSaveLink={handleSaveLink}
        />
      </div>

      {/* FIXED BOTTOM ACTION BAR */}
      <div className="reader-bar-foot">
        <button className="back" id="toList" type="button" onClick={handleBackToList}>
          ← ALL ISSUES
        </button>

        <button
          className="drop-btn"
          id="dropBtn"
          type="button"
          onClick={handleDrop}
          title="Drop issue (soft delete, 30 days) [D]"
          style={{
            background: "transparent",
            border: "2px solid var(--reader-line)",
            padding: "5px 12px",
            fontFamily: "var(--reader-mono)",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
            color: "var(--reader-ink)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            letterSpacing: "0.04em",
          }}
        >
          <kbd style={{ background: "var(--reader-shade)", border: "1px solid var(--reader-line)", padding: "1px 5px", fontSize: "10px" }}>D</kbd>
          DROP
        </button>

        <span className="reader-dens" id="dens">
          <button
            data-d="skim"
            aria-pressed={density === "skim"}
            type="button"
            onClick={() => handleChangeDensity("skim")}
          >
            1 · SKIM
          </button>
          <button
            data-d="read"
            aria-pressed={density === "read"}
            type="button"
            onClick={() => handleChangeDensity("read")}
          >
            2 · READ
          </button>
          <button
            data-d="study"
            aria-pressed={density === "study"}
            type="button"
            onClick={() => handleChangeDensity("study")}
          >
            3 · STUDY
          </button>
        </span>

        <span style={{ opacity: 0.65 }}>
          <kbd>S</kbd>KEEP SELECTION
        </span>

        <span className="sp" />

        <span id="footState" style={{ opacity: 0.65 }}>
          {keeps.length > 0 ? `${keeps.length} KEPT FROM THIS ISSUE` : "NOTHING KEPT YET"}
        </span>

        <button className="done" id="doneBtn" type="button" onClick={handleNext}>
          DONE · NEXT ▸
        </button>
      </div>
    </div>
  );
}
