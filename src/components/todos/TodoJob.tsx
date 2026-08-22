"use client";

import { Todo, Subtask } from "@/lib/todos/types";
import { SeriesStats } from "@/lib/todos/sections";
import { deriveTodoFlags } from "@/lib/todos/rowState";
import { localTimeValue, remindIsoFromLocal } from "@/lib/todos/remind";

export function TodoJob({
  todo,
  today,
  seriesStats,
  isEditing,
  editTitle,
  editNote,
  activeTag,
  onEditTitleChange,
  onEditNoteChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleDone,
  onDelete,
  onPush,
  onSetDueDate,
  onSetRemindAt,
  onMoveToGraveyard,
  onToggleSubtask,
  onDeleteSubtask,
  onTagClick,
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
  editNote: string;
  activeTag: string | null;
  onEditTitleChange: (v: string) => void;
  onEditNoteChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (scope: "one" | "future") => void;
  onToggleDone: () => void;
  onDelete: () => void;
  onPush: () => void;
  onSetDueDate: (dueDate: string | null) => void;
  onSetRemindAt: (remindAt: string | null) => void;
  onMoveToGraveyard: () => void;
  onToggleSubtask: (s: Subtask) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onTagClick: (tag: string) => void;
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
  const done = todo.state === "DONE";

  return (
    <article
      className={[
        "todo-slip",
        `is-${todo.energy.toLowerCase()}`,
        done ? "is-done" : "",
        isOverdue ? "is-overdue" : "",
        isStale ? "is-stale" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      draggable={todo.state === "OPEN"}
      onDragStart={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, select, textarea, .todo-slip-rail")) {
          event.preventDefault();
          return;
        }
        if (target.closest("button") && !target.closest(".todo-slip-title, .todo-slip-blurb")) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/plain", todo.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="todo-slip-spine" aria-hidden="true" />
      <div className="todo-slip-sheet">
        <div className="todo-slip-top">
          <button
            type="button"
            className={done ? "todo-check is-on" : "todo-check"}
            role="checkbox"
            aria-checked={done}
            aria-label={done ? `Reopen ${todo.title}` : `Complete ${todo.title}`}
            onClick={onToggleDone}
          />
          <div className="todo-slip-copy">
            {isEditing ? (
              <div className="todo-slip-edit">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(event) => onEditTitleChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSaveEdit("one");
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
                      onSaveEdit("one");
                    } else if (event.key === "Escape") {
                      onCancelEdit();
                    }
                  }}
                />
                {seriesStats ? (
                  <>
                    <button type="button" onClick={() => onSaveEdit("one")}>
                      This one
                    </button>
                    <button type="button" onClick={() => onSaveEdit("future")}>
                      Future too
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => onSaveEdit("one")}>
                    Save
                  </button>
                )}
                <button type="button" onClick={onCancelEdit}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <p
                  className="todo-slip-title"
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
                {todo.note ? (
                  <p className="todo-slip-blurb" onClick={onStartEdit}>
                    {todo.note}
                  </p>
                ) : null}
              </>
            )}
            {seriesStats ? (
              <p className="todo-slip-run">
                {seriesStats.done} done · {seriesStats.missed} missed · {seriesStats.run}-day run
              </p>
            ) : null}
            <div className="todo-slip-meta">
              {isOverdue ? <span className="is-hot">{daysOverdue}d late</span> : null}
              {isStale ? <span className="is-moved">{todo.rolloverCount}× moved</span> : null}
              {todo.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={activeTag === tag ? "todo-tag is-on" : "todo-tag"}
                  onClick={() => onTagClick(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
          <span className="todo-slip-mins">
            <b>{todo.energy}</b>
            <i>{todo.estimatedMinutes}m</i>
          </span>
        </div>

        {offerGraveyard ? (
          <div className="todo-slip-prompt">
            Moved {todo.rolloverCount} times.
            <button type="button" onClick={onMoveToGraveyard}>
              Archive
            </button>
          </div>
        ) : null}

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

        {todo.subtasks.length > 0 ? (
          <ul className="todo-slip-steps">
            {todo.subtasks.map((sub) => (
              <li key={sub.id} className="todo-sub">
                <button
                  type="button"
                  className={sub.done ? "todo-check is-on is-sm" : "todo-check is-sm"}
                  role="checkbox"
                  aria-checked={sub.done}
                  onClick={() => onToggleSubtask(sub)}
                />
                <span className={sub.done ? "is-done" : undefined}>{sub.title}</span>
                <button type="button" onClick={() => onDeleteSubtask(sub.id)} aria-label="Delete subtask">
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {todo.state === "OPEN" ? (
          <input
            className="todo-sub-add"
            type="text"
            value={subtaskInput}
            onChange={(event) => onSubtaskInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddSubtask();
              }
            }}
            placeholder="Add step"
          />
        ) : null}

        <div className="todo-slip-rail">
          <label>
            <span>Due</span>
            <input
              type="date"
              value={todo.dueDate ?? ""}
              onChange={(event) => onSetDueDate(event.target.value || null)}
            />
          </label>
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
            <button type="button" className="is-push" onClick={onPush}>
              +1
            </button>
          ) : null}
          <button type="button" className="is-drop" onClick={onDelete}>
            Drop
          </button>
        </div>
      </div>
    </article>
  );
}
