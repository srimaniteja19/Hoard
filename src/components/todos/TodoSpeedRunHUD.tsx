"use client";

import React, { useEffect, useMemo } from "react";
import { Todo } from "@/lib/todos/types";
import { isRitual, ritualLabel } from "@/lib/todos/rituals";
import { playSound } from "@/lib/sound";

interface TodoSpeedRunHUDProps {
  isOpen: boolean;
  todos: Todo[];
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  onToggleDone: (todo: Todo) => void;
  onPushTodo: (todoId: string) => void;
  onClose: () => void;
}

export function TodoSpeedRunHUD({
  isOpen,
  todos,
  currentIndex,
  onIndexChange,
  onToggleDone,
  onPushTodo,
  onClose,
}: TodoSpeedRunHUDProps) {
  // Filter active queue (open items first, or all items in today's scope)
  const queue = useMemo(() => {
    return todos.filter((t) => t.state === "OPEN");
  }, [todos]);

  const totalCount = todos.length;
  const doneCount = todos.filter((t) => t.state === "DONE").length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;

  const currentItem = queue[currentIndex] ?? queue[0] ?? null;

  // Keyboard navigation & triage listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        playSound.click();
        onClose();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (currentItem) {
          playSound.fileIt();
          onToggleDone(currentItem);
          // Advance index if available
          if (currentIndex < queue.length - 1) {
            onIndexChange(currentIndex);
          } else if (queue.length > 1) {
            onIndexChange(0);
          }
        }
      } else if (e.key === "j" || e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        playSound.click(0.2);
        if (queue.length > 0) {
          onIndexChange((currentIndex + 1) % queue.length);
        }
      } else if (e.key === "k" || e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        playSound.click(0.2);
        if (queue.length > 0) {
          onIndexChange((currentIndex - 1 + queue.length) % queue.length);
        }
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (currentItem && !isRitual(currentItem)) {
          playSound.pop();
          onPushTodo(currentItem.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentItem, currentIndex, queue, onIndexChange, onToggleDone, onPushTodo, onClose]);

  if (!isOpen) return null;

  const isCurrentRitual = currentItem ? isRitual(currentItem) : false;

  return (
    <div className="speed-run-overlay" role="dialog" aria-modal="true" aria-label="Speed Run Triage">
      <div className="speed-run-modal">
        {/* Top Header */}
        <div className="speed-run-header">
          <div className="speed-run-badge">
            <span className="live-dot" />
            <b>SPEED RUN TRIAGE</b>
          </div>
          <div className="speed-run-stats">
            <span>{doneCount}/{totalCount} COMPLETED ({progressPercent}%)</span>
            <div className="speed-run-bar">
              <div className="speed-run-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <button
            type="button"
            className="speed-run-close"
            onClick={() => {
              playSound.click();
              onClose();
            }}
            title="Exit (Esc)"
          >
            ✕ ESC
          </button>
        </div>

        {/* Center Content Card */}
        {currentItem ? (
          <div className={`speed-run-card is-${currentItem.energy.toLowerCase()} ${isCurrentRitual ? "is-ritual" : ""}`}>
            <div className="speed-run-card-kicker">
              <span className="type-tag">
                {isCurrentRitual ? `RITUAL · ${ritualLabel(currentItem.recurrenceRule)}` : "ONE-OFF TASK"}
              </span>
              <span className="energy-tag">{currentItem.energy}</span>
              <span className="time-tag">~{currentItem.estimatedMinutes}m</span>
              {currentItem.tags.map((tag) => (
                <span key={tag} className="meta-tag">#{tag}</span>
              ))}
            </div>

            <div className="speed-run-card-main">
              <button
                type="button"
                className="speed-run-big-check"
                onClick={() => {
                  playSound.fileIt();
                  onToggleDone(currentItem);
                }}
                title="Complete item (Space or Enter)"
              >
                ✓
              </button>
              <div className="speed-run-card-text">
                <h2 className="speed-run-title">{currentItem.title}</h2>
                {currentItem.note ? <p className="speed-run-note">{currentItem.note}</p> : null}
                {currentItem.subtasks?.length > 0 ? (
                  <div className="speed-run-subtasks">
                    {currentItem.subtasks.map((st) => (
                      <span key={st.id} className={st.done ? "sub-pill is-done" : "sub-pill"}>
                        {st.done ? "✓" : "○"} {st.title}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="speed-run-actions">
              <button
                type="button"
                className="speed-btn-primary"
                onClick={() => {
                  playSound.fileIt();
                  onToggleDone(currentItem);
                }}
              >
                <span>COMPLETE & ADVANCE</span>
                <kbd>SPACE ↵</kbd>
              </button>

              {!isCurrentRitual && (
                <button
                  type="button"
                  className="speed-btn-push"
                  onClick={() => {
                    playSound.pop();
                    onPushTodo(currentItem.id);
                  }}
                >
                  <span>PUSH +1d</span>
                  <kbd>P</kbd>
                </button>
              )}

              <div className="speed-nav-group">
                <button
                  type="button"
                  className="speed-btn-nav"
                  disabled={queue.length <= 1}
                  onClick={() => onIndexChange((currentIndex - 1 + queue.length) % queue.length)}
                  title="Previous (K or Up Arrow)"
                >
                  ▲ <kbd>K</kbd>
                </button>
                <span className="speed-nav-label">
                  {currentIndex + 1} / {queue.length}
                </span>
                <button
                  type="button"
                  className="speed-btn-nav"
                  disabled={queue.length <= 1}
                  onClick={() => onIndexChange((currentIndex + 1) % queue.length)}
                  title="Next (J or Down Arrow)"
                >
                  ▼ <kbd>J</kbd>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="speed-run-empty">
            <div className="speed-run-trophy">⚡🏆⚡</div>
            <h3>ALL MISSIONS CLEARED!</h3>
            <p>Every ritual and task due today has been filed.</p>
            <button
              type="button"
              className="speed-btn-primary"
              onClick={() => {
                playSound.click();
                onClose();
              }}
            >
              CLOSE MISSION CONTROL <kbd>ESC</kbd>
            </button>
          </div>
        )}

        {/* Bottom Queue Strip */}
        {queue.length > 1 && (
          <div className="speed-run-queue">
            {queue.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`speed-queue-chip ${idx === currentIndex ? "is-active" : ""} is-${item.energy.toLowerCase()}`}
                onClick={() => onIndexChange(idx)}
              >
                <span className="chip-num">{idx + 1}</span>
                <span className="chip-title">{item.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
