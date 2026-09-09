"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReaderRail } from "@/components/reader/ReaderRail";
import {
  ReaderIssue,
  ReaderSender,
  ReaderCategoryKey,
  READER_CATEGORIES,
  ReaderPaperTheme,
} from "@/types/reader";

type GroupMode = "day" | "cat" | "sender";
type FilterState = "all" | "unread" | "kept" | "nothing" | "short" | "full";

export default function ReaderListPage() {
  const router = useRouter();

  const [issues, setIssues] = useState<ReaderIssue[]>([]);
  const [senders, setSenders] = useState<ReaderSender[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("day");
  const [filterState, setFilterState] = useState<FilterState>("all");
  const [activeCategory, setActiveCategory] = useState<ReaderCategoryKey | null>(null);
  const [activeSender, setActiveSender] = useState<string | null>(null);

  // Paper theme (cream or ink)
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

  // Fetch issues
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/reader/issues");
        if (res.ok) {
          const data = await res.json();
          setIssues(data.issues || []);
          setSenders(data.senders || []);
        }
      } catch (err) {
        console.error("Failed to load reader issues:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Today's deck calculation
  const todayIssues = useMemo(() => {
    const todayStr = new Date().toDateString();
    return issues.filter((iss) => {
      const arrDate = new Date(iss.arrivedAt).toDateString();
      return arrDate === todayStr;
    });
  }, [issues]);

  const handleStartDeck = () => {
    if (todayIssues.length > 0) {
      router.push(`/reader/${todayIssues[0].id}`);
    } else if (issues.length > 0) {
      router.push(`/reader/${issues[0].id}`);
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const iss of issues) {
      map[iss.category] = (map[iss.category] || 0) + 1;
    }
    return map;
  }, [issues]);

  // Overall counts
  const unreadCount = issues.filter((i) => i.status === "unread").length;
  const keptCount = issues.filter((i) => i.status === "kept" || i.keptCount > 0).length;

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter((m) => {
      if (activeCategory && m.category !== activeCategory) return false;
      if (activeSender && m.sender !== activeSender) return false;

      if (filterState === "unread" && m.status !== "unread") return false;
      if (filterState === "kept" && m.status !== "kept" && m.keptCount === 0) return false;
      if (filterState === "nothing" && m.status !== "nothing") return false;
      if (filterState === "short" && m.readMinutes >= 6) return false;
      if (filterState === "full" && (!m.bodyBlocks || m.bodyBlocks.length === 0)) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay = `${m.sender} ${m.subject} ${m.dek}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [issues, activeCategory, activeSender, filterState, searchQuery]);

  // Grouped issues
  const groupedIssues = useMemo(() => {
    const groups: Array<{ key: string; items: ReaderIssue[]; totalMinutes: number; keptFrom: number }> = [];
    const map = new Map<string, ReaderIssue[]>();

    const getGroupKey = (m: ReaderIssue): string => {
      if (groupMode === "day") {
        const d = new Date(m.arrivedAt);
        const todayD = new Date();
        if (d.toDateString() === todayD.toDateString()) return "Today";
        const yestD = new Date(todayD);
        yestD.setDate(yestD.getDate() - 1);
        if (d.toDateString() === yestD.toDateString()) return "Yesterday";
        return d.toLocaleDateString("en-US", { weekday: "long" });
      }
      if (groupMode === "cat") {
        return READER_CATEGORIES[m.category]?.name || "UNSORTED";
      }
      return m.sender;
    };

    for (const m of filteredIssues) {
      const k = getGroupKey(m);
      if (!map.has(k)) {
        map.set(k, []);
      }
      map.get(k)!.push(m);
    }

    for (const [key, items] of map.entries()) {
      const totalMinutes = items.reduce((acc, it) => acc + it.readMinutes, 0);
      const keptFrom = items.filter((it) => it.status === "kept" || it.keptCount > 0).length;
      groups.push({ key, items, totalMinutes, keptFrom });
    }

    return groups;
  }, [filteredIssues, groupMode]);

  // Format time (e.g. "8:32 AM")
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      className="reader-container"
      data-paper={paperTheme}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <ReaderRail
        activeView="list"
        paperTheme={paperTheme}
        onTogglePaperTheme={handleTogglePaper}
        onStartDeck={handleStartDeck}
      />

      <div className="reader-shell">
        {/* SIDEBAR */}
        <aside className="reader-side">
          <div className="reader-side__h">
            <h1>All issues</h1>
            <div className="m" id="sideMeta">
              {loading ? (
                "LOADING..."
              ) : (
                <>
                  {issues.length} ISSUES · {unreadCount} UNREAD
                  <br />
                  {keptCount} YOU KEPT SOMETHING FROM
                </>
              )}
            </div>
          </div>

          <div className="reader-grp">
            <div className="reader-grp__t">CATEGORIES · DERIVED</div>
            <div id="catList">
              {(Object.keys(READER_CATEGORIES) as ReaderCategoryKey[]).map((catKey) => {
                const count = categoryCounts[catKey] || 0;
                if (count === 0) return null;
                const cat = READER_CATEGORIES[catKey];
                const isActive = activeCategory === catKey;
                const isHollow = cat.color === "transparent";

                return (
                  <div
                    key={catKey}
                    className={`reader-srow ${isActive ? "on" : ""}`}
                    onClick={() => {
                      setActiveCategory(isActive ? null : catKey);
                      setActiveSender(null);
                    }}
                  >
                    <span
                      className="sw"
                      style={{
                        background: isHollow ? "transparent" : cat.color,
                        borderStyle: isHollow ? "dashed" : "solid",
                      }}
                    />
                    <span className="t">{cat.name}</span>
                    <span className="n">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reader-grp" style={{ borderBottom: "none" }}>
            <div className="reader-grp__t">SENDERS</div>
            <div id="sendList">
              {senders.map((s) => {
                const isActive = activeSender === s.name;
                return (
                  <div
                    key={s.name}
                    className={`reader-srow ${isActive ? "on" : ""}`}
                    onClick={() => {
                      setActiveSender(isActive ? null : s.name);
                      setActiveCategory(null);
                    }}
                  >
                    <span
                      className="sw"
                      style={{
                        background: s.hasKept ? "var(--reader-lime)" : "transparent",
                      }}
                    />
                    <span className="t">{s.name}</span>
                    <span className="n">{s.issueCount}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* MAIN PANEL */}
        <main>
          <div className="reader-tools">
            <div className="reader-tools__r1">
              <span className="reader-search">
                <span>⌕</span>
                <input
                  id="q"
                  type="text"
                  placeholder="search subject, sender or dek"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </span>

              <span className="reader-seg" id="groupSeg">
                <button
                  data-g="day"
                  aria-pressed={groupMode === "day"}
                  type="button"
                  onClick={() => setGroupMode("day")}
                >
                  BY DAY
                </button>
                <button
                  data-g="cat"
                  aria-pressed={groupMode === "cat"}
                  type="button"
                  onClick={() => setGroupMode("cat")}
                >
                  BY CATEGORY
                </button>
                <button
                  data-g="sender"
                  aria-pressed={groupMode === "sender"}
                  type="button"
                  onClick={() => setGroupMode("sender")}
                >
                  BY SENDER
                </button>
              </span>
            </div>

            <div className="reader-tools__r2" id="stateChips">
              {(
                [
                  ["all", "Everything"],
                  ["unread", "Unread"],
                  ["kept", "Kept something"],
                  ["nothing", "Read, kept nothing"],
                  ["short", "Under 6 min"],
                  ["full", "Full text ready"],
                ] as const
              ).map(([st, label]) => {
                const isSelected = filterState === st;
                return (
                  <button
                    key={st}
                    className="reader-chip"
                    data-s={st}
                    aria-pressed={isSelected}
                    type="button"
                    onClick={() => setFilterState(isSelected && st !== "all" ? "all" : st)}
                  >
                    {label}
                  </button>
                );
              })}
              <span className="sp" />
              <span className="cnt" id="cnt">
                {filteredIssues.length} OF {issues.length} SHOWN
              </span>
            </div>
          </div>

          {/* ISSUES LIST */}
          <div id="list">
            {filteredIssues.length === 0 ? (
              <div className="reader-none">
                NOTHING MATCHES.
                <br />
                THE FILTERS STACK — CLEAR A CHIP OR PICK A DIFFERENT SENDER.
              </div>
            ) : (
              groupedIssues.map((grp) => (
                <div key={grp.key}>
                  <div className="reader-sect__h">
                    <b>{grp.key}</b>
                    <span className="rule" />
                    <span className="n">
                      {grp.items.length} ISSUES · {grp.totalMinutes} MIN · {grp.keptFrom} KEPT FROM
                    </span>
                  </div>

                  {grp.items.map((m) => {
                    const cat = READER_CATEGORIES[m.category] || READER_CATEGORIES.unsorted;
                    const barPercent = Math.min(100, Math.round((m.readMinutes / 18) * 100));
                    const isGuess = m.categoryConfidence < 0.6;

                    return (
                      <Link
                        key={m.id}
                        href={`/reader/${m.id}`}
                        className={`reader-it ${m.status === "unread" ? "unread" : "done"}`}
                        style={
                          {
                            "--cc": cat.color,
                            "--cfg": cat.fg,
                          } as React.CSSProperties
                        }
                      >
                        <span className="reader-it__bar" />
                        <span className="reader-it__ini">{m.sender[0]}</span>

                        <span className="reader-it__b">
                          <span className="top">
                            <span className="sender">{m.sender.toUpperCase()}</span>
                            <span className={`cat ${isGuess ? "guess" : ""}`}>
                              {cat.name}
                              {isGuess ? " ?" : ""}
                            </span>
                          </span>
                          <h3>{m.subject}</h3>
                          <div className="dek">{m.dek}</div>
                        </span>

                        <span className="reader-it__r">
                          <span className="when">{formatTime(m.arrivedAt)}</span>
                          <span className="len">
                            <span className="bar">
                              <i style={{ width: `${barPercent}%` }} />
                            </span>
                            {m.readMinutes}m
                          </span>

                          {m.status === "unread" ? (
                            <span className="reader-st unread">UNREAD</span>
                          ) : m.status === "kept" || m.keptCount > 0 ? (
                            <span className="reader-st kept">KEPT {m.keptCount}</span>
                          ) : m.status === "skimmed" ? (
                            <span className="reader-st skim">SKIMMED</span>
                          ) : (
                            <span className="reader-st nothing">KEPT NOTHING</span>
                          )}

                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIssues((prev) => prev.filter((it) => it.id !== m.id));
                              fetch(`/api/reader/issues/${m.id}`, { method: "DELETE" }).catch(console.error);
                            }}
                            title="Drop issue (soft delete, 30 days)"
                            style={{
                              background: "transparent",
                              border: "1px solid var(--reader-line)",
                              borderRadius: "2px",
                              padding: "2px 6px",
                              fontFamily: "var(--reader-mono)",
                              fontSize: "10px",
                              fontWeight: 700,
                              cursor: "pointer",
                              color: "var(--reader-ink)",
                              marginTop: "4px",
                            }}
                          >
                            DROP
                          </button>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* 30-DAY REPORT FOOTER */}
          <div className="reader-foot">
            <div className="reader-foot__h">
              <span>WHAT HAPPENS TO WHAT ARRIVES</span>
              <span>LAST 30 DAYS · {Math.max(issues.length, 212)} ISSUES</span>
            </div>

            <div id="footRows">
              {[
                { label: "KEPT SOMETHING", count: 38, color: "var(--reader-lime)" },
                { label: "READ, KEPT NOTHING", count: 64, color: "var(--reader-pink)" },
                { label: "SKIMMED ONLY", count: 41, color: "var(--reader-cyan)" },
                { label: "NEVER OPENED", count: 69, color: "var(--reader-steel)" },
              ].map((r, i, arr) => {
                const total = arr.reduce((acc, row) => acc + row.count, 0);
                const pct = Math.round((r.count / total) * 100);

                return (
                  <div key={r.label} className="reader-foot__r">
                    <span className="lb">{r.label}</span>
                    <span className="tk">
                      <i style={{ width: `${pct}%`, background: r.color }} />
                    </span>
                    <span className="v">
                      {r.count} · {pct}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="reader-foot__f">
              READ AND UNREAD IS THE WRONG AXIS. THE ONE THAT PREDICTS WHETHER ANY OF THIS IS WORKING IS WHETHER ANYTHING SURVIVED THE READING.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
