"use client";

import { useState, useMemo, useCallback, useRef, useEffect, Suspense, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { parseTodo, ParsedTodo, Energy } from "@/lib/todos/parse";
import { Todo, Subtask } from "@/lib/todos/types";
import { sectionTodos, computeSeriesStats, SeriesStats } from "@/lib/todos/sections";
import { deriveTodoFlags } from "@/lib/todos/rowState";
import { useTodos } from "@/hooks/useTodos";
import { X, Trash2, Plus, ArrowRight, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { ChromeSlot } from "@/components/chrome/slots";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";

const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const ENERGY_FILTERS: (Energy | "ALL")[] = ["ALL", "DEEP", "SHALLOW", "ERRAND"];

const ENERGY_COLOR: Record<Todo["energy"], string> = {
  DEEP: "#7C4DFF",
  SHALLOW: "#00F0FF",
  ERRAND: "#FFE600",
};

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

function formatRemindAt(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
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

  const { todos, loading, dayPlan, graveyard, editing, actualTimePrompt, actions } = useTodos();

  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({});
  const [actualTimeCustom, setActualTimeCustom] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

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

  const commit = async () => {
    const text = input.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setInput("");
    const ok = await actions.createTodo(text);
    if (!ok) setInput(text); // restore on failure so nothing is silently lost
    setSubmitting(false);
  };

  const addSubtask = (todoId: string) => {
    const title = newSubtaskText[todoId] || "";
    setNewSubtaskText((prev) => ({ ...prev, [todoId]: "" }));
    actions.addSubtask(todoId, title);
  };

  const today = localToday();
  const sections = sectionTodos(todos, { today, time, energyFilter });

  const sumMinutes = (list: Todo[]) => list.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const sectionTitle = (label: string, list: Todo[]) => `${label} · ${list.length} · ${formatMinutes(sumMinutes(list))}`;

  return (
    <AppPage width="sm">
      <ChromeSlot name="trailing">
        <Link href="/todos/history" className="app-header-link">
          HISTORY →
        </Link>
      </ChromeSlot>

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

        {/* Day plan — TODOS.md §7: busy blocks, gaps, greedy-fill, shortfall warning */}
        {dayPlan && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "24px",
              background: "var(--surface)",
              border: "2px solid var(--ink)",
              fontFamily: "var(--mono)",
              fontSize: "12px",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: "6px" }}>
              TODAY&apos;S PLAN · {formatMinutes(dayPlan.freeMinutes)} FREE
            </div>
            {dayPlan.busy.length > 0 && (
              <div style={{ opacity: 0.7, marginBottom: "4px" }}>
                Busy: {dayPlan.busy.map((b) => `${b.title} (${b.start}–${b.end})`).join(", ")}
              </div>
            )}
            {dayPlan.unfitted.length > 0 ? (
              <div style={{ color: "var(--pink)", fontWeight: 700 }}>
                {dayPlan.unfitted.length} task{dayPlan.unfitted.length === 1 ? "" : "s"} (
                {formatMinutes(dayPlan.unfitted.reduce((sum, t) => sum + t.estimatedMinutes, 0))}) won&apos;t fit
                today. Move them now rather than at midnight.
              </div>
            ) : dayPlan.packed.length > 0 ? (
              <div style={{ opacity: 0.7 }}>Everything due today fits.</div>
            ) : null}
          </div>
        )}

        {loading ? (
          <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.6 }}>Loading…</div>
        ) : sections.totalOpen === 0 ? (
          <EmptyState text="Nothing left for today. That's the whole point." />
        ) : (
          <>
            {sections.overdue.length > 0 && (
              <Section title={sectionTitle("OVERDUE", sections.overdue)}>{renderRows(sections.overdue)}</Section>
            )}
            <Section title={sectionTitle("TODAY", sections.dueToday)}>
              {sections.dueToday.length === 0 ? <EmptyState text="Nothing due today." /> : renderRows(sections.dueToday)}
            </Section>
            {sections.thisWeek.length > 0 && (
              <Section title={sectionTitle("THIS WEEK", sections.thisWeek)}>{renderRows(sections.thisWeek)}</Section>
            )}
            {sections.later.length > 0 && <Section title={sectionTitle("LATER", sections.later)}>{renderRows(sections.later)}</Section>}
            {sections.someday.length > 0 && (
              <Section title={sectionTitle("SOMEDAY", sections.someday)}>{renderRows(sections.someday)}</Section>
            )}
            {sections.doneToday.length > 0 && (
              <Section title={sectionTitle("DONE TODAY", sections.doneToday)}>{renderRows(sections.doneToday)}</Section>
            )}
          </>
        )}

        {/* Graveyard — excluded from every default view and count above;
            only ever surfaced here, on request, per TODOS.md §4. */}
        <div style={{ marginTop: "16px", borderTop: "2px solid var(--ink)", paddingTop: "12px" }}>
          <button
            onClick={actions.toggleGraveyard}
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
            {graveyard.open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            GRAVEYARD
          </button>

          {graveyard.open && (
            <div style={{ marginTop: "12px" }}>
              <input
                type="search"
                value={graveyard.query}
                onChange={(e) => actions.changeGraveyardQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    actions.searchGraveyard();
                  }
                }}
                placeholder="Search graveyard…"
                style={{
                  width: "100%",
                  marginBottom: "12px",
                  padding: "6px 8px",
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  border: "2px solid var(--ink)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
              {graveyard.loading ? (
                <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.6 }}>Loading…</div>
              ) : graveyard.items.length === 0 ? (
                <EmptyState text={graveyard.query.trim() ? "No matches." : "Nothing here."} />
              ) : (
                <>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "13px", marginBottom: "12px" }}>
                    {graveyard.items.length} thing{graveyard.items.length === 1 ? "" : "s"} here. Do any of them still
                    matter?
                  </div>
                  {graveyard.items.map((todo) => (
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
                        onClick={() => actions.restoreFromGraveyard(todo)}
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
    </AppPage>
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
          isEditing={editing.id === todo.id}
          editTitle={editing.title}
          onEditTitleChange={actions.changeEditTitle}
          onStartEdit={() => actions.startEdit(todo)}
          onCancelEdit={actions.cancelEdit}
          onSaveEdit={(scope) => actions.saveEdit(todo.id, scope)}
          onToggleDone={() => actions.toggleDone(todo)}
          onDelete={() => actions.deleteTodo(todo.id)}
          onPush={() => actions.pushTodo(todo.id)}
          onMoveToGraveyard={() => actions.moveToGraveyard(todo.id)}
          onToggleSubtask={(s) => actions.toggleSubtask(todo.id, s)}
          onDeleteSubtask={(sId) => actions.deleteSubtask(todo.id, sId)}
          subtaskInput={newSubtaskText[todo.id] || ""}
          onSubtaskInputChange={(v) => setNewSubtaskText((prev) => ({ ...prev, [todo.id]: v }))}
          onAddSubtask={() => addSubtask(todo.id)}
          showActualTimePrompt={actualTimePrompt.id === todo.id}
          actualTimeCustomValue={actualTimeCustom[todo.id] || ""}
          onActualTimeCustomChange={(v) => setActualTimeCustom((prev) => ({ ...prev, [todo.id]: v }))}
          onSubmitActualTime={(minutes) => actions.submitActualTime(todo.id, minutes)}
          onDismissActualTimePrompt={() => actions.dismissActualTimePrompt(todo.id)}
        />
      );
    });
  }
}

export default function TodosPage() {
  return (
    <Suspense
      fallback={<AppLoading label="LOADING TODOS…" />}
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
  showActualTimePrompt,
  actualTimeCustomValue,
  onActualTimeCustomChange,
  onSubmitActualTime,
  onDismissActualTimePrompt,
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
  showActualTimePrompt: boolean;
  actualTimeCustomValue: string;
  onActualTimeCustomChange: (v: string) => void;
  onSubmitActualTime: (minutes: number) => void;
  onDismissActualTimePrompt: () => void;
}) {
  const { isStale, isOverdue, daysOverdue, offerGraveyard } = deriveTodoFlags(todo, today);

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
        className="icon-hit"
        style={{ width: "22px", height: "22px", marginTop: "2px", flexShrink: 0, accentColor: "var(--ink)" }}
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
            {seriesStats ? (
              <>
                <button onClick={() => onSaveEdit("one")} style={editButtonStyle()}>
                  THIS ONE
                </button>
                <button onClick={() => onSaveEdit("future")} style={editButtonStyle()}>
                  THIS AND FUTURE
                </button>
              </>
            ) : (
              <button onClick={() => onSaveEdit("one")} style={editButtonStyle()}>
                SAVE
              </button>
            )}
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
            {todo.state === "OPEN" && (
              <button
                onClick={onStartEdit}
                aria-label="Edit task"
                className="icon-hit"
                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}
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
          {todo.remindAt && <Chip label={`⏰ ${formatRemindAt(todo.remindAt)}`} />}
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

        {showActualTimePrompt && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px",
              padding: "8px",
              marginBottom: "8px",
              background: "var(--cream)",
              border: "2px solid var(--lime)",
            }}
          >
            <span style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 700 }}>
              How long did that actually take? (est. {todo.estimatedMinutes}m)
            </span>
            <button onClick={() => onSubmitActualTime(Math.max(1, Math.round(todo.estimatedMinutes / 2)))} style={editButtonStyle()}>
              HALF
            </button>
            <button onClick={() => onSubmitActualTime(todo.estimatedMinutes)} style={editButtonStyle()}>
              SPOT ON
            </button>
            <button onClick={() => onSubmitActualTime(todo.estimatedMinutes * 2)} style={editButtonStyle()}>
              DOUBLE
            </button>
            <input
              type="number"
              min={1}
              placeholder="min"
              value={actualTimeCustomValue}
              onChange={(e) => onActualTimeCustomChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmitActualTime(Number(actualTimeCustomValue));
                }
              }}
              style={{
                width: "56px",
                padding: "4px 6px",
                fontFamily: "var(--mono)",
                fontSize: "12px",
                border: "2px solid var(--ink)",
                background: "var(--paper)",
                color: "var(--ink)",
              }}
            />
            <button
              onClick={onDismissActualTimePrompt}
              aria-label="Dismiss"
              style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, marginLeft: "auto", display: "flex" }}
            >
              <X size={14} />
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
        className="icon-hit"
        style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, alignSelf: "flex-start" }}
        aria-label="Delete todo"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
