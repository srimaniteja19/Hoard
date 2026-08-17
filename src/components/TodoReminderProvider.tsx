"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

type DueReminder = {
  id: string;
  title: string;
  dueDate: string | null;
  estimatedMinutes: number;
};

const POLL_INTERVAL_MS = 60_000;
const AUTO_DISMISS_MS = 15_000;

/**
 * In-app reminders — TODOS.md §9's first phase. Polls
 * GET /api/todos/reminders/due (which atomically claims due reminders
 * server-side, so this never needs its own double-fire guard) and renders
 * a toast stack that doubles as the badge — a count is only ever visible
 * while there's something unacknowledged to show.
 *
 * Mounted once at the root layout so it's live everywhere, not just on
 * /todos, matching "works everywhere" in §9.
 */
export const TodoReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [toasts, setToasts] = useState<DueReminder[]>([]);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/todos/reminders/due", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const items: DueReminder[] = data.items || [];
          if (items.length > 0) {
            setToasts((prev) => [...prev, ...items]);
          }
        }
      } catch {
        // Silent — a missed poll just gets picked up on the next interval.
      }
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), AUTO_DISMISS_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const openTodo = (id: string) => {
    dismiss(id);
    router.push("/todos");
  };

  return (
    <>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "16px",
            right: "16px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            maxWidth: "320px",
          }}
        >
          {toasts.length > 1 && (
            <div
              style={{
                alignSelf: "flex-end",
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 800,
                padding: "2px 8px",
                background: "var(--ink)",
                color: "var(--paper)",
              }}
            >
              {toasts.length} REMINDERS
            </div>
          )}
          {toasts.map((t) => (
            <div
              key={t.id}
              onClick={() => openTodo(t.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                background: "var(--yel)",
                border: "2px solid var(--ink)",
                boxShadow: "4px 4px 0 var(--ink)",
                cursor: "pointer",
                fontFamily: "var(--mono)",
              }}
            >
              <Bell size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#000" }}>{t.title}</div>
                <div style={{ fontSize: "10px", opacity: 0.7, color: "#000" }}>{t.estimatedMinutes} min</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
                aria-label="Dismiss reminder"
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0 }}
              >
                <X size={14} color="#000" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
