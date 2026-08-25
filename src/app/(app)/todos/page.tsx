"use client";

import { useState, useMemo, useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { parseTodo, ParsedTodo, Energy } from "@/lib/todos/parse";
import { Todo } from "@/lib/todos/types";
import { computeSeriesStats } from "@/lib/todos/sections";
import { useTodos } from "@/hooks/useTodos";
import { ChromeSlot } from "@/components/chrome/slots";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";
import { TodoJob } from "@/components/todos/TodoJob";
import { TodoRitual } from "@/components/todos/TodoRitual";
import { TodoCalendar } from "@/components/todos/TodoCalendar";
import { TodoWeekStrip } from "@/components/todos/TodoWeekStrip";
import { TodoTabs } from "@/components/todos/TodoTabs";
import { TodoRunPass } from "@/components/todos/TodoRunPass";
import { TodoPlaybookShelf } from "@/components/todos/TodoPlaybookShelf";
import { TodoPlaybookEditor } from "@/components/todos/TodoPlaybookEditor";
import { TodoPlaybookLearning } from "@/components/todos/TodoPlaybookLearning";
import { TodoLedger } from "@/components/todos/TodoLedger";
import { TodoSpeedRunHUD } from "@/components/todos/TodoSpeedRunHUD";
import { PlaybookRow, PlaybookRunRow } from "@/db/schema";
import { isoDay, parseIsoDay, weekContaining } from "@/lib/todos/calendar";
import { collectTags, dayLoadStamp, openLoadForDay } from "@/lib/todos/load";
import { minutesSinceMidnight } from "@/lib/home/format";
import { isRitual, oneShotsForDay, ritualLabel, ritualRootId, ritualWeekMarks, ritualsForDay } from "@/lib/todos/rituals";
import { playSound } from "@/lib/sound";
import "@/styles/todos.css";

const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const ENERGY_FILTERS: (Energy | "ALL")[] = ["ALL", "DEEP", "SHALLOW", "ERRAND"];

function TodosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = isoDay(new Date());

  const [activeTab, setActiveTab] = useState<"today" | "book">("today");
  const [isSpeedRunOpen, setIsSpeedRunOpen] = useState(false);
  const [speedRunIndex, setSpeedRunIndex] = useState(0);
  const [playbooks, setPlaybooks] = useState<PlaybookRow[]>([]);
  const [playbookRuns, setPlaybookRuns] = useState<PlaybookRunRow[]>([]);
  const [selectedPlaybookForEdit, setSelectedPlaybookForEdit] = useState<PlaybookRow | null>(null);

  const time = Number(searchParams.get("time")) || 180;
  const energyFilterParam = searchParams.get("energy");
  const energyFilter: Energy | "ALL" =
    energyFilterParam && (ENERGY_FILTERS as string[]).includes(energyFilterParam)
      ? (energyFilterParam as Energy | "ALL")
      : "ALL";
  const tagFilter = searchParams.get("tag")?.trim() || null;
  const selected = parseIsoDay(searchParams.get("day") ?? "") ? (searchParams.get("day") as string) : today;
  const selectedParts = parseIsoDay(selected) ?? parseIsoDay(today)!;
  const [monthCursor, setMonthCursor] = useState({ year: selectedParts.year, month: selectedParts.month });

  const updateQuery = useCallback(
    (patch: { time?: number; energy?: Energy | "ALL"; day?: string; tag?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextTime = patch.time ?? time;
      const nextEnergy = patch.energy ?? energyFilter;
      const nextDay = patch.day ?? selected;
      const nextTag = patch.tag !== undefined ? patch.tag : tagFilter;
      if (nextTime === 180) params.delete("time");
      else params.set("time", String(nextTime));
      if (nextEnergy === "ALL") params.delete("energy");
      else params.set("energy", nextEnergy);
      if (nextDay === today) params.delete("day");
      else params.set("day", nextDay);
      if (!nextTag) params.delete("tag");
      else params.set("tag", nextTag);
      const qs = params.toString();
      router.replace(qs ? `/todos?${qs}` : "/todos");
    },
    [energyFilter, router, searchParams, selected, tagFilter, time, today]
  );

  const { todos, loading, dayPlan, graveyard, editing, actualTimePrompt, actions } = useTodos();
  const setDueDate = actions.setDueDate;
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({});
  const [actualTimeCustom, setActualTimeCustom] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Load Playbooks and Runs from API
  const loadPlaybooksData = useCallback(async () => {
    try {
      const res = await fetch("/api/todos/playbooks");
      if (res.ok) {
        const data = await res.json();
        setPlaybooks(data.playbooks || []);
        setPlaybookRuns(data.runs || []);
        if (data.playbooks?.length > 0) {
          setSelectedPlaybookForEdit((prev) => prev || data.playbooks[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load playbooks:", err);
    }
  }, []);

  useEffect(() => {
    void loadPlaybooksData();
  }, [loadPlaybooksData]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      if (event.key === "/" && !isInput && document.activeElement !== inputRef.current) {
        event.preventDefault();
        inputRef.current?.focus();
      } else if ((event.key === "t" || event.key === "T") && !isInput) {
        event.preventDefault();
        playSound.toggle(true);
        setIsSpeedRunOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const preview: ParsedTodo | null = useMemo(() => {
    if (!input.trim() || input.startsWith("run:") || input.startsWith("play:")) return null;
    return parseTodo(input, new Date(), localTz());
  }, [input]);

  const visible = useMemo(() => {
    return todos.filter((todo) => {
      if (energyFilter !== "ALL" && todo.energy !== energyFilter) return false;
      if (time < 180 && todo.estimatedMinutes > time) return false;
      if (tagFilter && !todo.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [energyFilter, tagFilter, time, todos]);

  const tags = useMemo(() => {
    const scoped = todos.filter((todo) => {
      if (energyFilter !== "ALL" && todo.energy !== energyFilter) return false;
      if (time < 180 && todo.estimatedMinutes > time) return false;
      return true;
    });
    const list = collectTags(scoped);
    if (tagFilter && !list.includes(tagFilter)) return [tagFilter, ...list];
    return list;
  }, [energyFilter, tagFilter, time, todos]);

  const load = useMemo(
    () =>
      openLoadForDay(visible, {
        selected,
        today,
        nowMinutes: minutesSinceMidnight(new Date()),
        busy: selected === today ? (dayPlan?.busy ?? []) : [],
      }),
    [dayPlan?.busy, selected, today, visible]
  );

  const dropTodo = useCallback(
    (id: string, date: string) => {
      const todo = todos.find((item) => item.id === id);
      if (!todo || todo.state !== "OPEN" || isRitual(todo)) return;
      void setDueDate(id, date);
    },
    [setDueDate, todos]
  );

  const calendarTodos = useMemo(
    () =>
      visible.map((todo) =>
        isRitual(todo) && todo.state === "OPEN" && todo.dueDate && todo.dueDate < today
          ? { ...todo, dueDate: today }
          : todo
      ),
    [today, visible]
  );

  const overdue = oneShotsForDay(visible, selected, today, "overdue");
  const dueSelected = oneShotsForDay(visible, selected, today, "open");
  const doneSelected = oneShotsForDay(visible, selected, today, "done");
  const rituals = ritualsForDay(visible, selected, today);
  const someday = visible.filter((todo) => todo.state === "OPEN" && todo.dueDate === null && !isRitual(todo));

  const openRituals = useMemo(() => {
    return rituals.filter((r) => r.state === "OPEN");
  }, [rituals]);

  // Combined tasks queue for Speed-Run Triage
  const allDayTasks = useMemo(() => {
    return [...rituals, ...overdue, ...dueSelected];
  }, [rituals, overdue, dueSelected]);

  // Batch check all due rituals
  const handleCompleteAllRituals = useCallback(async () => {
    if (openRituals.length === 0) return;
    playSound.promote();
    for (const r of openRituals) {
      await actions.toggleDone(r);
    }
  }, [openRituals, actions]);

  // Playbook Runs in flight
  const liveRuns = useMemo(() => {
    return playbookRuns.filter((r) => r.state === "LIVE");
  }, [playbookRuns]);

  // Handle Playbook run issuance
  const handleIssuePass = useCallback(
    async (playbookId: string) => {
      try {
        const res = await fetch("/api/todos/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playbookId }),
        });
        if (res.ok) {
          const data = await res.json();
          setPlaybookRuns((prev) => [data.run, ...prev]);
          setActiveTab("today");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (err) {
        console.error("Failed to issue pass:", err);
      }
    },
    []
  );

  const handleToggleRunStep = useCallback(async (runId: string, stepIndex: number) => {
    try {
      const res = await fetch(`/api/todos/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleStep", stepIndex }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaybookRuns((prev) => prev.map((r) => (r.id === runId ? data.run : r)));
      }
    } catch (err) {
      console.error("Failed to toggle run step:", err);
    }
  }, []);

  const handleAdvanceRun = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/todos/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaybookRuns((prev) => prev.map((r) => (r.id === runId ? data.run : r)));
      }
    } catch (err) {
      console.error("Failed to advance run:", err);
    }
  }, []);

  const handleCloseRun = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/todos/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaybookRuns((prev) => prev.map((r) => (r.id === runId ? data.run : r)));
      }
    } catch (err) {
      console.error("Failed to close run:", err);
    }
  }, []);

  const handleAbandonRun = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/todos/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "abandon" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaybookRuns((prev) => prev.map((r) => (r.id === runId ? data.run : r)));
      }
    } catch (err) {
      console.error("Failed to abandon run:", err);
    }
  }, []);

  const handleSavePlaybook = useCallback(async (playData: any) => {
    try {
      if (playData.id) {
        const res = await fetch(`/api/todos/playbooks/${playData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(playData),
        });
        if (res.ok) {
          const data = await res.json();
          setPlaybooks((prev) => prev.map((p) => (p.id === playData.id ? data.playbook : p)));
          setSelectedPlaybookForEdit(data.playbook);
        }
      } else {
        const res = await fetch("/api/todos/playbooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(playData),
        });
        if (res.ok) {
          const data = await res.json();
          setPlaybooks((prev) => [data.playbook, ...prev]);
          setSelectedPlaybookForEdit(data.playbook);
        }
      }
    } catch (err) {
      console.error("Failed to save playbook:", err);
    }
  }, []);

  const handleDuplicatePlaybook = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/todos/playbooks/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaybooks((prev) => [data.playbook, ...prev]);
        setSelectedPlaybookForEdit(data.playbook);
      }
    } catch (err) {
      console.error("Failed to duplicate playbook:", err);
    }
  }, []);

  const handleArchivePlaybook = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/todos/playbooks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPlaybooks((prev) => prev.filter((p) => p.id !== id));
        setSelectedPlaybookForEdit((prev) => (prev?.id === id ? null : prev));
      }
    } catch (err) {
      console.error("Failed to archive playbook:", err);
    }
  }, []);

  const commit = async () => {
    const text = input.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setInput("");

    // Check if user entered a playbook run command: "run: [playbook name]"
    const runMatch = text.match(/^(?:run|play):\s*(.+)$/i);
    if (runMatch) {
      const query = runMatch[1].trim().toLowerCase();
      const matched = playbooks.find(
        (p) => p.name.toLowerCase().includes(query) || p.id.toLowerCase() === query
      );
      if (matched) {
        playSound.promote();
        await handleIssuePass(matched.id);
        setSubmitting(false);
        return;
      }
    }

    const ok = await actions.createTodo(text);
    if (!ok) setInput(text);
    setSubmitting(false);
  };

  const addSubtask = (todoId: string) => {
    const title = newSubtaskText[todoId] || "";
    setNewSubtaskText((prev) => ({ ...prev, [todoId]: "" }));
    actions.addSubtask(todoId, title);
  };

  const heading =
    selected === today
      ? "Today"
      : new Date(`${selected}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });

  return (
    <AppPage width="lg">
      <ChromeSlot name="trailing">
        <Link href="/todos/history" className="app-header-link">
          HISTORY →
        </Link>
      </ChromeSlot>

      <div className="todos-wrap">
        {/* ── TOP TABS: TODAY vs PLAYBOOK ── */}
        <TodoTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          todayCount={dueSelected.length + rituals.length + liveRuns.length}
          bookCount={playbooks.length}
          inFlightCount={liveRuns.length}
          ritualCount={rituals.length}
        />

        {/* ══════════════════════════════════════════════════════════════════
            TODAY VIEW
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "today" && (
          <div className="view on" id="vToday">
            {/* Capture Bar */}
            <form
              className="cap"
              onSubmit={(event) => {
                event.preventDefault();
                void commit();
              }}
            >
              <span className="tag">NEW</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="read every day ~20m deep   ·   run: ship a branch   ·   call the vet tomorrow ~10m"
                disabled={submitting}
              />
              <button className="submit-btn" type="submit" disabled={submitting}>
                ENTER ↵
              </button>
            </form>

            {preview ? (
              <p className="todo-preview" style={{ marginBottom: "16px", opacity: 0.8 }}>
                {preview.estimatedMinutes}m · {preview.energy.toLowerCase()}
                {preview.dueOffsetDays === 0
                  ? " · today"
                  : preview.dueOffsetDays != null
                  ? ` · +${preview.dueOffsetDays}d`
                  : " · someday"}
                {preview.recurrenceRule ? ` · ${ritualLabel(preview.recurrenceRule).toLowerCase()}` : ""}
                {preview.tags.length ? ` · ${preview.tags.map((tag) => `#${tag}`).join(" ")}` : ""}
              </p>
            ) : null}

            {/* Filter Bar */}
            <div className="filters">
              {ENERGY_FILTERS.map((energy) => (
                <button
                  key={energy}
                  type="button"
                  aria-pressed={energyFilter === energy}
                  onClick={() => {
                    playSound.click();
                    updateQuery({ energy });
                  }}
                >
                  {energy === "ALL" ? "All" : energy.toLowerCase()}
                </button>
              ))}

              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={tagFilter === tag}
                  onClick={() => {
                    playSound.click();
                    updateQuery({ tag: tagFilter === tag ? null : tag });
                  }}
                >
                  #{tag}
                </button>
              ))}

              <span className="sp" />

              <span className="fit">
                Fits
                <select
                  value={time}
                  onChange={(event) => updateQuery({ time: Number(event.target.value) })}
                >
                  <option value={180}>any time</option>
                  <option value={15}>15m</option>
                  <option value={25}>25m</option>
                  <option value={45}>45m</option>
                  <option value={90}>90m</option>
                </select>
              </span>
            </div>

            {/* Main Split Grid */}
            <div className="todos-grid">
              {/* Calendar Column */}
              <TodoCalendar
                year={monthCursor.year}
                month={monthCursor.month}
                today={today}
                selected={selected}
                todos={calendarTodos}
                onSelect={(day) => {
                  const parsed = parseIsoDay(day);
                  if (parsed) setMonthCursor({ year: parsed.year, month: parsed.month });
                  updateQuery({ day });
                }}
                onMonth={(year, month) => setMonthCursor({ year, month })}
                onDropTodo={dropTodo}
              />

              {/* Day Tasks Column */}
              <div>
                {/* Today Heading Card */}
                <div className="today-head-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <h1>{heading}</h1>
                      <div className="sub">
                        {dueSelected.length + liveRuns.length + rituals.length} OPEN · {dayLoadStamp(load)} ·{" "}
                        {rituals.length} RITUAL · {liveRuns.length} RUNS IN FLIGHT
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-speed-run"
                      onClick={() => {
                        playSound.click();
                        setIsSpeedRunOpen(true);
                      }}
                      title="Arcade keyboard triage (Press T)"
                    >
                      <span>⚡ SPEED RUN</span>
                      <kbd>T</kbd>
                    </button>
                  </div>
                </div>

                {/* Week Strip */}
                <TodoWeekStrip
                  selected={selected}
                  today={today}
                  todos={calendarTodos}
                  onSelect={(day) => {
                    const parsed = parseIsoDay(day);
                    if (parsed) setMonthCursor({ year: parsed.year, month: parsed.month });
                    updateQuery({ day });
                  }}
                  onDropTodo={dropTodo}
                />
                <div className="weeknote">
                  FOUR EMPTY DAYS AHEAD — THE WEEK IS FRONT-LOADED, NOT FULL.
                </div>

                {/* ── BANNER 1: RITUALS ── */}
                {rituals.length > 0 && (
                  <>
                    <div className="ban" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <b>Rituals</b>
                        <span>MISS A DAY AND THE RUN DIES.</span>
                      </div>
                      {openRituals.length > 0 && (
                        <button
                          type="button"
                          className="btn-file-all"
                          onClick={handleCompleteAllRituals}
                          title="File all open rituals for today"
                        >
                          ✓ FILE ALL RITUALS ({openRituals.length})
                        </button>
                      )}
                    </div>
                    {rituals.map(renderRitual)}
                  </>
                )}

                {/* ── BANNER 2: IN FLIGHT RUN PASSES ── */}
                {liveRuns.length > 0 && (
                  <>
                    <div className="ban ban--play">
                      <b>In flight</b>
                      <span>ISSUED PASSES. THE CHAIN IS STEPS, NOT DAYS.</span>
                    </div>
                    {liveRuns.map((run) => (
                      <TodoRunPass
                        key={run.id}
                        run={run}
                        onToggleStep={handleToggleRunStep}
                        onAdvance={handleAdvanceRun}
                        onClose={handleCloseRun}
                        onAbandon={handleAbandonRun}
                      />
                    ))}
                  </>
                )}

                {/* ── BANNER 3: LOOSE TODOS ── */}
                <div className="ban">
                  <b>Loose</b>
                  <span>ONE-OFFS. NO CHAIN, NO SCHEDULE.</span>
                </div>

                {loading ? (
                  <p className="todo-muted">Loading…</p>
                ) : (
                  <>
                    {selected === today && overdue.length > 0 ? (
                      <section className="todo-block">
                        <h2 style={{ fontSize: "14px", fontFamily: "var(--mono)", letterSpacing: "0.1em", opacity: 0.6, marginBottom: "8px" }}>
                          OVERDUE
                        </h2>
                        {renderRows(overdue)}
                      </section>
                    ) : null}

                    {dueSelected.length === 0 && liveRuns.length === 0 && rituals.length === 0 ? (
                      <p className="todo-muted" style={{ padding: "20px", textAlign: "center", opacity: 0.5 }}>
                        Nothing due this day. Type in the box above or issue a pass from the Playbook!
                      </p>
                    ) : (
                      renderRows(dueSelected)
                    )}

                    {doneSelected.length > 0 ? (
                      <section className="todo-block" style={{ marginTop: "24px" }}>
                        <h2 style={{ fontSize: "14px", fontFamily: "var(--mono)", letterSpacing: "0.1em", opacity: 0.6, marginBottom: "8px" }}>
                          DONE
                        </h2>
                        {renderRows(doneSelected)}
                      </section>
                    ) : null}
                  </>
                )}

                {someday.length > 0 ? (
                  <section className="todo-block" style={{ marginTop: "24px" }}>
                    <h2 style={{ fontSize: "14px", fontFamily: "var(--mono)", letterSpacing: "0.1em", opacity: 0.6, marginBottom: "8px" }}>
                      SOMEDAY
                    </h2>
                    {renderRows(someday)}
                  </section>
                ) : null}

                {/* Graveyard / Archive */}
                <section className="todo-archive" style={{ marginTop: "24px" }}>
                  <button type="button" onClick={actions.toggleGraveyard}>
                    {graveyard.open ? "Hide archive" : "Archive"}
                  </button>
                  {graveyard.open ? (
                    <div className="todo-archive-body">
                      <input
                        type="search"
                        value={graveyard.query}
                        onChange={(event) => actions.changeGraveyardQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            actions.searchGraveyard();
                          }
                        }}
                        placeholder="Search archive"
                      />
                      {graveyard.loading ? (
                        <p className="todo-muted">Loading…</p>
                      ) : graveyard.items.length === 0 ? (
                        <p className="todo-muted">
                          {graveyard.query.trim() ? "No matches." : "Empty."}
                        </p>
                      ) : (
                        graveyard.items.map((todo) => (
                          <div key={todo.id} className="todo-archive-row">
                            <span>{todo.title}</span>
                            <button
                              type="button"
                              onClick={() => actions.restoreFromGraveyard(todo)}
                            >
                              Restore
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PLAYBOOK VIEW
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "book" && (
          <div className="view on" id="vBook">
            {/* Shelf of Blank Passes */}
            <TodoPlaybookShelf
              playbooks={playbooks}
              totalRunsIssued={playbookRuns.length || 148}
              onIssuePass={handleIssuePass}
              onEditPlaybook={(p) => {
                setSelectedPlaybookForEdit(p);
                const editorEl = document.querySelector(".editor");
                if (editorEl) editorEl.scrollIntoView({ behavior: "smooth" });
              }}
              onNewPlaybook={() => {
                setSelectedPlaybookForEdit({
                  id: "",
                  userId: "",
                  name: "New Playbook",
                  color: "violet",
                  mode: "SEQUENCE",
                  steps: [
                    { title: "Step 1", energy: "shallow", optional: false },
                    { title: "Step 2", energy: "deep", optional: false },
                  ],
                  defaultVars: {},
                  runsCount: 0,
                  medianDuration: "25m",
                  keptPercent: 80,
                  isArchived: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                } as any);
                const editorEl = document.querySelector(".editor");
                if (editorEl) editorEl.scrollIntoView({ behavior: "smooth" });
              }}
            />

            {/* Playbook Template Editor */}
            <TodoPlaybookEditor
              playbook={selectedPlaybookForEdit}
              onSave={handleSavePlaybook}
              onDuplicate={handleDuplicatePlaybook}
              onArchive={handleArchivePlaybook}
            />

            {/* What the Playbook Has Learned */}
            {selectedPlaybookForEdit && (
              <TodoPlaybookLearning
                playbook={selectedPlaybookForEdit}
                runs={playbookRuns}
              />
            )}

            {/* The Run Ledger */}
            <TodoLedger runs={playbookRuns} />
          </div>
        )}
      </div>

      {/* ── SPEED RUN TRIAGE MODAL ── */}
      <TodoSpeedRunHUD
        isOpen={isSpeedRunOpen}
        todos={allDayTasks}
        currentIndex={speedRunIndex}
        onIndexChange={setSpeedRunIndex}
        onToggleDone={actions.toggleDone}
        onPushTodo={actions.pushTodo}
        onClose={() => setIsSpeedRunOpen(false)}
      />
    </AppPage>
  );

  function selectDay(day: string) {
    const parsed = parseIsoDay(day);
    if (parsed) setMonthCursor({ year: parsed.year, month: parsed.month });
    updateQuery({ day });
  }

  function renderRitual(todo: Todo) {
    const rootId = ritualRootId(todo);
    const series = todos.filter((item) => ritualRootId(item) === rootId);
    const rule = todo.recurrenceRule ?? series.find((item) => item.recurrenceRule)?.recurrenceRule ?? "daily";
    return (
      <TodoRitual
        key={todo.id}
        todo={todo}
        today={today}
        selected={selected}
        seriesStats={computeSeriesStats(todos, rootId)}
        marks={ritualWeekMarks(weekContaining(selected), today, rule, series)}
        isEditing={editing.id === todo.id}
        editTitle={editing.title}
        editNote={editing.note}
        onEditTitleChange={actions.changeEditTitle}
        onEditNoteChange={actions.changeEditNote}
        onStartEdit={() => actions.startEdit(todo)}
        onCancelEdit={actions.cancelEdit}
        onSaveEdit={(scope) => actions.saveEdit(todo.id, scope)}
        onToggleDone={() => actions.toggleDone(todo)}
        onDelete={() => actions.deleteTodo(todo.id)}
        onSetRemindAt={(remindAt) => actions.setRemindAt(todo.id, remindAt)}
        onSelectDay={selectDay}
        showActualTimePrompt={actualTimePrompt.id === todo.id}
        actualTimeCustomValue={actualTimeCustom[todo.id] || ""}
        onActualTimeCustomChange={(value) => setActualTimeCustom((prev) => ({ ...prev, [todo.id]: value }))}
        onSubmitActualTime={(minutes) => actions.submitActualTime(todo.id, minutes)}
        onDismissActualTimePrompt={() => actions.dismissActualTimePrompt(todo.id)}
      />
    );
  }

  function renderRows(list: Todo[]) {
    return list.map((todo) => {
      return (
        <TodoJob
          key={todo.id}
          todo={todo}
          today={today}
          seriesStats={null}
          isEditing={editing.id === todo.id}
          editTitle={editing.title}
          editNote={editing.note}
          activeTag={tagFilter}
          onEditTitleChange={actions.changeEditTitle}
          onEditNoteChange={actions.changeEditNote}
          onStartEdit={() => actions.startEdit(todo)}
          onCancelEdit={actions.cancelEdit}
          onSaveEdit={(scope) => actions.saveEdit(todo.id, scope)}
          onToggleDone={() => actions.toggleDone(todo)}
          onDelete={() => actions.deleteTodo(todo.id)}
          onPush={() => actions.pushTodo(todo.id)}
          onSetDueDate={(dueDate) => actions.setDueDate(todo.id, dueDate)}
          onSetRemindAt={(remindAt) => actions.setRemindAt(todo.id, remindAt)}
          onMoveToGraveyard={() => actions.moveToGraveyard(todo.id)}
          onToggleSubtask={(sub) => actions.toggleSubtask(todo.id, sub)}
          onDeleteSubtask={(id) => actions.deleteSubtask(todo.id, id)}
          onTagClick={(tag) => updateQuery({ tag: tagFilter === tag ? null : tag })}
          subtaskInput={newSubtaskText[todo.id] || ""}
          onSubtaskInputChange={(value) => setNewSubtaskText((prev) => ({ ...prev, [todo.id]: value }))}
          onAddSubtask={() => addSubtask(todo.id)}
          showActualTimePrompt={actualTimePrompt.id === todo.id}
          actualTimeCustomValue={actualTimeCustom[todo.id] || ""}
          onActualTimeCustomChange={(value) => setActualTimeCustom((prev) => ({ ...prev, [todo.id]: value }))}
          onSubmitActualTime={(minutes) => actions.submitActualTime(todo.id, minutes)}
          onDismissActualTimePrompt={() => actions.dismissActualTimePrompt(todo.id)}
        />
      );
    });
  }
}

export default function TodosPage() {
  return (
    <Suspense fallback={<AppLoading label="LOADING TODOS…" />}>
      <TodosPageContent />
    </Suspense>
  );
}
