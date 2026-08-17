"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { parseTodo, ParsedTodo } from "@/lib/todos/parse";
import { X, Trash2, Plus } from "lucide-react";

type Subtask = { id: string; title: string; done: boolean; position: number };

type Todo = {
  id: string;
  title: string;
  note: string | null;
  energy: "DEEP" | "SHALLOW" | "ERRAND";
  estimatedMinutes: number;
  actualMinutes: number | null;
  dueDate: string | null;
  rolloverCount: number;
  remindAt: string | null;
  recurrenceRule: string | null;
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

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

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
        const updated = await res.json();
        setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
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

  const openTodos = todos.filter((t) => t.state === "OPEN");
  const doneTodos = todos.filter((t) => t.state === "DONE");

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

        {loading ? (
          <div style={{ fontFamily: "var(--mono)", fontSize: "13px", opacity: 0.6 }}>Loading…</div>
        ) : (
          <>
            <Section title={`OPEN (${openTodos.length})`}>
              {openTodos.length === 0 ? (
                <EmptyState text="Nothing left for today. That's the whole point." />
              ) : (
                openTodos.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    onToggleDone={() => toggleDone(todo)}
                    onDelete={() => deleteTodo(todo.id)}
                    onToggleSubtask={(s) => toggleSubtask(todo.id, s)}
                    onDeleteSubtask={(sId) => deleteSubtask(todo.id, sId)}
                    subtaskInput={newSubtaskText[todo.id] || ""}
                    onSubtaskInputChange={(v) => setNewSubtaskText((prev) => ({ ...prev, [todo.id]: v }))}
                    onAddSubtask={() => addSubtask(todo.id)}
                  />
                ))
              )}
            </Section>

            {doneTodos.length > 0 && (
              <Section title={`DONE (${doneTodos.length})`}>
                {doneTodos.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    onToggleDone={() => toggleDone(todo)}
                    onDelete={() => deleteTodo(todo.id)}
                    onToggleSubtask={(s) => toggleSubtask(todo.id, s)}
                    onDeleteSubtask={(sId) => deleteSubtask(todo.id, sId)}
                    subtaskInput={newSubtaskText[todo.id] || ""}
                    onSubtaskInputChange={(v) => setNewSubtaskText((prev) => ({ ...prev, [todo.id]: v }))}
                    onAddSubtask={() => addSubtask(todo.id)}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
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

function TodoRow({
  todo,
  onToggleDone,
  onDelete,
  onToggleSubtask,
  onDeleteSubtask,
  subtaskInput,
  onSubtaskInputChange,
  onAddSubtask,
}: {
  todo: Todo;
  onToggleDone: () => void;
  onDelete: () => void;
  onToggleSubtask: (s: Subtask) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  subtaskInput: string;
  onSubtaskInputChange: (v: string) => void;
  onAddSubtask: () => void;
}) {
  const isStale = todo.rolloverCount >= 3;

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
        <div
          style={{
            fontWeight: 700,
            textDecoration: todo.state === "DONE" ? "line-through" : "none",
            marginBottom: "6px",
          }}
        >
          {todo.title}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: todo.subtasks.length ? "8px" : 0 }}>
          <Chip label={`${todo.estimatedMinutes} min`} />
          <Chip label={todo.energy} color={ENERGY_COLOR[todo.energy]} />
          {todo.dueDate && <Chip label={todo.dueDate} />}
          {todo.recurrenceRule && <Chip label={todo.recurrenceRule} />}
          {isStale && <Chip label={`MOVED ${todo.rolloverCount}×`} color="var(--orange)" />}
          {todo.tags.map((t) => (
            <Chip key={t} label={`#${t}`} />
          ))}
        </div>

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
