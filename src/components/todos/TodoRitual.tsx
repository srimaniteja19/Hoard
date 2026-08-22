"use client";

import { Todo } from "@/lib/todos/types";
import { SeriesStats } from "@/lib/todos/sections";
import { localTimeValue, remindIsoFromLocal } from "@/lib/todos/remind";
import { ritualLabel, type RitualMark } from "@/lib/todos/rituals";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function TodoRitual({
  todo,
  today,
  selected,
  seriesStats,
  marks,
  isEditing,
  editTitle,
  editNote,
  onEditTitleChange,
  onEditNoteChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleDone,
  onDelete,
  onSetRemindAt,
  onSelectDay,
  showActualTimePrompt,
  actualTimeCustomValue,
  onActualTimeCustomChange,
  onSubmitActualTime,
  onDismissActualTimePrompt,
}: {
  todo: Todo;
  today: string;
  selected: string;
  seriesStats: SeriesStats | null;
  marks: Array<{ date: string; mark: RitualMark }>;
  isEditing: boolean;
  editTitle: string;
  editNote: string;
  onEditTitleChange: (v: string) => void;
  onEditNoteChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (scope: "one" | "future") => void;
  onToggleDone: () => void;
  onDelete: () => void;
  onSetRemindAt: (remindAt: string | null) => void;
  onSelectDay: (date: string) => void;
  showActualTimePrompt: boolean;
  actualTimeCustomValue: string;
  onActualTimeCustomChange: (v: string) => void;
  onSubmitActualTime: (minutes: number) => void;
  onDismissActualTimePrompt: () => void;
}) {
  const done = todo.state === "DONE";
  const upcoming = !done && selected > today;
  const run = seriesStats?.run ?? 0;
  const filed = seriesStats?.done ?? 0;
  const missed = seriesStats?.missed ?? 0;
  const serial = todo.id.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase() || "0000";
  const status = upcoming ? "Due this day" : done ? "Filed" : run ? `${run}-day run` : "New loop";

  return (
    <article
      className={[
        "todo-ritual",
        `is-${todo.energy.toLowerCase()}`,
        done ? "is-done" : "",
        upcoming ? "is-due" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="todo-ritual-kicker">
        <span>Loop pass</span>
        <span>No. {serial}</span>
        <span>{ritualLabel(todo.recurrenceRule)}</span>
        <b>{status}</b>
      </header>

      <div className="todo-ritual-body">
        <div className="todo-ritual-count" aria-hidden="true">
          <b>{run || "0"}</b>
          <i>run</i>
        </div>
        <button
          type="button"
          className={done ? "todo-ritual-check is-on" : "todo-ritual-check"}
          role="checkbox"
          aria-checked={done}
          aria-label={
            upcoming
              ? `${todo.title} is due ${selected}. Check it off on that day.`
              : done
                ? `Reopen ${todo.title}`
                : `Complete ${todo.title}`
          }
          disabled={upcoming}
          onClick={onToggleDone}
        >
          {done ? "✓" : ""}
        </button>
        <div className="todo-ritual-copy">
          {isEditing ? (
            <div className="todo-slip-edit">
              <input
                type="text"
                value={editTitle}
                onChange={(event) => onEditTitleChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSaveEdit("future");
                  } else if (event.key === "Escape") {
                    onCancelEdit();
                  }
                }}
                autoFocus
              />
              <input
                type="text"
                value={editNote}
                placeholder="One-line note"
                onChange={(event) => onEditNoteChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSaveEdit("future");
                  } else if (event.key === "Escape") {
                    onCancelEdit();
                  }
                }}
              />
              <button type="button" onClick={() => onSaveEdit("future")}>
                Save
              </button>
              <button type="button" onClick={onCancelEdit}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <p
                className="todo-ritual-title"
                tabIndex={0}
                onClick={onStartEdit}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onStartEdit();
                  }
                }}
              >
                {todo.title}
              </p>
              {todo.note ? <p className="todo-slip-blurb">{todo.note}</p> : null}
            </>
          )}
          <p className="todo-ritual-run">
            {todo.energy.toLowerCase()}
            {filed ? ` · ${filed} filed` : " · first pass"}
            {missed ? ` · ${missed} missed` : ""}
          </p>
        </div>
        <span className="todo-ritual-stamp">
          <b>{ritualLabel(todo.recurrenceRule)}</b>
          <i>{todo.estimatedMinutes}m</i>
        </span>
      </div>

      {showActualTimePrompt ? (
        <div className="todo-slip-prompt">
          How long? est. {todo.estimatedMinutes}m
          <button type="button" onClick={() => onSubmitActualTime(Math.max(1, Math.round(todo.estimatedMinutes / 2)))}>
            Half
          </button>
          <button type="button" onClick={() => onSubmitActualTime(todo.estimatedMinutes)}>
            Same
          </button>
          <button type="button" onClick={() => onSubmitActualTime(todo.estimatedMinutes * 2)}>
            Double
          </button>
          <input
            type="number"
            min={1}
            placeholder="min"
            value={actualTimeCustomValue}
            onChange={(event) => onActualTimeCustomChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmitActualTime(Number(actualTimeCustomValue));
              }
            }}
          />
          <button type="button" onClick={onDismissActualTimePrompt} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}

      <div className="todo-ritual-perf" aria-hidden="true" />

      <div className="todo-ritual-loop" role="navigation" aria-label="This week's loop">
        {marks.map((cell, index) => (
          <button
            key={cell.date}
            type="button"
            className={[
              "todo-ritual-bead",
              `is-${cell.mark}`,
              cell.date === today ? "is-today" : "",
              cell.date === selected ? "is-on" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelectDay(cell.date)}
            aria-label={cell.date}
            aria-current={cell.date === today ? "date" : undefined}
            disabled={cell.mark === "off"}
          >
            <span>{WEEKDAYS[index]}</span>
            <b>{Number(cell.date.slice(-2))}</b>
          </button>
        ))}
      </div>

      <div className="todo-ritual-rail">
        <label>
          <span>At</span>
          <input
            type="time"
            value={localTimeValue(todo.remindAt)}
            onChange={(event) =>
              onSetRemindAt(event.target.value ? remindIsoFromLocal(todo.dueDate ?? today, event.target.value) : null)
            }
          />
        </label>
        {todo.state === "OPEN" ? (
          <button type="button" className="is-drop" onClick={onDelete}>
            Drop
          </button>
        ) : null}
      </div>
    </article>
  );
}
