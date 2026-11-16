"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Bookmark as BookmarkIcon,
  BookOpen,
  Calendar,
  CheckSquare,
  Clock,
  Eye,
  Folder,
  Globe,
  Layers,
  PenTool,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { StatsOverview, StatsRange } from "@/lib/stats/types";

const RANGE_OPTIONS: Array<{ value: StatsRange; label: string; caption: string }> = [
  { value: "30d", label: "30D", caption: "last 30 days" },
  { value: "90d", label: "90D", caption: "last 90 days" },
  { value: "all", label: "ALL", caption: "all time" },
];

const nf = new Intl.NumberFormat("en-US");

function fmtNum(n: number): string {
  return nf.format(n);
}

function fmtHours(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  if (safe < 60) return `${safe}m`;
  const h = Math.floor(safe / 60);
  const rem = safe % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function plural(n: number, one: string, many: string): string {
  return `${fmtNum(n)} ${n === 1 ? one : many}`;
}

function activityLevel(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0;
  if (total === 1) return 1;
  if (total <= 3) return 2;
  if (total <= 6) return 3;
  return 4;
}

export function StatsDashboard({ initialData }: { initialData: StatsOverview }) {
  const [data, setData] = useState<StatsOverview>(initialData);
  const [range, setRange] = useState<StatsRange>(initialData.range);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeWeekIdx, setActiveWeekIdx] = useState<number>(
    Math.max(0, initialData.weeklyFlow.length - 1)
  );
  const [activeDayIdx, setActiveDayIdx] = useState<number>(
    Math.max(0, initialData.activityDays.length - 1)
  );

  const abortRef = useRef<AbortController | null>(null);

  const loadRange = async (nextRange: StatsRange) => {
    setRange(nextRange);
    setErrorMsg(null);
    setIsRefreshing(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/stats?range=${nextRange}`, {
        credentials: "include",
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Unable to refresh stats (${res.status}).`);
      }
      const nextData: StatsOverview = await res.json();
      setData(nextData);
      setActiveWeekIdx(Math.max(0, nextData.weeklyFlow.length - 1));
      setActiveDayIdx(Math.max(0, nextData.activityDays.length - 1));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Network error while loading telemetry. Showing last loaded snapshot."
      );
    } finally {
      if (abortRef.current === controller) {
        setIsRefreshing(false);
      }
    }
  };

  const rangeCaption = RANGE_OPTIONS.find((r) => r.value === range)?.caption ?? "last 90 days";

  const isCompletelyEmpty =
    data.library.total === 0 &&
    data.synthesis.tilTotal === 0 &&
    data.notebooks.courses === 0 &&
    data.reading.booksTotal === 0 &&
    data.output.todosDoneInRange + data.output.todosOpen === 0 &&
    data.output.studioTotalPieces === 0;

  // Weekly SVG Flow Geometry
  const flowWeeks = data.weeklyFlow;
  const maxBarVal = Math.max(
    1,
    ...flowWeeks.flatMap((w) => [w.saved, w.cleared, w.tils])
  );
  const svgW = 560;
  const svgH = 152;
  const padTop = 12;
  const padBottom = 24;
  const plotH = svgH - padTop - padBottom;
  const slotW = flowWeeks.length > 0 ? svgW / flowWeeks.length : svgW;
  const selectedWeek = flowWeeks[activeWeekIdx] ?? flowWeeks[flowWeeks.length - 1];

  const tilPolylinePoints = flowWeeks
    .map((w, idx) => {
      const cx = idx * slotW + slotW / 2;
      const cy = padTop + plotH - (w.tils / maxBarVal) * plotH;
      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
    })
    .join(" ");

  const selectedDay = data.activityDays[activeDayIdx] ?? data.activityDays[data.activityDays.length - 1];
  const activity98Total = data.activityDays.reduce((s, d) => s + d.total, 0);

  const notebookTotal = data.notebooks.lessons;
  const nbWrittenPct = notebookTotal > 0 ? (data.notebooks.writtenLessons / notebookTotal) * 100 : 0;
  const nbStubPct = notebookTotal > 0 ? (data.notebooks.stubLessons / notebookTotal) * 100 : 0;
  const nbUnwrittenPct =
    notebookTotal > 0 ? (data.notebooks.watchedUnwrittenLessons / notebookTotal) * 100 : 0;

  return (
    <div className="stats-root">
      {/* Masthead */}
      <header className="stats-head">
        <div className="stats-head-copy">
          <h2 className="stats-title">Learning &amp; Library Telemetry</h2>
          <p className="stats-subtitle">
            Real intake, usage, synthesis, and output across Hoard ({data.timezone}). Inventory
            reflects your current library; flow and activity reflect {rangeCaption}.
          </p>
        </div>

        <div className="stats-head-controls">
          {isRefreshing && (
            <span className="stats-refresh-pill" role="status" aria-live="polite">
              <RefreshCw size={12} className="stats-spin" aria-hidden="true" />
              Updating…
            </span>
          )}
          <div className="stats-range-group" role="group" aria-label="Activity timeframe">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="stats-range-btn"
                aria-pressed={range === opt.value}
                disabled={isRefreshing && range !== opt.value}
                onClick={() => void loadRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Error Recovery */}
      {errorMsg && (
        <div className="stats-alert" role="alert">
          <span className="stats-alert-copy">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{errorMsg}</span>
          </span>
          <button
            type="button"
            className="stats-btn-inline"
            onClick={() => void loadRange(range)}
          >
            <RefreshCw size={12} aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {isCompletelyEmpty ? (
        <section className="stats-empty-panel" aria-label="No telemetry recorded yet">
          <h3>Your workbench has no recorded activity yet</h3>
          <p>
            Capture your first reference in Library, log a daily TIL, or start a course in
            Notebooks. Hoard will compute real usage, burn-down velocity, and synthesis ratios
            here without inventing placeholder numbers.
          </p>
          <div className="stats-empty-actions">
            <Link href="/library" className="stats-btn-inline">
              Open Library <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
            <Link href="/til" className="stats-btn-inline">
              Log a TIL <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
            <Link href="/notebooks" className="stats-btn-inline">
              Open Notebooks <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Primary Signal Strip */}
          <section className="stats-kpi-grid" aria-label="Core workbench signals">
            <article className="stats-kpi-card">
              <div className="stats-kpi-top">
                <span className="stats-kpi-label">Saved library</span>
                <span className="stats-kpi-icon" data-tone="cyan" aria-hidden="true">
                  <BookmarkIcon size={14} />
                </span>
              </div>
              <div className="stats-kpi-value">{fmtNum(data.library.total)}</div>
              <div className="stats-kpi-foot">
                <span>
                  <strong>{fmtNum(data.library.queuedCount)}</strong> queued ·{" "}
                  <strong>{fmtNum(data.library.referenceCount)}</strong> ref
                </span>
                <span>+{fmtNum(data.library.addedInRange)} in {range.toUpperCase()}</span>
              </div>
            </article>

            <article className="stats-kpi-card">
              <div className="stats-kpi-top">
                <span className="stats-kpi-label">Unread queue</span>
                <span className="stats-kpi-icon" data-tone="pink" aria-hidden="true">
                  <Clock size={14} />
                </span>
              </div>
              <div className="stats-kpi-value">{fmtNum(data.library.unreadCount)}</div>
              <div className="stats-kpi-foot">
                <span>
                  <strong>{fmtHours(data.library.unreadMins)}</strong> unread
                </span>
                <span>
                  <strong>{fmtNum(data.library.unreadQueuedCount)}</strong> queued (
                  {fmtHours(data.library.unreadQueuedMins)})
                </span>
              </div>
            </article>

            <article className="stats-kpi-card">
              <div className="stats-kpi-top">
                <span className="stats-kpi-label">Real engagement</span>
                <span className="stats-kpi-icon" data-tone="yel" aria-hidden="true">
                  <Eye size={14} />
                </span>
              </div>
              <div className="stats-kpi-value">{fmtNum(data.engagement.reachesInRange)}</div>
              <div className="stats-kpi-foot">
                <span>reaches ({rangeCaption})</span>
                <span>
                  <strong>{data.engagement.neverOpenedPct}%</strong> never opened (
                  {fmtNum(data.engagement.neverOpenedCount)})
                </span>
              </div>
            </article>

            <article className="stats-kpi-card">
              <div className="stats-kpi-top">
                <span className="stats-kpi-label">TIL discharge rate</span>
                <span className="stats-kpi-icon" data-tone="lime" aria-hidden="true">
                  <Sparkles size={14} />
                </span>
              </div>
              <div className="stats-kpi-value">{data.synthesis.dischargeRateInRange}%</div>
              <div className="stats-kpi-foot">
                <span>
                  <strong>{fmtNum(data.synthesis.tilDischargedInRange)}</strong> of{" "}
                  {fmtNum(data.synthesis.tilInRange)} TILs from queue
                </span>
                <span>
                  Streak:{" "}
                  <strong>{plural(data.synthesis.streak.currentStreak, "day", "days")}</strong>
                </span>
              </div>
            </article>
          </section>

          {/* Row 1: Queue Velocity & 14-Week Synthesis Rhythm */}
          <section className="stats-two-col" aria-label="Velocity and daily rhythm">
            <article className="stats-panel">
              <div className="stats-panel-head">
                <h3 className="stats-panel-title">
                  <TrendingUp size={16} aria-hidden="true" />
                  Queue velocity &amp; burn-down
                </h3>
                <span className="stats-panel-meta">
                  8-WEEK PACE · {data.library.readPercent}% READ ({fmtNum(data.library.readCount)}/
                  {fmtNum(data.library.total)})
                </span>
              </div>

              <div className="stats-verdict" data-status={data.velocity.status}>
                <div className="stats-verdict-headline">{data.velocity.headline}</div>
                <div className="stats-verdict-detail">{data.velocity.detail}</div>
              </div>

              {/* 8-week paired bar + TIL line chart */}
              <div className="stats-chart-frame">
                <div className="stats-chart-bar">
                  <span className="stats-panel-meta">WEEKLY FLOW (LAST 8 WEEKS)</span>
                  <div className="stats-legend">
                    <span className="stats-legend-item">
                      <i
                        className="stats-swatch"
                        style={{ background: "color-mix(in srgb, var(--cyan) 76%, var(--paper))" }}
                      />
                      Saved
                    </span>
                    <span className="stats-legend-item">
                      <i
                        className="stats-swatch"
                        style={{ background: "color-mix(in srgb, var(--lime) 82%, var(--paper))" }}
                      />
                      Cleared
                    </span>
                    <span className="stats-legend-item">
                      <i className="stats-swatch-line" style={{ background: "var(--yel)" }} />
                      TILs
                    </span>
                  </div>
                </div>

                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="stats-flow-svg"
                  role="img"
                  aria-label="Weekly saved, cleared, and TIL synthesis over the last 8 weeks"
                >
                  {[0, 0.5, 1].map((frac) => {
                    const y = padTop + plotH * (1 - frac);
                    return (
                      <line
                        key={frac}
                        x1={0}
                        x2={svgW}
                        y1={y}
                        y2={y}
                        className="stats-flow-gridline"
                      />
                    );
                  })}

                  {flowWeeks.map((w, idx) => {
                    const x0 = idx * slotW;
                    const barW = Math.min(18, Math.max(8, slotW * 0.24));
                    const gap = 4;
                    const groupStart = x0 + (slotW - (barW * 2 + gap)) / 2;

                    const savedH = (w.saved / maxBarVal) * plotH;
                    const clearedH = (w.cleared / maxBarVal) * plotH;
                    const isActive = idx === activeWeekIdx;

                    return (
                      <g
                        key={w.weekStart}
                        tabIndex={0}
                        role="button"
                        aria-label={`Week of ${w.label}: ${w.saved} saved, ${w.cleared} cleared, ${w.tils} TILs, ${w.reaches} reaches`}
                        onMouseEnter={() => setActiveWeekIdx(idx)}
                        onFocus={() => setActiveWeekIdx(idx)}
                        onClick={() => setActiveWeekIdx(idx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveWeekIdx(idx);
                          }
                        }}
                      >
                        <rect
                          x={x0 + 2}
                          y={padTop - 4}
                          width={Math.max(4, slotW - 4)}
                          height={plotH + 8}
                          rx={4}
                          className={isActive ? "stats-flow-hit stats-flow-hit-active" : "stats-flow-hit"}
                        />
                        <rect
                          x={groupStart}
                          y={padTop + plotH - savedH}
                          width={barW}
                          height={Math.max(w.saved > 0 ? 3 : 0, savedH)}
                          rx={2}
                          className="stats-flow-bar-saved"
                        />
                        <rect
                          x={groupStart + barW + gap}
                          y={padTop + plotH - clearedH}
                          width={barW}
                          height={Math.max(w.cleared > 0 ? 3 : 0, clearedH)}
                          rx={2}
                          className="stats-flow-bar-cleared"
                        />
                        <text
                          x={x0 + slotW / 2}
                          y={svgH - 6}
                          textAnchor="middle"
                          className="stats-flow-axis-label"
                        >
                          {w.label}
                        </text>
                      </g>
                    );
                  })}

                  {flowWeeks.length > 1 && (
                    <polyline points={tilPolylinePoints} className="stats-flow-til-line" />
                  )}

                  {flowWeeks.map((w, idx) => {
                    const cx = idx * slotW + slotW / 2;
                    const cy = padTop + plotH - (w.tils / maxBarVal) * plotH;
                    return (
                      <circle
                        key={`dot-${w.weekStart}`}
                        cx={cx}
                        cy={cy}
                        r={idx === activeWeekIdx ? 4.5 : 3.2}
                        className="stats-flow-til-dot"
                        pointerEvents="none"
                      />
                    );
                  })}
                </svg>

                {selectedWeek && (
                  <div className="stats-flow-readout">
                    <span className="stats-nowrap">
                      Week of <strong>{selectedWeek.label}</strong>
                    </span>
                    <span className="stats-num stats-flow-metrics">
                      <span className="stats-nowrap">
                        <strong>{selectedWeek.saved}</strong> saved
                      </span>
                      <span className="stats-nowrap">
                        <strong>{selectedWeek.cleared}</strong> cleared
                      </span>
                      <span className="stats-nowrap">
                        <strong>{selectedWeek.reaches}</strong> reaches
                      </span>
                      <span className="stats-nowrap">
                        <strong>{selectedWeek.tils}</strong> TILs
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Read vs Unread Time Bar */}
              <div>
                <div className="stats-ratio-bar" role="img" aria-label={`${data.library.readPercent}% read`}>
                  <div className="stats-ratio-fill" style={{ width: `${data.library.readPercent}%` }} />
                </div>
                <div className="stats-ratio-meta" style={{ marginTop: 8 }}>
                  <span>
                    Completed time:{" "}
                    <strong className="stats-num">{fmtHours(data.library.readMins)}</strong>
                  </span>
                  <span>
                    Backlog time:{" "}
                    <strong className="stats-num">{fmtHours(data.library.unreadMins)}</strong>
                  </span>
                </div>
              </div>
            </article>

            {/* 14-Week Synthesis & Reach Rhythm */}
            <article className="stats-panel">
              <div className="stats-panel-head">
                <h3 className="stats-panel-title">
                  <Calendar size={16} aria-hidden="true" />
                  14-week synthesis &amp; reach rhythm
                </h3>
                <Link href="/til" className="stats-link-subtle">
                  TIL archive <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>

              <div className="stats-streak-strip">
                <div className="stats-mini-stat">
                  <span>Current streak</span>
                  <strong>{plural(data.synthesis.streak.currentStreak, "day", "days")}</strong>
                </div>
                <div className="stats-mini-stat">
                  <span>Longest streak</span>
                  <strong>{plural(data.synthesis.streak.longestStreak, "day", "days")}</strong>
                </div>
                <div className="stats-mini-stat">
                  <span>98-day events</span>
                  <strong>{fmtNum(activity98Total)}</strong>
                </div>
              </div>

              <div className="stats-heatmap-wrap">
                <div className="stats-heatmap-grid" role="group" aria-label="98-day TIL and reach heatmap">
                  {data.activityDays.map((day, idx) => {
                    const level = activityLevel(day.total);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        className="stats-heat-cell"
                        data-level={level}
                        aria-pressed={activeDayIdx === idx}
                        aria-label={`${day.date}: ${day.tils} TILs, ${day.reaches} reaches`}
                        onMouseEnter={() => setActiveDayIdx(idx)}
                        onFocus={() => setActiveDayIdx(idx)}
                        onClick={() => setActiveDayIdx(idx)}
                      />
                    );
                  })}
                </div>

                <div className="stats-heatmap-foot">
                  {selectedDay ? (
                    <span className="stats-num">
                      <strong>{selectedDay.date}</strong> · {selectedDay.tils} TILs ·{" "}
                      {selectedDay.reaches} reaches
                    </span>
                  ) : (
                    <span>Select a day</span>
                  )}

                  <span className="stats-heat-scale" aria-hidden="true">
                    <span>Less</span>
                    <i style={{ background: "var(--stats-inset)" }} />
                    <i style={{ background: "color-mix(in srgb, var(--mint) 32%, var(--paper))" }} />
                    <i style={{ background: "color-mix(in srgb, var(--mint) 56%, var(--paper))" }} />
                    <i style={{ background: "color-mix(in srgb, var(--lime) 78%, var(--paper))" }} />
                    <i style={{ background: "var(--lime)" }} />
                    <span>More</span>
                  </span>
                </div>
              </div>

              {data.synthesis.tilTypes.length > 0 && (
                <div className="stats-til-chips" aria-label="TIL entry types in range">
                  {data.synthesis.tilTypes.map((t) => (
                    <span key={t.type} className="stats-til-chip">
                      <strong>{t.type}</strong>
                      <span>
                        {fmtNum(t.count)} ({t.pct}%)
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </article>
          </section>

          {/* Row 2: Closed-Loop Workbench Pulse */}
          <section className="stats-three-col" aria-label="Cross-workbench learning loop">
            {/* Notebooks Mastery */}
            <article className="stats-panel">
              <div className="stats-panel-head">
                <h3 className="stats-panel-title">
                  <Layers size={16} aria-hidden="true" />
                  Notebooks study
                </h3>
                <Link href="/notebooks" className="stats-link-subtle">
                  Open <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>

              {notebookTotal > 0 ? (
                <div
                  className="stats-stacked-bar"
                  role="img"
                  aria-label={`${data.notebooks.writtenLessons} written, ${data.notebooks.stubLessons} stub, ${data.notebooks.watchedUnwrittenLessons} watched unwritten`}
                >
                  <div
                    className="stats-stacked-seg"
                    style={{ width: `${nbWrittenPct}%`, background: "var(--mint)" }}
                    title={`Written: ${data.notebooks.writtenLessons}`}
                  />
                  <div
                    className="stats-stacked-seg"
                    style={{ width: `${nbStubPct}%`, background: "var(--yel)" }}
                    title={`Stubs: ${data.notebooks.stubLessons}`}
                  />
                  <div
                    className="stats-stacked-seg"
                    style={{ width: `${nbUnwrittenPct}%`, background: "var(--pink)" }}
                    title={`Watched, unwritten: ${data.notebooks.watchedUnwrittenLessons}`}
                  />
                </div>
              ) : null}

              <div className="stats-kv-list">
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Active courses</span>
                  <span className="stats-kv-val">{fmtNum(data.notebooks.courses)}</span>
                </div>
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Written lessons (120+ words)</span>
                  <span className="stats-kv-val">
                    {fmtNum(data.notebooks.writtenLessons)} / {fmtNum(data.notebooks.lessons)}
                  </span>
                </div>
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Watched, unwritten</span>
                  <span className="stats-kv-val">{fmtNum(data.notebooks.watchedUnwrittenLessons)}</span>
                </div>
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Notes written · collisions</span>
                  <span className="stats-kv-val">
                    {fmtNum(data.notebooks.totalWords)}w · {fmtNum(data.notebooks.collisions)}
                  </span>
                </div>
              </div>
            </article>

            {/* Reading & Marginalia */}
            <article className="stats-panel">
              <div className="stats-panel-head">
                <h3 className="stats-panel-title">
                  <BookOpen size={16} aria-hidden="true" />
                  Reading &amp; marginalia
                </h3>
                <Link href="/marginalia" className="stats-link-subtle">
                  Open <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>

              <div className="stats-kv-list">
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Books tracked</span>
                  <span className="stats-kv-val">{fmtNum(data.reading.booksTotal)}</span>
                </div>
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Currently reading</span>
                  <span className="stats-kv-val">{fmtNum(data.reading.booksReading)}</span>
                </div>
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Completed books</span>
                  <span className="stats-kv-val">{fmtNum(data.reading.booksCompleted)}</span>
                </div>
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Highlights · promoted</span>
                  <span className="stats-kv-val">
                    {fmtNum(data.reading.marginaliaCount)} ·{" "}
                    {fmtNum(data.reading.marginaliaPromotedCount)}
                  </span>
                </div>
              </div>
            </article>

            {/* Execution & Output */}
            <article className="stats-panel">
              <div className="stats-panel-head">
                <h3 className="stats-panel-title">
                  <CheckSquare size={16} aria-hidden="true" />
                  Execution &amp; output
                </h3>
                <Link href="/studio" className="stats-link-subtle">
                  Studio <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>

              <div className="stats-kv-list">
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Todos done ({range.toUpperCase()})</span>
                  <span className="stats-kv-val">
                    {fmtNum(data.output.todosDoneInRange)}{" "}
                    <span style={{ fontWeight: 400, opacity: 0.65 }}>
                      ({fmtNum(data.output.todosOpen)} open)
                    </span>
                  </span>
                </div>
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Tracked task time</span>
                  <span className="stats-kv-val">{fmtHours(data.output.focusMinutesInRange)}</span>
                </div>
                <div className="stats-kv-row">
                  <span className="stats-kv-label">Studio pipeline</span>
                  <span className="stats-kv-val">
                    {fmtNum(data.output.studioInFlight)} active · {fmtNum(data.output.studioPosted)}{" "}
                    posted
                  </span>
                </div>
                <div className="stats-kv-row">
                  <span className="stats-kv-label">
                    <PenTool size={12} aria-hidden="true" />
                    Open scraps · studio ideas
                  </span>
                  <span className="stats-kv-val">
                    {fmtNum(data.output.scratchOpen)} · {fmtNum(data.output.studioIdeasOpen)}
                  </span>
                </div>
              </div>
            </article>
          </section>

          {/* Row 3: Content Kind & Collections */}
          <section className="stats-two-col-even" aria-label="Library composition">
            <article className="stats-panel">
              <div className="stats-panel-head">
                <h3 className="stats-panel-title">Content kind breakdown</h3>
                <span className="stats-panel-meta">
                  {fmtNum(data.library.total)} ITEMS · {fmtHours(data.library.totalMins)}
                </span>
              </div>

              <div className="stats-kind-list">
                {data.kinds.map((row) => (
                  <div key={row.kind} className="stats-kind-row" data-kind={row.kind}>
                    <div className="stats-kind-label">
                      <span className="stats-kind-badge">{row.kind}</span>
                      <span>{row.name}</span>
                    </div>
                    <div className="stats-kind-bar" aria-hidden="true">
                      <div className="stats-kind-fill" style={{ width: `${row.pct}%` }} />
                    </div>
                    <div className="stats-kind-count">
                      <strong>{fmtNum(row.total)}</strong> ({row.pct}%) · {fmtHours(row.totalMins)}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="stats-panel">
              <div className="stats-panel-head">
                <h3 className="stats-panel-title">
                  <Folder size={16} aria-hidden="true" />
                  Collection shelves
                </h3>
                <Link href="/library" className="stats-link-subtle">
                  Library <ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              </div>

              {data.collections.length === 0 ? (
                <p className="stats-subtitle">No populated collections yet.</p>
              ) : (
                <div className="stats-coll-grid">
                  {data.collections.map((c) => (
                    <Link key={c.id} href="/library" className="stats-coll-card">
                      <div className="stats-coll-top">
                        <span className="stats-coll-name">
                          <span
                            className="stats-coll-dot"
                            style={{ background: c.color }}
                            aria-hidden="true"
                          />
                          {c.name}
                        </span>
                        <span className="stats-coll-count">{fmtNum(c.total)}</span>
                      </div>
                      <div className="stats-coll-sub">
                        <span>{fmtNum(c.unread)} unread</span>
                        <span>{fmtHours(c.totalMins)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </article>
          </section>

          {/* Row 4: Top Reached Sources & Coldest Unopened Items */}
          <section className="stats-two-col-even" aria-label="Sources and cold shelf">
            <article className="stats-panel">
              <div className="stats-panel-head">
                <h3 className="stats-panel-title">
                  <Globe size={16} aria-hidden="true" />
                  Most reached sources
                </h3>
                <span className="stats-panel-meta">ALL-TIME OPENS</span>
              </div>

              {data.topSources.length === 0 ? (
                <p className="stats-subtitle">No saved sources yet.</p>
              ) : (
                <ul className="stats-list">
                  {data.topSources.map((src) => (
                    <li key={src.domain} className="stats-list-row">
                      <div className="stats-item-main">
                        <span className="stats-item-title">{src.domain}</span>
                        <span className="stats-item-meta">
                          {plural(src.total, "save", "saves")} · {fmtNum(src.unread)} unread
                        </span>
                      </div>
                      <span className="stats-kv-val">{plural(src.reaches, "reach", "reaches")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="stats-panel">
              <div className="stats-panel-head">
                <h3 className="stats-panel-title">Coldest unopened saves</h3>
                <span className="stats-panel-meta">
                  {fmtNum(data.engagement.neverOpenedCount)} NEVER OPENED
                </span>
              </div>

              {data.coldestItems.length === 0 ? (
                <p className="stats-subtitle">
                  Every item in your library has been opened at least once.
                </p>
              ) : (
                <ul className="stats-list">
                  {data.coldestItems.map((item) => (
                    <li key={item.id} className="stats-list-row" data-kind={item.kind}>
                      <Link href={`/session?id=${item.id}`} className="stats-cold-link">
                        <div className="stats-item-main">
                          <span className="stats-item-title">{item.title}</span>
                          <span className="stats-item-meta">
                            {item.source} · saved {item.savedOn} · {fmtHours(item.mins)}
                          </span>
                        </div>
                        <span className="stats-kind-badge">{item.kind}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
