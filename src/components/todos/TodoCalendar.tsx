"use client";

import { useState } from "react";
import { countOpenByDue, monthCells, monthTitle, shiftMonth } from "@/lib/todos/calendar";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function TodoCalendar({
  year,
  month,
  today,
  selected,
  todos,
  onSelect,
  onMonth,
  onDropTodo,
}: {
  year: number;
  month: number;
  today: string;
  selected: string;
  todos: Array<{ dueDate: string | null; state: string }>;
  onSelect: (date: string) => void;
  onMonth: (year: number, month: number) => void;
  onDropTodo: (id: string, date: string) => void;
}) {
  const counts = countOpenByDue(todos);
  const next = shiftMonth(year, month, 1);
  const prev = shiftMonth(year, month, -1);
  const [dropDate, setDropDate] = useState<string | null>(null);

  return (
    <div className="todo-cal">
      <div className="todo-cal-nav">
        <button type="button" onClick={() => onMonth(prev.year, prev.month)} aria-label="Previous month">
          ‹
        </button>
        <h2>{monthTitle(year, month)}</h2>
        <button type="button" onClick={() => onMonth(next.year, next.month)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="todo-cal-week">
        {WEEKDAYS.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="todo-cal-grid">
        {monthCells(year, month).map((cell) => {
          const count = counts[cell.date] ?? 0;
          const classes = [
            "todo-cal-day",
            cell.inMonth ? "" : "is-out",
            cell.date === today ? "is-today" : "",
            cell.date === selected ? "is-on" : "",
            cell.date === dropDate ? "is-drop" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={cell.date}
              type="button"
              className={classes}
              onClick={() => onSelect(cell.date)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropDate(cell.date);
              }}
              onDragLeave={() => setDropDate((current) => (current === cell.date ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain");
                if (id) onDropTodo(id, cell.date);
                setDropDate(null);
              }}
              aria-current={cell.date === today ? "date" : undefined}
              aria-pressed={cell.date === selected}
            >
              {Number(cell.date.slice(-2))}
              {count > 0 ? <i aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <button type="button" className="todo-cal-today" onClick={() => onSelect(today)}>
        Today
      </button>
    </div>
  );
}
