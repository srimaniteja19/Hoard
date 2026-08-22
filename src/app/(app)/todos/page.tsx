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
import { isoDay, parseIsoDay, weekContaining } from "@/lib/todos/calendar";
import { collectTags, dayLoadStamp, openLoadForDay } from "@/lib/todos/load";
import { minutesSinceMidnight } from "@/lib/home/format";
import { isRitual, oneShotsForDay, ritualLabel, ritualRootId, ritualWeekMarks, ritualsForDay } from "@/lib/todos/rituals";

const localTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const ENERGY_FILTERS: (Energy | "ALL")[] = ["ALL", "DEEP", "SHALLOW", "ERRAND"];

function TodosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = isoDay(new Date());

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== inputRef.current) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const preview: ParsedTodo | null = useMemo(() => {
    if (!input.trim()) return null;
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

  const commit = async () => {
    const text = input.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setInput("");
    const ok = await actions.createTodo(text);
    if (!ok) setInput(text);
    setSubmitting(false);
  };

  const addSubtask = (todoId: string) => {
    const title = newSubtaskText[todoId] || "";
    setNewSubtaskText((prev) => ({ ...prev, [todoId]: "" }));
    actions.addSubtask(todoId, title);
  };

  const heading = selected === today
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

      <div className="todo-room">
        <form
          className="todo-add"
          onSubmit={(event) => {
            event.preventDefault();
            void commit();
          }}
        >
          <span className="todo-add-kicker">NEW</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="read every day ~20m deep"
            disabled={submitting}
          />
        </form>
        {preview ? (
          <p className="todo-preview">
            {preview.estimatedMinutes}m · {preview.energy.toLowerCase()}
            {preview.dueOffsetDays === 0 ? " · today" : preview.dueOffsetDays != null ? ` · +${preview.dueOffsetDays}d` : " · someday"}
            {preview.recurrenceRule ? ` · ${ritualLabel(preview.recurrenceRule).toLowerCase()}` : ""}
            {preview.tags.length ? ` · ${preview.tags.map((tag) => `#${tag}`).join(" ")}` : ""}
          </p>
        ) : null}

        <div className="todo-filters">
          {ENERGY_FILTERS.map((energy) => (
            <button
              key={energy}
              type="button"
              className={`todo-chip is-${energy.toLowerCase()}${energyFilter === energy ? " is-on" : ""}`}
              onClick={() => updateQuery({ energy })}
            >
              {energy === "ALL" ? "All" : energy.toLowerCase()}
            </button>
          ))}
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`todo-chip is-tag${tagFilter === tag ? " is-on" : ""}`}
              onClick={() => updateQuery({ tag: tagFilter === tag ? null : tag })}
            >
              #{tag}
            </button>
          ))}
          <label className="todo-time">
            Fits
            <select value={time} onChange={(event) => updateQuery({ time: Number(event.target.value) })}>
              <option value={180}>any time</option>
              <option value={15}>15m</option>
              <option value={25}>25m</option>
              <option value={45}>45m</option>
              <option value={90}>90m</option>
            </select>
          </label>
        </div>

        <div className="todo-split">
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

          <div className="todo-day">
            <div className="todo-day-head">
              <div>
                <h1>{heading}</h1>
                <p className={load.unfittedMinutes > 0 ? "todo-load is-short" : "todo-load"}>
                  {dayLoadStamp(load)}
                </p>
              </div>
              {selected !== today ? (
                <button type="button" onClick={() => updateQuery({ day: today })}>
                  Today
                </button>
              ) : null}
            </div>
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
            {loading ? (
              <p className="todo-muted">Loading…</p>
            ) : (
              <>
                {rituals.length > 0 ? (
                  <section className="todo-block todo-rituals">
                    <header className="todo-rituals-head">
                      <h2>Rituals</h2>
                      <p>Miss a day and the run dies.</p>
                    </header>
                    {rituals.map(renderRitual)}
                  </section>
                ) : null}
                {selected === today && overdue.length > 0 ? (
                  <section className="todo-block">
                    <h2>Overdue</h2>
                    {renderRows(overdue)}
                  </section>
                ) : null}
                <section className="todo-block">
                  {dueSelected.length === 0 ? (
                    rituals.length === 0 ? <p className="todo-muted">Nothing due this day.</p> : null
                  ) : (
                    renderRows(dueSelected)
                  )}
                </section>
                {doneSelected.length > 0 ? (
                  <section className="todo-block">
                    <h2>Done</h2>
                    {renderRows(doneSelected)}
                  </section>
                ) : null}
              </>
            )}
          </div>
        </div>

        {someday.length > 0 ? (
          <section className="todo-block">
            <h2>Someday</h2>
            {renderRows(someday)}
          </section>
        ) : null}

        <section className="todo-archive">
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
                <p className="todo-muted">{graveyard.query.trim() ? "No matches." : "Empty."}</p>
              ) : (
                graveyard.items.map((todo) => (
                  <div key={todo.id} className="todo-archive-row">
                    <span>{todo.title}</span>
                    <button type="button" onClick={() => actions.restoreFromGraveyard(todo)}>
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </section>
      </div>
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
