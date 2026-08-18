"use client";

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { AppNav } from "@/components/AppNav";

type Energy = "DEEP" | "SHALLOW" | "ERRAND";

const ENERGY_COLOR: Record<Energy, string> = {
  DEEP: "#7C4DFF",
  SHALLOW: "#00F0FF",
  ERRAND: "#FFE600",
};

type MonthHistoryTask = {
  id: string;
  title: string;
  estimatedMinutes: number;
  actualMinutes: number | null;
  energy: Energy;
  completedOn: string;
};

type MonthHistoryDay = {
  date: string;
  tasks: MonthHistoryTask[];
  rolled: boolean;
  cleanSweep: boolean;
};

type DayRecord = {
  date: string;
  completed: MonthHistoryTask[];
  rolled: { id: string; title: string }[];
  note: string | null;
};

type CalibrationPoints = {
  overall: number | null;
  byEnergy: Record<Energy, number | null>;
  sampleCount: number;
  points: { estimated: number; actual: number; energy: Energy }[];
};

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TodoHistoryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const [days, setDays] = useState<Map<string, MonthHistoryDay>>(new Map());
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayRecord, setDayRecord] = useState<DayRecord | null>(null);
  const [dayRecordLoading, setDayRecordLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const [calibration, setCalibration] = useState<CalibrationPoints | null>(null);

  useEffect(() => {
    async function loadMonth() {
      setLoading(true);
      try {
        const res = await fetch(`/api/todos/history?year=${year}&month=${month}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setDays(new Map((data.days as MonthHistoryDay[]).map((d) => [d.date, d])));
        }
      } catch (e) {
        console.error("Failed to load month history", e);
      } finally {
        setLoading(false);
      }
    }
    loadMonth();
  }, [year, month]);

  useEffect(() => {
    async function loadCalibration() {
      try {
        const res = await fetch("/api/todos/calibration?points=true", { credentials: "include" });
        if (res.ok) setCalibration(await res.json());
      } catch (e) {
        console.error("Failed to load calibration", e);
      }
    }
    loadCalibration();
  }, []);

  const selectDay = useCallback(async (date: string) => {
    setSelectedDate(date);
    setDayRecordLoading(true);
    try {
      const res = await fetch(`/api/todos/history/day?date=${date}`, { credentials: "include" });
      if (res.ok) {
        const record: DayRecord = await res.json();
        setDayRecord(record);
        setNoteDraft(record.note ?? "");
      }
    } catch (e) {
      console.error("Failed to load day record", e);
    } finally {
      setDayRecordLoading(false);
    }
  }, []);

  const saveNote = useCallback(async () => {
    if (!selectedDate) return;
    setNoteSaving(true);
    try {
      await fetch("/api/todos/history/note", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, note: noteDraft }),
      });
      setDayRecord((prev) => (prev ? { ...prev, note: noteDraft } : prev));
    } catch (e) {
      console.error("Failed to save note", e);
    } finally {
      setNoteSaving(false);
    }
  }, [selectedDate, noteDraft]);

  const goPrevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1);
  };

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const startOffset = firstOfMonth.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: { date: string | null }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
    }
    return cells;
  }, [year, month]);

  const today = todayDateStr();

  return (
    <div className="page-scroll" style={{ background: "var(--cream)", color: "var(--ink)", fontFamily: "var(--grot)" }}>
      <header
        className="page-app-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--paper)",
          borderBottom: "var(--bd)",
          boxShadow: "var(--sh-sm)",
          padding: "10px 16px",
          paddingTop: "max(10px, env(safe-area-inset-top))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/" className="app-wordmark">HOARD</Link>
          <span style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.5 }}>/</span>
          <h1
            style={{
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 900,
              background: "var(--yel, #FFE600)",
              color: "#000",
              padding: "2px 6px",
              border: "1.5px solid var(--ink)",
              margin: 0,
            }}
          >
            HISTORY
          </h1>
        </div>
        <AppNav />
        <Link
          href="/todos"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontFamily: "var(--mono)",
            fontSize: "12px",
            fontWeight: 800,
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} /> TODAY
        </Link>
      </header>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "clamp(16px, 4vw, 32px) clamp(12px, 4vw, 24px)" }}>

        {/* Month calendar — TODOS.md §8 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <button onClick={goPrevMonth} aria-label="Previous month" style={navButtonStyle()}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontFamily: "var(--mono)", fontWeight: 800, fontSize: "14px" }}>
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <button onClick={goNextMonth} aria-label="Next month" style={navButtonStyle()}>
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.6 }}>Loading…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "24px" }}>
            {DOW.map((d, i) => (
              <div key={`${d}-${i}`} style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.5, fontWeight: 800 }}>
                {d}
              </div>
            ))}
            {calendarCells.map((cell, i) => {
              if (!cell.date) return <div key={i} />;
              const day = days.get(cell.date);
              const totalActual = day?.tasks.reduce((sum, t) => sum + (t.actualMinutes ?? t.estimatedMinutes), 0) ?? 0;
              const isSelected = selectedDate === cell.date;
              const isToday = cell.date === today;
              return (
                <button
                  key={cell.date}
                  onClick={() => selectDay(cell.date as string)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                    minHeight: "64px",
                    padding: "4px",
                    background: totalActual > 0 ? `color-mix(in oklab, var(--lime) ${Math.min(40, totalActual / 6)}%, var(--surface))` : "var(--surface)",
                    border: isSelected ? "2px solid var(--ink)" : isToday ? "2px dashed var(--ink)" : "1px solid var(--ink)",
                    cursor: "pointer",
                    position: "relative",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.6 }}>{Number(cell.date.slice(-2))}</span>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "20px", width: "100%" }}>
                    {(day?.tasks ?? []).slice(0, 8).map((t) => (
                      <div
                        key={t.id}
                        style={{
                          width: "3px",
                          height: `${Math.min(20, Math.max(3, (t.actualMinutes ?? t.estimatedMinutes) / 6))}px`,
                          background: ENERGY_COLOR[t.energy],
                        }}
                      />
                    ))}
                  </div>
                  {day?.rolled && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "3px", background: "var(--orange)" }} />}
                  {day?.cleanSweep && (
                    <div style={{ position: "absolute", top: "4px", right: "4px", width: "6px", height: "6px", borderRadius: "50%", background: "var(--lime)" }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Day record */}
        {selectedDate && (
          <div style={{ marginBottom: "32px", padding: "16px", background: "var(--surface)", border: "2px solid var(--ink)" }}>
            <div style={{ fontFamily: "var(--mono)", fontWeight: 900, fontSize: "13px", marginBottom: "12px" }}>{selectedDate}</div>
            {dayRecordLoading ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.6 }}>Loading…</div>
            ) : dayRecord ? (
              <>
                {(() => {
                  const done = dayRecord.completed.length;
                  const worked = dayRecord.completed.reduce((sum, t) => sum + (t.actualMinutes ?? 0), 0);
                  const estimated = dayRecord.completed.reduce((sum, t) => sum + t.estimatedMinutes, 0);
                  const ratio = estimated > 0 ? Math.round((worked / estimated) * 100) / 100 : null;
                  return (
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontFamily: "var(--mono)", fontSize: "12px", marginBottom: "16px" }}>
                      <span><b>{done}</b> done</span>
                      <span><b>{formatMinutes(worked)}</b> worked</span>
                      <span><b>{formatMinutes(estimated)}</b> estimated</span>
                      {ratio !== null && <span><b>{ratio}×</b> ratio</span>}
                    </div>
                  );
                })()}

                {dayRecord.completed.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    {dayRecord.completed.map((t) => {
                      const actual = t.actualMinutes;
                      const over = actual !== null && actual > t.estimatedMinutes;
                      const under = actual !== null && actual < t.estimatedMinutes;
                      return (
                        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontFamily: "var(--mono)", fontSize: "12px", padding: "4px 0", borderBottom: "1px solid var(--ink)", flexWrap: "wrap" }}>
                          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 140px" }}>{t.title}</span>
                          <span style={{ color: over ? "var(--pink)" : under ? "var(--lime)" : "inherit", opacity: actual === null ? 0.4 : 1, flexShrink: 0 }}>
                            {t.estimatedMinutes}m est · {actual !== null ? `${actual}m actual` : "no actual recorded"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {dayRecord.rolled.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, opacity: 0.6, marginBottom: "4px" }}>ROLLED</div>
                    {dayRecord.rolled.map((t) => (
                      <div key={t.id} style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--orange)" }}>{t.title}</div>
                    ))}
                  </div>
                )}

                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800, opacity: 0.6, marginBottom: "4px" }}>END-OF-DAY NOTE</div>
                  <input
                    type="text"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onBlur={saveNote}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveNote(); } }}
                    placeholder="One line. Optional."
                    disabled={noteSaving}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                      border: "1.5px solid var(--ink)",
                      background: "var(--paper)",
                      color: "var(--ink)",
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Calibration scatter — TODOS.md §8 */}
        {calibration && (
          <div style={{ padding: "16px", background: "var(--surface)", border: "2px solid var(--ink)" }}>
            <h2 style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 900, margin: "0 0 12px" }}>CALIBRATION</h2>
            {calibration.overall === null ? (
              <div style={{ fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.6 }}>
                {calibration.sampleCount}/30 samples. Need at least 30 before this means anything.
              </div>
            ) : (
              <>
                <CalibrationScatter points={calibration.points} />
                <div style={{ fontFamily: "var(--mono)", fontSize: "13px", marginTop: "12px" }}>{verdict(calibration.overall)}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function verdict(overall: number): string {
  if (overall >= 1.4) return `You're underestimating by a lot — things take ${overall}× longer than you plan for.`;
  if (overall >= 1.15) return `You're a bit optimistic — things take about ${overall}× your estimate.`;
  if (overall > 0.9) return `Pretty well calibrated — about ${overall}× your estimate on average.`;
  return `You're overestimating — things finish in about ${overall}× your estimate.`;
}

function navButtonStyle(): CSSProperties {
  return {
    background: "var(--surface)",
    border: "2px solid var(--ink)",
    cursor: "pointer",
    padding: "8px 12px",
    display: "flex",
    minWidth: "44px",
    minHeight: "44px",
    alignItems: "center",
    justifyContent: "center",
  };
}

function CalibrationScatter({ points }: { points: { estimated: number; actual: number; energy: Energy }[] }) {
  const size = 260;
  const max = Math.max(30, ...points.map((p) => Math.max(p.estimated, p.actual))) * 1.1;
  const scale = (v: number) => (v / max) * size;

  return (
    <svg
      width={size + 20}
      height={size + 20}
      viewBox={`0 0 ${size + 20} ${size + 20}`}
      style={{ maxWidth: "100%", height: "auto" }}
      role="img"
      aria-label="Estimate vs actual scatter plot"
    >
      <g transform="translate(10,10)">
        <line x1={0} y1={size} x2={size} y2={0} stroke="var(--ink)" strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
        <line x1={0} y1={size} x2={size} y2={size} stroke="var(--ink)" strokeWidth={1} opacity={0.4} />
        <line x1={0} y1={0} x2={0} y2={size} stroke="var(--ink)" strokeWidth={1} opacity={0.4} />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={scale(p.estimated)}
            cy={size - scale(p.actual)}
            r={3}
            fill={ENERGY_COLOR[p.energy]}
            stroke="var(--ink)"
            strokeWidth={0.5}
            opacity={0.8}
          />
        ))}
      </g>
    </svg>
  );
}
