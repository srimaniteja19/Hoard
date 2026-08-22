"use client";

import { useCallback, useEffect, useState } from "react";
import { Todo, Subtask } from "@/lib/todos/types";

export type DayPlanResponse = {
  busy: { start: string; end: string; title: string }[];
  gaps: { start: string; end: string; minutes: number }[];
  packed: { id: string; title: string; estimatedMinutes: number; gapIndex: number }[];
  unfitted: { id: string; title: string; estimatedMinutes: number }[];
  freeMinutes: number;
};

/**
 * Shared skeleton for every todos mutation: fetch, branch on res.ok, log
 * exceptions, optionally run a settle step. Deliberately doesn't decide
 * what "success" does to state or whether failure rolls anything back —
 * those vary per action (some roll back an optimistic update, most don't;
 * see the call sites below, each of which matches the page's original,
 * pre-extraction behavior exactly). This is an internal seam private to
 * this hook, not a public export — nothing outside useTodos sees it.
 */
async function withRequest<T = void>(
  request: () => Promise<Response>,
  onSuccess: (data: T) => void,
  options?: { onFailure?: () => void; onSettled?: () => void; parseJson?: boolean; errorLabel?: string }
): Promise<boolean> {
  const parseJson = options?.parseJson ?? true;
  try {
    const res = await request();
    if (res.ok) {
      const data = parseJson ? ((await res.json()) as T) : (undefined as T);
      onSuccess(data);
      return true;
    }
    options?.onFailure?.();
    return false;
  } catch (e) {
    console.error(options?.errorLabel ?? "Todos request failed", e);
    options?.onFailure?.();
    return false;
  } finally {
    options?.onSettled?.();
  }
}

const json = { "Content-Type": "application/json" } as const;

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayPlan, setDayPlan] = useState<DayPlanResponse | null>(null);

  const [graveyardOpen, setGraveyardOpen] = useState(false);
  const [graveyardItems, setGraveyardItems] = useState<Todo[]>([]);
  const [graveyardLoading, setGraveyardLoading] = useState(false);
  const [graveyardLoaded, setGraveyardLoaded] = useState(false);
  const [graveyardQuery, setGraveyardQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");

  const [actualTimePromptId, setActualTimePromptId] = useState<string | null>(null);

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

  useEffect(() => {
    async function loadDayPlan() {
      try {
        const res = await fetch("/api/todos/day-plan", { credentials: "include" });
        if (res.ok) setDayPlan(await res.json());
      } catch (e) {
        console.error("Failed to load day plan", e);
      }
    }
    loadDayPlan();
  }, []);

  /** Returns whether the create succeeded, so the caller (the capture bar)
   * can restore its input text on failure — that restore is a form
   * concern, not a todos-data concern, so it stays with the caller. */
  const createTodo = useCallback(async (text: string): Promise<boolean> => {
    return withRequest<Todo>(
      () => fetch("/api/todos", { method: "POST", credentials: "include", headers: json, body: JSON.stringify({ text }) }),
      (created) => setTodos((prev) => [created, ...prev])
    );
  }, []);

  const toggleDone = useCallback(
    async (todo: Todo) => {
      const nextState = todo.state === "DONE" ? "OPEN" : "DONE";
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, state: nextState } : t)));
      await withRequest<Todo & { nextInstance?: Todo }>(
        () =>
          fetch(`/api/todos/${todo.id}`, { method: "PATCH", credentials: "include", headers: json, body: JSON.stringify({ state: nextState }) }),
        ({ nextInstance, ...updated }) => {
          setTodos((prev) => {
            const next = prev.map((t) => (t.id === todo.id ? updated : t));
            // Recurrence generates exactly one successor on completion
            // (TODOS.md §5) — surface it immediately, don't wait on a reload.
            return nextInstance ? [nextInstance, ...next] : next;
          });
          if (nextState === "DONE") setActualTimePromptId(todo.id);
          else if (actualTimePromptId === todo.id) setActualTimePromptId(null);
        }
      );
    },
    [actualTimePromptId]
  );

  // A dismissed prompt leaves actualMinutes null and that task is excluded
  // from calibration — dismissing is just closing the prompt, no request.
  const dismissActualTimePrompt = useCallback((todoId: string) => {
    setActualTimePromptId((cur) => (cur === todoId ? null : cur));
  }, []);

  const submitActualTime = useCallback(async (todoId: string, minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    setActualTimePromptId(null);
    setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, actualMinutes: minutes } : t)));
    try {
      await fetch(`/api/todos/${todoId}`, { method: "PATCH", credentials: "include", headers: json, body: JSON.stringify({ actualMinutes: minutes }) });
    } catch (e) {
      console.error("Failed to save actual time", e);
    }
  }, []);

  const deleteTodo = useCallback(
    async (id: string) => {
      const prevTodos = todos;
      setTodos((prev) => prev.filter((t) => t.id !== id));
      await withRequest<void>(
        () => fetch(`/api/todos/${id}`, { method: "DELETE", credentials: "include" }),
        () => {},
        { parseJson: false, onFailure: () => setTodos(prevTodos), errorLabel: "Failed to delete todo" }
      );
    },
    [todos]
  );

  const addSubtask = useCallback(async (todoId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    await withRequest<Subtask>(
      () =>
        fetch(`/api/todos/${todoId}/subtasks`, { method: "POST", credentials: "include", headers: json, body: JSON.stringify({ title: trimmed }) }),
      (subtask) => setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, subtasks: [...t.subtasks, subtask] } : t))),
      { errorLabel: "Failed to add subtask" }
    );
  }, []);

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
        headers: json,
        body: JSON.stringify({ done: !subtask.done }),
      });
    } catch (e) {
      console.error("Failed to toggle subtask", e);
    }
  }, []);

  const deleteSubtask = useCallback(async (todoId: string, subtaskId: string) => {
    setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t)));
    try {
      await fetch(`/api/todos/${todoId}/subtasks/${subtaskId}`, { method: "DELETE", credentials: "include" });
    } catch (e) {
      console.error("Failed to delete subtask", e);
    }
  }, []);

  // The → action. rolloverCount only ever moves here — TODOS.md §4: no cron,
  // no background job, only this explicit push.
  const pushTodo = useCallback(async (todoId: string) => {
    await withRequest<Partial<Todo>>(
      () => fetch(`/api/todos/${todoId}/push`, { method: "POST", credentials: "include" }),
      (updated) => setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, ...updated } : t))),
      { errorLabel: "Failed to push todo" }
    );
  }, []);

  const moveToGraveyard = useCallback(async (todoId: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    try {
      await fetch(`/api/todos/${todoId}`, { method: "PATCH", credentials: "include", headers: json, body: JSON.stringify({ state: "GRAVEYARD" }) });
      setGraveyardLoaded(false); // next expand re-fetches, picking this up
    } catch (e) {
      console.error("Failed to move todo to graveyard", e);
    }
  }, []);

  const runGraveyardFetch = useCallback(async (q: string) => {
    setGraveyardLoading(true);
    const params = new URLSearchParams({ graveyard: "true" });
    if (q.trim()) params.set("q", q.trim());
    await withRequest<{ items?: Todo[] }>(
      () => fetch(`/api/todos?${params}`, { credentials: "include" }),
      (data) => {
        setGraveyardItems(data.items || []);
        setGraveyardLoaded(true);
      },
      { onSettled: () => setGraveyardLoading(false), errorLabel: "Failed to load graveyard" }
    );
  }, []);

  const toggleGraveyard = useCallback(() => {
    const next = !graveyardOpen;
    setGraveyardOpen(next);
    if (next && !graveyardLoaded) runGraveyardFetch(graveyardQuery);
  }, [graveyardOpen, graveyardLoaded, graveyardQuery, runGraveyardFetch]);

  const changeGraveyardQuery = useCallback((q: string) => setGraveyardQuery(q), []);

  const searchGraveyard = useCallback(() => runGraveyardFetch(graveyardQuery), [graveyardQuery, runGraveyardFetch]);

  const restoreFromGraveyard = useCallback(async (todo: Todo) => {
    setGraveyardItems((prev) => prev.filter((t) => t.id !== todo.id));
    await withRequest<Todo>(
      () => fetch(`/api/todos/${todo.id}`, { method: "PATCH", credentials: "include", headers: json, body: JSON.stringify({ state: "OPEN" }) }),
      (updated) => setTodos((prev) => [updated, ...prev]),
      { errorLabel: "Failed to restore todo" }
    );
  }, []);

  const startEdit = useCallback((todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditNote(todo.note ?? "");
  }, []);

  const changeEditTitle = useCallback((title: string) => setEditTitle(title), []);
  const changeEditNote = useCallback((note: string) => setEditNote(note), []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditTitle("");
    setEditNote("");
  }, []);

  // Recurrence edit scopes — TODOS.md §5: "this one" only touches the
  // instance being edited; "this and future" also updates the series root's
  // template fields, so later-generated instances pick up the change. Past
  // completed instances are never rewritten either way.
  const saveEdit = useCallback(
    async (todoId: string, scope: "one" | "future") => {
      const title = editTitle.trim();
      if (!title) return;
      const note = editNote.trim() || null;
      setEditingId(null);
      setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, title, note } : t)));
      await withRequest<Partial<Todo>>(
        () =>
          fetch(`/api/todos/${todoId}`, {
            method: "PATCH",
            credentials: "include",
            headers: json,
            body: JSON.stringify({ title, note, applyToFutureInstances: scope === "future" }),
          }),
        (updated) => setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, ...updated } : t))),
        { errorLabel: "Failed to save edit" }
      );
    },
    [editTitle, editNote]
  );

  const setDueDate = useCallback(async (todoId: string, dueDate: string | null) => {
    setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, dueDate } : t)));
    await withRequest<Partial<Todo>>(
      () =>
        fetch(`/api/todos/${todoId}`, {
          method: "PATCH",
          credentials: "include",
          headers: json,
          body: JSON.stringify({ dueDate }),
        }),
      (updated) => setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, ...updated } : t))),
      { errorLabel: "Failed to set due date" }
    );
  }, []);

  const setRemindAt = useCallback(async (todoId: string, remindAt: string | null) => {
    setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, remindAt } : t)));
    await withRequest<Partial<Todo>>(
      () =>
        fetch(`/api/todos/${todoId}`, {
          method: "PATCH",
          credentials: "include",
          headers: json,
          body: JSON.stringify({ remindAt }),
        }),
      (updated) => setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, ...updated } : t))),
      { errorLabel: "Failed to set reminder" }
    );
  }, []);

  return {
    todos,
    loading,
    dayPlan,
    graveyard: { open: graveyardOpen, items: graveyardItems, loading: graveyardLoading, query: graveyardQuery },
    editing: { id: editingId, title: editTitle, note: editNote },
    actualTimePrompt: { id: actualTimePromptId },
    actions: {
      createTodo,
      toggleDone,
      deleteTodo,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      pushTodo,
      moveToGraveyard,
      toggleGraveyard,
      changeGraveyardQuery,
      searchGraveyard,
      restoreFromGraveyard,
      startEdit,
      changeEditTitle,
      changeEditNote,
      cancelEdit,
      saveEdit,
      setDueDate,
      setRemindAt,
      submitActualTime,
      dismissActualTimePrompt,
    },
  };
}
