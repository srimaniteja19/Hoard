"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ReaderRail } from "@/components/reader/ReaderRail";
import { ReaderIssue, ReaderKeep, ReaderPaperTheme } from "@/types/reader";

export default function ReaderReceiptPage() {
  const router = useRouter();

  const [allIssues, setAllIssues] = useState<ReaderIssue[]>([]);
  const [sessionIssueIds, setSessionIssueIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filing, setFiling] = useState(false);

  // Paper theme
  const [paperTheme, setPaperTheme] = useState<ReaderPaperTheme>("cream");

  useEffect(() => {
    const saved = localStorage.getItem("hoard-reader-paper") as ReaderPaperTheme;
    if (saved === "ink" || saved === "cream") {
      setPaperTheme(saved);
      document.documentElement.dataset.paper = saved;
    }
  }, []);

  const handleTogglePaper = (theme: ReaderPaperTheme) => {
    setPaperTheme(theme);
    localStorage.setItem("hoard-reader-paper", theme);
    document.documentElement.dataset.paper = theme;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/reader/issues");
        if (res.ok) {
          const data = await res.json();
          const issuesList: ReaderIssue[] = data.issues || [];
          setAllIssues(issuesList);

          // Get session read IDs from sessionStorage
          const raw = sessionStorage.getItem("hoard-reader-session-read");
          let readIds: string[] = raw ? JSON.parse(raw) : [];

          // If no session IDs exist yet, fallback to issues marked closed today
          if (readIds.length === 0) {
            readIds = issuesList
              .filter((i) => i.status !== "unread")
              .slice(0, 5)
              .map((i) => i.id);
          }
          setSessionIssueIds(readIds);
        }
      } catch (err) {
        console.error("Failed to load receipt data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Compute session metrics
  const sessionIssues = useMemo(() => {
    const idSet = new Set(sessionIssueIds);
    return allIssues.filter((i) => idSet.has(i.id));
  }, [allIssues, sessionIssueIds]);

  const totalMinutes = useMemo(() => {
    return sessionIssues.reduce((acc, i) => acc + (i.readMinutes || 1), 0);
  }, [sessionIssues]);

  const allKeptItems = useMemo(() => {
    const items: Array<{ issue: ReaderIssue; keep: ReaderKeep }> = [];
    for (const iss of sessionIssues) {
      for (const k of iss.keeps || []) {
        items.push({ issue: iss, keep: k });
      }
    }
    return items;
  }, [sessionIssues]);

  const claimsCount = allKeptItems.filter((x) => x.keep.kind === "CLAIM").length;
  const linksCount = allKeptItems.filter((x) => x.keep.kind === "LINK").length;
  const figuresCount = allKeptItems.filter((x) => x.keep.kind === "FIGURE").length;

  const nothingIssues = useMemo(() => {
    return sessionIssues.filter((iss) => (iss.keeps || []).length === 0);
  }, [sessionIssues]);

  const nothingMinutes = useMemo(() => {
    return nothingIssues.reduce((acc, i) => acc + (i.readMinutes || 1), 0);
  }, [nothingIssues]);

  const handleFileAll = async () => {
    setFiling(true);
    try {
      await fetch("/api/reader/file-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIssueIds }),
      });
      sessionStorage.removeItem("hoard-reader-session-read");
      router.push("/reader");
    } catch (err) {
      console.error("Failed to file everything:", err);
      router.push("/reader");
    } finally {
      setFiling(false);
    }
  };

  const handleShareHaul = () => {
    const summary = `Hoard Reader Session Haul:\n- ${sessionIssues.length} issues read (${totalMinutes} min)\n- ${allKeptItems.length} kept items (${claimsCount} claims -> TIL, ${linksCount} links -> Stacks)\n- ${nothingIssues.length} read, kept nothing`;
    navigator.clipboard?.writeText(summary);
    alert("Session summary copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="reader-container" data-paper={paperTheme} style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--reader-mono)", fontSize: "12px", opacity: 0.5 }}>
          COMPUTING RECEIPT...
        </p>
      </div>
    );
  }

  return (
    <div
      className="reader-container"
      data-paper={paperTheme}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <ReaderRail
        activeView="receipt"
        paperTheme={paperTheme}
        onTogglePaperTheme={handleTogglePaper}
      />

      <div className="reader-rec">
        <h1 id="recTitle">That&apos;s the deck</h1>
        <div className="lead" id="recLead">
          {sessionIssues.length} ISSUES · {totalMinutes} MINUTES OF MATERIAL · {allKeptItems.length} THINGS KEPT
        </div>

        {/* METRICS GRID */}
        <div className="reader-recnums" id="recNums">
          <div>
            <b>{sessionIssues.length}</b>
            <span>
              ISSUES
              <br />
              CLOSED
            </span>
          </div>

          <div className="hot">
            <b>{claimsCount}</b>
            <span>
              CLAIMS
              <br />→ TIL
            </span>
          </div>

          <div>
            <b>{linksCount}</b>
            <span>
              LINKS
              <br />→ STACKS
            </span>
          </div>

          <div>
            <b>{figuresCount}</b>
            <span>
              FIGURES
              <br />→ LIBRARY
            </span>
          </div>

          {nothingIssues.length > 0 ? (
            <div className="warn">
              <b>{nothingIssues.length}</b>
              <span>
                READ, KEPT
                <br />
                NOTHING
              </span>
            </div>
          ) : null}
        </div>

        {/* THE HAUL */}
        <div id="recKept">
          <div className="reader-recsec">
            <div className="reader-recsec__h">
              <span>THE HAUL</span>
              <span>{allKeptItems.length} ITEMS</span>
            </div>

            {allKeptItems.length === 0 ? (
              <div
                className="reader-recsec__f"
                style={{ padding: "20px 15px", borderTop: "none", background: "var(--reader-card)" }}
              >
                NOTHING SURVIVED THIS SESSION. THAT IS A RESULT, NOT A BUG — AND IT IS WORTH NOTICING WHEN IT HAPPENS TWICE IN A ROW.
              </div>
            ) : (
              allKeptItems.map((item) => {
                const borderCol =
                  item.keep.color ||
                  (item.keep.kind === "CLAIM"
                    ? "var(--reader-pink)"
                    : item.keep.kind === "LINK"
                    ? "var(--reader-cyan)"
                    : "var(--reader-violet)");

                return (
                  <div key={item.keep.id} className="reader-recrow">
                    <span className="dot" style={{ background: borderCol }} />
                    <span className="t">
                      <b>{item.keep.reason}</b>
                      <span>
                        {item.keep.kind} · {item.issue.sender.toUpperCase()}
                      </span>
                      {item.keep.quote ? (
                        <div className="q">
                          “
                          {item.keep.quote.length > 120
                            ? `${item.keep.quote.slice(0, 120)}…`
                            : item.keep.quote}
                          ”
                        </div>
                      ) : null}
                    </span>
                  </div>
                );
              })
            )}

            <div className="reader-recsec__f">
              EACH CLAIM CARRIES ITS SOURCE AND THE LINE YOU WROTE. LINKS ARRIVE IN STACKS UNFILED AND DROP IN A WEEK IF YOU DON&apos;T PLACE THEM.
            </div>
          </div>
        </div>

        {/* READ, KEPT NOTHING (First-Class Panel) */}
        <div id="recNothing">
          {nothingIssues.length > 0 ? (
            <div className="reader-recsec" style={{ boxShadow: "5px 5px 0 var(--reader-pink)" }}>
              <div className="reader-recsec__h">
                <span>READ, KEPT NOTHING</span>
                <span>
                  {nothingIssues.length} · {nothingMinutes} MIN
                </span>
              </div>

              {nothingIssues.map((m) => (
                <div key={m.id} className="reader-recrow">
                  <span className="dot" style={{ background: "transparent", borderStyle: "dashed" }} />
                  <span className="t">
                    <b>{m.subject}</b>
                    <span>
                      {m.sender.toUpperCase()} · {m.readMinutes} MIN
                    </span>
                  </span>
                </div>
              ))}

              <div className="reader-recsec__f">
                NOT A JUDGEMENT. SOME ISSUES ARE WORTH READING AND WORTH KEEPING NOTHING FROM. IT ONLY MATTERS AS A PATTERN.
              </div>
            </div>
          ) : null}
        </div>

        {/* ACTION BAR */}
        <div className="reader-recbar">
          <button
            className="prime"
            id="fileAll"
            type="button"
            disabled={filing}
            onClick={handleFileAll}
          >
            {filing ? "FILING..." : "FILE EVERYTHING ▸"}
          </button>
          <button id="recBack" type="button" onClick={() => router.push("/reader")}>
            BACK TO ALL ISSUES
          </button>
          <button type="button" onClick={handleShareHaul}>
            SHARE THE HAUL
          </button>
        </div>
      </div>
    </div>
  );
}
