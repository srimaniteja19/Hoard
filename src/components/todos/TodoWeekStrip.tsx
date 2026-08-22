"use client";

import { useState } from "react";
import { formatMinutes } from "@/lib/home/format";
import { weekContaining, weekLoad, type WeekDayLoad } from "@/lib/todos/calendar";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function TodoWeekStrip({
  selected,
  today,
  todos,
  onSelect,
  onDropTodo,
}: {
  selected: string;
  today: string;
  todos: Array<{ dueDate: string | null; state: string; energy: string; estimatedMinutes: number }>;
  onSelect: (date: string) => void;
  onDropTodo: (id: string, date: string) => void;
}) {
  const days = weekContaining(selected);
  const load = weekLoad(days, todos);

  return (
    <div className="todo-week" role="navigation" aria-label="This week">
      {load.map((day, index) => (
        <WeekCell
          key={day.date}
          day={day}
          weekday={WEEKDAYS[index] ?? ""}
          today={today}
          selected={selected}
          onSelect={onSelect}
          onDropTodo={onDropTodo}
        />
      ))}
    </div>
  );
}

function WeekCell({
  day,
  weekday,
  today,
  selected,
  onSelect,
  onDropTodo,
}: {
  day: WeekDayLoad;
  weekday: string;
  today: string;
  selected: string;
  onSelect: (date: string) => void;
  onDropTodo: (id: string, date: string) => void;
}) {
  const [dropping, setDropping] = useState(false);
  const classes = [
    "todo-week-day",
    day.date === today ? "is-today" : "",
    day.date === selected ? "is-on" : "",
    dropping ? "is-drop" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={() => onSelect(day.date)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropping(true);
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData("text/plain");
        if (id) onDropTodo(id, day.date);
        setDropping(false);
      }}
      aria-current={day.date === today ? "date" : undefined}
      aria-pressed={day.date === selected}
    >
      <span>{weekday}</span>
      <b>{Number(day.date.slice(-2))}</b>
      <em>{day.minutes > 0 ? formatMinutes(day.minutes) : "—"}</em>
      <i className="todo-week-mix" aria-hidden="true">
        {day.deep > 0 ? <span className="is-deep" style={{ flex: `${day.deep} 1 0` }} /> : null}
        {day.shallow > 0 ? <span className="is-shallow" style={{ flex: `${day.shallow} 1 0` }} /> : null}
        {day.errand > 0 ? <span className="is-errand" style={{ flex: `${day.errand} 1 0` }} /> : null}
      </i>
    </button>
  );
}
