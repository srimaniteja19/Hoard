"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseTodo, ParsedTodo, Energy } from "@/lib/todos/parse";
import { X, Trash2, Plus, ArrowRight, ChevronDown, ChevronUp, Pencil } from "lucide-react";

const GRAVEYARD_THRESHOLD = 10;

type Subtask = { id: string; title: string; done: boolean; position: number };

type Todo = {
  id: string;
  title: string;
  note: string | null;
  energy: Energy;
  estimatedMinutes: number;
  actualMinutes: number | null;
  dueDate: string | null;
  rolloverCount: number;
  remindAt: string | null;
  recurrenceRule: string | null;
  recurrenceParentId: string | null;
  seriesPosition: number | null;
  state: "OPEN" | "DONE" | "DROPPED" | "GRAVEYARD";
  completedAt: string | null;
  tags: string[];
  subtasks: Subtask[];
};

const ENERGY_COLOR: Record<Todo["energy"], string> = {
  DEEP: "#7C4DFF",
  SHALLOW: "#00F0FF",
  ERRAND: "#FFE600",
};

const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const ENERGY_FILTERS: (Energy | "ALL")[] = ["ALL", "DEEP", "SHALLOW", "ERRAND"];

/** "YYYY-MM-DD" for the browser's local today — sectioning is a client-side
 * read-time grouping over already-fetched todos, same as everywhere else on
 * this page; the stored dueDate itself was computed server-side from the
 * account's timezone at creation time (TODOS.md §2). */
function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" for an ISO timestamp, in the browser's local time. */
function localDateFromIso(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(fromDateStr: string, toDateStr: string): number {
  const from = new Date(`${fromDateStr}T00:00:00Z`);
  const to = new Date(`${toDateStr}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

type SeriesStats = { done: number; missed: number; run: number };

/** "standup notes, 47 done, 3 missed, 14-day run" — TODOS.md §5. Computed
 * from the already-fetched list (every non-graveyard instance in the
 * series), not a separate query — same client-side-grouping approach as
 * the section computation above. */
function computeSeriesStats(allTodos: Todo[], rootId: string): SeriesStats {
  const series = allTodos
    .filter((t) => t.id === rootId || t.recurrenceParentId === rootId)
    .sort((a, b) => (a.seriesPosition ?? 0) - (b.seriesPosition ?? 0));

  const done = series.filter((t) => t.state === "DONE").length;
  const missed = series.filter((t) => t.state === "DROPPED").length;

  let run = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].state === "DONE") run++;
    else if (series[i].state === "OPEN") continue; // the current open instance doesn't break a run
    else break;
  }

  return { done, missed, run };
}

function TodosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const time = Number(searchParams.get("time")) || 180;
  const energyFilterParam = searchParams.get("energy");
  const energyFilter: Energy | "ALL" =
    energyFilterParam && (ENERGY_FILTERS as string[]).includes(energyFilterParam)
      ? (energyFilterParam as Energy | "ALL")
      : "ALL";

  const updateFilters = useCallback(
    (nextTime: number, nextEnergy: Energy | "ALL") => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTime === 180) params.delete("time"); else params.set("time", String(nextTime));
      if (nextEnergy === "ALL") params.delete("energy"); else params.set("energy", nextEnergy);
      const qs = params.toString();
      router.replace(qs ? `/todos?${qs}` : "/todos");
    },
    [router, searchParams]
  );

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const [graveyardOpen, setGraveyardOpen] = useState(false);
  const [graveyardItems, setGraveyardItems] = useState<Todo[]>([]);
  const [graveyardLoading, setGraveyardLoading] = useState(false);
  const [graveyardLoaded, setGraveyardLoaded] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/todos", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setTodos(data.items || []);
        }
      } catch (e) {
        console.error("Failed to load todos", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // "/" focuses the capture bar from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Pure derivation from `input` — no effect needed, matches the parser's
  // own contract as a synchronous pure function.
  const preview: ParsedTodo | null = useMemo(() => {
    if (!input.trim()) return null;
    return parseTodo(input, new Date(), localTz());
  }, [input]);

  const commit = useCallback(async () => {
    const text = input.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setInput("");
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const created = await res.json();
        setTodos((prev) => [created, ...prev]);
      } else {
        setInput(text); // restore on failure so nothing is silently lost
      }
    } catch (e) {
      console.error("Failed to create todo", e);
      setInput(text);
    } finally {
      setSubmitting(false);
    }
  }, [input, submitting]);

  const toggleDone = useCallback(async (todo: Todo) => {
    const nextState = todo.state === "DONE" ? "OPEN" : "DONE";
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, state: nextState } : t)));
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState }),
      });
      if (res.ok) {
        const { nextInstance, ...updated } = await res.json();
        setTodos((prev) => {
          const next = prev.map((t) => (t.id === todo.id ? updated : t));
          // Recurrence generates exactly one successor on completion
          // (TODOS.md §5) — surface it immediately, don't wait on a reload.
          return nextInstance ? [nextInstance, ...next] : next;
        });
      }
    } catch (e) {
      console.error("Failed to toggle todo", e);
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    const prevTodos = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) setTodos(prevTodos);
    } catch (e) {
      console.error("Failed to delete todo", e);
      setTodos(prevTodos);
    }
  }, [todos]);

  const addSubtask = useCallback(async (todoId: string) => {
    const title = (newSubtaskText[todoId] || "").trim();
    if (!title) return;
    setNewSubtaskText((prev) => ({ ...prev, [todoId]: "" }));
    try {
      const res = await fetch(`/api/todos/${todoId}/subtasks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const subtask = await res.json();
        setTodos((prev) =>
          prev.map((t) => (t.id === todoId ? { ...t, subtasks: [...t.subtasks, subtask] } : t))
        );
      }
    } catch (e) {
      console.error("Failed to add subtask", e);
    }
  }, [newSubtaskText]);

  const toggleSubtask = useCallback(async (todoId: string, subtask: Subtask) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtask.id ? { ...s, done: !s.done } : s)) }
          : t
      )
    );
    try {
      await fetch(`/api/todos/${todoId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !subtask.done }),
      });
    } catch (e) {
      console.error("Failed to toggle subtask", e);
    }
  }, []);

  const deleteSubtask = useCallback(async (todoId: string, subtaskId: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === todoId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t))
    );
    try {
      await fetch(`/api/todos/${todoId}/subtasks/${subtaskId}`, { method: "DELETE", credentials: "include" });
    } catch (e) {
      console.error("Failed to delete subtask", e);
    }
  }, []);

  // The → action. rolloverCount only ever moves here — TODOS.md §4: no cron,
  // no background job, only this explicit push.
  const pushTodo = useCallback(async (todoId: string) => {
    try {
      const res = await fetch(`/api/todos/${todoId}/push`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const updated = await res.json();
        setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, ...updated } : t)));
      }
    } catch (e) {
      console.error("Failed to push todo", e);
    }
  }, []);

  const moveToGraveyard = useCallback(async (todoId: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    try {
      await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "GRAVEYARD" }),
      });
      setGraveyardLoaded(false); // next expand re-fetches, picking this up
    } catch (e) {
      console.error("Failed to move todo to graveyard", e);
    }
  }, []);

  const loadGraveyard = useCallback(async () => {
    setGraveyardLoading(true);
    try {
      const res = await fetch("/api/todos?graveyard=true", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setGraveyardItems(data.items || []);
        setGraveyardLoaded(true);
      }
    } catch (e) {
      console.error("Failed to load graveyard", e);
    } finally {
      setGraveyardLoading(false);
    }
  }, []);

  const toggleGraveyard = useCallback(() => {
    const next = !graveyardOpen;
    setGraveyardOpen(next);
    if (next && !graveyardLoaded) loadGraveyard();
  }, [graveyardOpen, graveyardLoaded, loadGraveyard]);

  const restoreFromGraveyard = useCallback(async (todo: Todo) => {
    setGraveyardItems((prev) => prev.filter((t) => t.id !== todo.id));
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "OPEN" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTodos((prev) => [updated, ...prev]);
      }
    } catch (e) {
      console.error("Failed to restore todo", e);
    }
  }, []);

  const startEdit = useCallback((todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
  }, []);

  // Recurrence edit scopes — TODOS.md §5: "this one" only touches the
  // instance being edited; "this and future" also updates the series root's
  // template fields, so later-generated instances pick up the change. Past
  // completed instances are never rewritten either way.
  const saveEdit = useCallback(
    async (todoId: string, scope: "one" | "future") => {
      const title = editTitle.trim();
      if (!title) return;
      setEditingId(null);
      setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, title } : t)));
      try {
        const res = await fetch(`/api/todos/${todoId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, applyToFutureInstances: scope === "future" }),
        });
        if (res.ok) {
          const updated = await res.json();
          setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, ...updated } : t)));
        }
      } catch (e) {
        console.error("Failed to save edit", e);
      }
    },
    [editTitle]
  );

  const today = localToday();
  const weekEnd = addDaysToDateStr(today, 7);

  const filtered = todos.filter((t) => {
    if (energyFilter !== "ALL" && t.energy !== energyFilter) return false;
    if (time < 180 && t.estimatedMinutes > time) return false;
    return true;
  });

  const overdue = filtered.filter((t) => t.state === "OPEN" && t.dueDate !== null && t.dueDate < today);
  const dueToday = filtered.filter((t) => t.state === "OPEN" && t.dueDate === today);
  const thisWeek = filtered.filter((t) => t.state === "OPEN" && t.dueDate !== null && t.dueDate > today && t.dueDate <= weekEnd);
  const later = filtered.filter((t) => t.state === "OPEN" && t.dueDate !== null && t.dueDate > weekEnd);
  const someday = filtered.filter((t) => t.state === "OPEN" && t.dueDate === null);
  const doneToday = filtered.filter((t) => t.state === "DONE" && t.completedAt !== null && localDateFromIso(t.completedAt) === today);

  const sumMinutes = (list: Todo[]) => list.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const sectionTitle = (label: string, list: Todo[]) => `${label} · ${list.length} · ${formatMinutes(sumMinutes(list))}`;

  const totalOpen = todos.filter((t) => t.state === "OPEN").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", color: "var(--ink)", fontFamily: "var(--sans, var(--grot))" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontFamily: "var(--grot)", fontWeight: 900, fontSize: "28px", marginBottom: "24px" }}>
          TODOS
        </h1>

        {/* Capture bar */}
        <div style={{ marginBottom: "8px" }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder="Call the vet tomorrow ~10m #home"
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: "16px",
              fontFamily: "var(--mono)",
              background: "var(--yel)",
              border: "var(--bd)",
              boxShadow: "var(--sh)",
              outline: "none",
            }}
          />
        </div>

        {/* Live parse preview */}
        <div style={{ minHeight: "28px", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          {preview && (
            <>
              <Chip label={`${preview.estimatedMinutes} min`} />
              <Chip label={preview.energy} color={ENERGY_COLOR[preview.energy]} />
              {preview.dueOffsetDays !== null && (
                <Chip label={preview.dueOffsetDays === 0 ? "today" : `+${preview.dueOffsetDays}d`} />
              )}
              {preview.remindAtLocal && <Chip label={`⏰ ${preview.remindAtLocal}`} />}
              {preview.recurrenceRule && <Chip label={preview.recurrenceRule} />}
              {preview.urgent && <Chip label="URGENT" color="#FF007A" />}
              {preview.tags.map((tag) => (
                <Chip key={tag} label={`#${tag}`} />
              ))}
            </>
          )}
        </div>

        {/* Time slider + energy chips — mirrors the bookmark library's
            TimeContextBar. URL state via useSearchParams/router.replace,
            matching the pattern already established in /til rather than
            introducing nuqs, which isn't used anywhere else in the app. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
            padding: "12px 16px",
            marginBottom: "24px",
            background: "var(--surface)",
            border: "2px solid var(--ink)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 800 }}>
            <label htmlFor="time-slider">I HAVE</label>
            <input
              id="time-slider"
              type="range"
              min={5}
              max={180}
              step={5}
              value={time}
              onChange={(e) => updateFilters(Number(e.target.value), energyFilter)}
            />
            <b>{time >= 180 ? "ANY TIME" : formatMinutes(time)}</b>
          </div>

          <div style={{ display: "flex", gap: "4px" }}>
            {ENERGY_FILTERS.map((e) => (
              <button
                key={e}
                onClick={() => updateFilters(time, e)}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  border: "2px solid var(--ink)",
                  cursor: "pointer",
                  background: energyFilter === e ? (e === "ALL" ? "var(--ink)" : ENERGY_COLOR[e as Energy]) : "var(--surface)",
                  color: energyFilter === e && e === "ALL" ? "var(--paper)" : "var(--ink)",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.6 }}>Loading…</div>
        ) : totalOpen === 0 ? (
          <EmptyState text="Nothing left for today. That's the whole point." />
        ) : (
          <>
            {overdue.length > 0 && (
              <Section title={sectionTitle("OVERDUE", overdue)}>{renderRows(overdue)}</Section>
            )}
            <Section title={sectionTitle("TODAY", dueToday)}>
              {dueToday.length === 0 ? <EmptyState text="Nothing due today." /> : renderRows(dueToday)}
            </Section>
            {thisWeek.length > 0 && (
              <Section title={sectionTitle("THIS WEEK", thisWeek)}>{renderRows(thisWeek)}</Section>
            )}
            {later.length > 0 && <Section title={sectionTitle("LATER", later)}>{renderRows(later)}</Section>}
            {someday.length > 0 && (
              <Section title={sectionTitle("SOMEDAY", someday)}>{renderRows(someday)}</Section>
            )}
            {doneToday.length > 0 && (
              <Section title={sectionTitle("DONE TODAY", doneToday)}>{renderRows(doneToday)}</Section>
            )}
          </>
        )}

        {/* Graveyard — excluded from every default view and count above;
            only ever surfaced here, on request, per TODOS.md §4. */}
        <div style={{ marginTop: "16px", borderTop: "2px solid var(--ink)", paddingTop: "12px" }}>
          <button
            onClick={toggleGraveyard}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--mono)",
              fontSize: "12px",
              fontWeight: 800,
              opacity: 0.6,
              padding: 0,
            }}
          >
            {graveyardOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            GRAVEYARD
          </button>

          {graveyardOpen && (
            <div style={{ marginTop: "12px" }}>
              {graveyardLoading ? (
                <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.6 }}>Loading…</div>
              ) : graveyardItems.length === 0 ? (
                <EmptyState text="Nothing here." />
              ) : (
                <>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "13px", marginBottom: "12px" }}>
                    {graveyardItems.length} thing{graveyardItems.length === 1 ? "" : "s"} here. Do any of them still
                    matter?
                  </div>
                  {graveyardItems.map((todo) => (
                    <div
                      key={todo.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        marginBottom: "8px",
                        background: "var(--surface)",
                        border: "2px solid var(--ink)",
                        opacity: 0.7,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>{todo.title}</div>
                      <Chip label={`MOVED ${todo.rolloverCount}×`} color="var(--orange)" />
                      <button
                        onClick={() => restoreFromGraveyard(todo)}
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "4px 10px",
                          border: "2px solid var(--ink)",
                          background: "var(--lime)",
                          cursor: "pointer",
                        }}
                      >
                        RESTORE
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function renderRows(list: Todo[]) {
    return list.map((todo) => {
      const isRecurring = Boolean(todo.recurrenceRule || todo.recurrenceParentId);
      const rootId = todo.recurrenceParentId ?? todo.id;
      return (
        <TodoRow
          key={todo.id}
          todo={todo}
          today={today}
          seriesStats={isRecurring ? computeSeriesStats(todos, rootId) : null}
          isEditing={editingId === todo.id}
          editTitle={editTitle}
          onEditTitleChange={setEditTitle}
          onStartEdit={() => startEdit(todo)}
          onCancelEdit={cancelEdit}
          onSaveEdit={(scope) => saveEdit(todo.id, scope)}
          onToggleDone={() => toggleDone(todo)}
          onDelete={() => deleteTodo(todo.id)}
          onPush={() => pushTodo(todo.id)}
          onMoveToGraveyard={() => moveToGraveyard(todo.id)}
          onToggleSubtask={(s) => toggleSubtask(todo.id, s)}
          onDeleteSubtask={(sId) => deleteSubtask(todo.id, sId)}
          subtaskInput={newSubtaskText[todo.id] || ""}
          onSubtaskInputChange={(v) => setNewSubtaskText((prev) => ({ ...prev, [todo.id]: v }))}
          onAddSubtask={() => addSubtask(todo.id)}
        />
      );
    });
  }
}

export default function TodosPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: "48px", textAlign: "center", fontFamily: "var(--mono)" }}>LOADING TODOS…</div>}
    >
      <TodosPageContent />
    </Suspense>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "12px",
          fontWeight: 900,
          letterSpacing: "0.08em",
          borderBottom: "2px solid var(--ink)",
          paddingBottom: "6px",
          marginBottom: "12px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.6, padding: "16px 0" }}>{text}</div>
  );
}

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--mono)",
        fontSize: "11px",
        fontWeight: 800,
        padding: "3px 8px",
        border: "2px solid var(--ink)",
        background: color || "var(--surface)",
        color: color ? "#000" : "var(--ink)",
      }}
    >
      {label}
    </span>
  );
}

function editButtonStyle(): CSSProperties {
  return {
    fontFamily: "var(--mono)",
    fontSize: "10px",
    fontWeight: 800,
    padding: "4px 8px",
    border: "2px solid var(--ink)",
    background: "var(--surface)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function TodoRow({
  todo,
  today,
  seriesStats,
  isEditing,
  editTitle,
  onEditTitleChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleDone,
  onDelete,
  onPush,
  onMoveToGraveyard,
  onToggleSubtask,
  onDeleteSubtask,
  subtaskInput,
  onSubtaskInputChange,
  onAddSubtask,
}: {
  todo: Todo;
  today: string;
  seriesStats: SeriesStats | null;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (scope: "one" | "future") => void;
  onToggleDone: () => void;
  onDelete: () => void;
  onPush: () => void;
  onMoveToGraveyard: () => void;
  onToggleSubtask: (s: Subtask) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  subtaskInput: string;
  onSubtaskInputChange: (v: string) => void;
  onAddSubtask: () => void;
}) {
  const isStale = todo.rolloverCount >= 3;
  const isOverdue = todo.state === "OPEN" && todo.dueDate !== null && todo.dueDate < today;
  const daysOverdue = isOverdue ? daysBetween(todo.dueDate as string, today) : 0;
  const offerGraveyard = todo.state === "OPEN" && todo.rolloverCount >= GRAVEYARD_THRESHOLD;

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px",
        marginBottom: "8px",
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderLeft: isStale ? "6px solid var(--orange)" : "2px solid var(--ink)",
        opacity: todo.state === "DONE" ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={todo.state === "DONE"}
        onChange={onToggleDone}
        style={{ width: "20px", height: "20px", marginTop: "2px", flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSaveEdit("one");
                } else if (e.key === "Escape") {
                  onCancelEdit();
                }
              }}
              autoFocus
              style={{
                flex: 1,
                minWidth: "160px",
                padding: "4px 6px",
                fontFamily: "var(--mono)",
                fontSize: "14px",
                border: "2px solid var(--ink)",
                background: "var(--paper)",
                color: "var(--ink)",
              }}
            />
            <button onClick={() => onSaveEdit("one")} style={editButtonStyle()}>
              THIS ONE
            </button>
            <button onClick={() => onSaveEdit("future")} style={editButtonStyle()}>
              THIS AND FUTURE
            </button>
            <button onClick={onCancelEdit} style={editButtonStyle()}>
              CANCEL
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                textDecoration: todo.state === "DONE" ? "line-through" : "none",
              }}
            >
              {todo.title}
            </span>
            {Boolean(todo.recurrenceRule || todo.recurrenceParentId) && (
              <button
                onClick={onStartEdit}
                aria-label="Edit recurring task"
                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, display: "flex" }}
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        )}

        {seriesStats && (
          <div style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.6, marginBottom: "6px" }}>
            {seriesStats.done} done · {seriesStats.missed} missed ·{" "}
            {seriesStats.run}
            {todo.recurrenceRule === "daily" ? "-day" : ""}-run
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: todo.subtasks.length ? "8px" : 0 }}>
          <Chip label={`${todo.estimatedMinutes} min`} />
          <Chip label={todo.energy} color={ENERGY_COLOR[todo.energy]} />
          {todo.dueDate && <Chip label={todo.dueDate} />}
          {isOverdue && (
            <Chip label={`${daysOverdue} DAY${daysOverdue === 1 ? "" : "S"} OVERDUE`} color="var(--pink)" />
          )}
          {todo.recurrenceRule && <Chip label={todo.recurrenceRule} />}
          {isStale && <Chip label={`MOVED ${todo.rolloverCount}×`} color="var(--orange)" />}
          {todo.tags.map((t) => (
            <Chip key={t} label={`#${t}`} />
          ))}
          {todo.state === "OPEN" && (
            <button
              onClick={onPush}
              title="Push to tomorrow"
              aria-label="Push to tomorrow"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                padding: "3px 8px",
                border: "2px solid var(--ink)",
                background: "var(--surface)",
                cursor: "pointer",
              }}
            >
              <ArrowRight size={11} /> TOMORROW
            </button>
          )}
        </div>

        {offerGraveyard && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              padding: "6px 8px",
              marginBottom: "8px",
              background: "var(--cream)",
              border: "1px dashed var(--orange)",
            }}
          >
            <span>Moved {todo.rolloverCount} times. Does this still matter?</span>
            <button
              onClick={onMoveToGraveyard}
              style={{
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 800,
                padding: "3px 8px",
                border: "2px solid var(--ink)",
                background: "var(--orange)",
                cursor: "pointer",
              }}
            >
              GRAVEYARD IT
            </button>
          </div>
        )}

        {todo.subtasks.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0 4px 8px" }}>
            <input type="checkbox" checked={s.done} onChange={() => onToggleSubtask(s)} style={{ width: "14px", height: "14px" }} />
            <span style={{ fontSize: "13px", textDecoration: s.done ? "line-through" : "none", flex: 1 }}>{s.title}</span>
            <button
              onClick={() => onDeleteSubtask(s.id)}
              style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, display: "flex" }}
              aria-label="Delete subtask"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", paddingLeft: "8px" }}>
          <Plus size={12} style={{ opacity: 0.5 }} />
          <input
            type="text"
            value={subtaskInput}
            onChange={(e) => onSubtaskInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddSubtask();
              }
            }}
            placeholder="Add subtask…"
            style={{
              border: "none",
              borderBottom: "1px solid var(--ink)",
              background: "transparent",
              fontSize: "12px",
              fontFamily: "var(--mono)",
              color: "var(--ink)",
              outline: "none",
              flex: 1,
              minWidth: 0,
              padding: "2px 0",
            }}
          />
        </div>
      </div>

      <button
        onClick={onDelete}
        style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, alignSelf: "flex-start", display: "flex" }}
        aria-label="Delete todo"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
