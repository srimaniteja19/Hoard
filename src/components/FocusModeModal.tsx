"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Bookmark, SessionQueueItem } from "@/types";
import { ExternalLink, CheckCircle, SkipForward, Play, Pause, X, Zap } from "lucide-react";

interface FocusModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  onToggleRead: (id: number) => Promise<void>;
}

export function buildGreedySessionQueue(
  bookmarks: Bookmark[],
  targetMins: number
): SessionQueueItem[] {
  // Collect unread items (parent bookmarks and standalone chapters)
  const unreadItems = bookmarks.filter((b) => b.unread);
  
  // Sort by mins ascending or best fit
  const sorted = [...unreadItems].sort((a, b) => a.mins - b.mins);
  
  const queue: SessionQueueItem[] = [];
  let currentSum = 0;

  for (const item of sorted) {
    if (currentSum + item.mins <= targetMins) {
      queue.push({ bookmark: item, allocatedMins: item.mins });
      currentSum += item.mins;
    }
  }

  // Fallback if no exact sum fits: take first unread item if queue is empty
  if (queue.length === 0 && unreadItems.length > 0) {
    queue.push({ bookmark: unreadItems[0], allocatedMins: unreadItems[0].mins });
  }

  return queue;
}

export function FocusModeModal({
  isOpen,
  onClose,
  bookmarks,
  onToggleRead,
}: FocusModeModalProps) {
  const [targetMins, setTargetMins] = useState<number>(30);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const queue = useMemo(() => {
    return buildGreedySessionQueue(bookmarks, targetMins);
  }, [bookmarks, targetMins]);

  const currentItem = queue[currentIndex]?.bookmark || null;

  const startSession = (mins: number) => {
    setTargetMins(mins);
    const initialQueue = buildGreedySessionQueue(bookmarks, mins);
    if (initialQueue.length > 0) {
      setCurrentIndex(0);
      setCompletedCount(0);
      setIsCompleted(false);
      setSecondsRemaining((initialQueue[0]?.bookmark.mins || 5) * 60);
      setIsTimerRunning(true);
      setIsSessionActive(true);
    }
  };

  // If the timer already hit zero (e.g. right after a reset), stop it during render
  // rather than in an effect (https://react.dev/learn/you-might-not-need-an-effect).
  if (isSessionActive && isTimerRunning && secondsRemaining <= 0) {
    setIsTimerRunning(false);
  }

  // Timer countdown
  useEffect(() => {
    if (!isSessionActive || !isTimerRunning || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;
        // Auto advance or pause on item time end
        if (next <= 0) setIsTimerRunning(false);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSessionActive, isTimerRunning, secondsRemaining]);

  const handleNext = useCallback(
    async (markDone = true) => {
      if (currentItem && markDone) {
        await onToggleRead(currentItem.id);
        setCompletedCount((c) => c + 1);
      }

      if (currentIndex + 1 < queue.length) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setSecondsRemaining((queue[nextIdx].bookmark.mins || 5) * 60);
        setIsTimerRunning(true);
      } else {
        setIsCompleted(true);
        setIsTimerRunning(false);
      }
    },
    [currentItem, currentIndex, queue, onToggleRead]
  );

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="modal-container-responsive"
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#FFFDF8",
          border: "4px solid #000",
          boxShadow: "10px 10px 0 #000",
          padding: "28px",
          fontFamily: "var(--mono), monospace",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "#FF007A",
            color: "#fff",
            border: "2px solid #000",
            padding: "6px 12px",
            fontWeight: 800,
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "3px 3px 0 #000",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <X size={16} /> EXIT
        </button>

        {!isSessionActive ? (
          /* Session Duration Selection View */
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#FFE600",
                border: "3px solid #000",
                boxShadow: "4px 4px 0 #000",
                padding: "6px 16px",
                fontWeight: 800,
                fontSize: "16px",
                marginBottom: "16px",
              }}
            >
              <Zap size={20} color="#000" /> FOCUS MODE SESSION
            </div>

            <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "8px 0 16px 0", color: "#000" }}>
              HOW MUCH TIME DO YOU HAVE RIGHT NOW?
            </h2>

            <p style={{ fontSize: "13px", color: "#444", marginBottom: "24px" }}>
              HOARD will run a greedy algorithm across your unread bookmarks and chapters to assemble a perfectly fitted focus queue.
            </p>

            <div className="focus-grid-btns" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" }}>
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => startSession(mins)}
                  style={{
                    border: "3px solid #000",
                    background: targetMins === mins ? "#B6FF3C" : "#FFFDF8",
                    padding: "20px 10px",
                    fontWeight: 800,
                    fontSize: "20px",
                    cursor: "pointer",
                    boxShadow: "4px 4px 0 #000",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    transition: "transform 0.1s ease",
                  }}
                >
                  <span>{mins} MIN</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#555" }}>
                    ~{Math.max(1, Math.round(mins / 10))} ITEMS
                  </span>
                </button>
              ))}
            </div>

            <div style={{ background: "#FFE60022", border: "2px dashed #000", padding: "14px" }}>
              <div style={{ fontWeight: 800, fontSize: "12px" }}>⚡ READY TO QUEUE:</div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                {bookmarks.filter((b) => b.unread).length} unread items available in your library.
              </div>
            </div>
          </div>
        ) : isCompleted ? (
          /* Completion Celebration View */
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{ fontSize: "54px", marginBottom: "12px" }}>🎉</div>
            <h2 style={{ fontSize: "28px", fontWeight: 900, marginBottom: "12px" }}>
              SESSION COMPLETE!
            </h2>
            <p style={{ fontSize: "15px", fontWeight: 800, color: "#333", marginBottom: "24px" }}>
              YOU COMPLETED {completedCount} ITEMS IN YOUR {targetMins}-MINUTE FOCUS SLOT!
            </p>
            <button
              onClick={onClose}
              style={{
                background: "#B6FF3C",
                color: "#000",
                border: "3px solid #000",
                boxShadow: "4px 4px 0 #000",
                padding: "14px 32px",
                fontWeight: 800,
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              RETURN TO HOARD
            </button>
          </div>
        ) : (
          /* Active Focus Item View */
          <div>
            {/* Header progress */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "3px solid #000",
                paddingBottom: "12px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    background: "#FFE600",
                    border: "2px solid #000",
                    padding: "4px 10px",
                    fontWeight: 800,
                    fontSize: "12px",
                  }}
                >
                  ITEM {currentIndex + 1} OF {queue.length}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 800 }}>
                  SESSION: {targetMins} MINS
                </span>
              </div>

              {/* Live countdown timer */}
              <div
                style={{
                  background: "#000",
                  color: "#B6FF3C",
                  border: "2px solid #000",
                  padding: "4px 14px",
                  fontFamily: "var(--mono)",
                  fontWeight: 900,
                  fontSize: "20px",
                  boxShadow: "2px 2px 0 #000",
                }}
              >
                ⏱️ {formatTimer(secondsRemaining)}
              </div>
            </div>

            {/* Current Item Card */}
            {currentItem && (
              <div
                style={{
                  border: "3px solid #000",
                  background: "#FFF",
                  boxShadow: "5px 5px 0 #000",
                  padding: "20px",
                  marginBottom: "24px",
                }}
              >
                {currentItem.parentTitle && (
                  <div
                    style={{
                      background: "#FFE600",
                      border: "1px solid #000",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontWeight: 800,
                      display: "inline-block",
                      marginBottom: "8px",
                    }}
                  >
                    ⚡ CHAPTER FROM: {currentItem.parentTitle}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <span
                    style={{
                      background: "#00F0FF",
                      border: "1px solid #000",
                      padding: "2px 6px",
                      fontSize: "11px",
                      fontWeight: 800,
                    }}
                  >
                    {currentItem.ty}
                  </span>
                  <span style={{ fontSize: "12px", color: "#666", fontWeight: 700 }}>
                    {currentItem.src} • {currentItem.mins} min read/watch
                  </span>
                </div>

                <h3 style={{ fontSize: "20px", fontWeight: 800, lineHeight: 1.3, marginBottom: "14px" }}>
                  {currentItem.t}
                </h3>

                {currentItem.note && (
                  <div
                    style={{
                      background: "var(--cream)",
                      border: "1px solid #000",
                      padding: "8px 12px",
                      fontSize: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    📝 {currentItem.note}
                  </div>
                )}

                <a
                  href={currentItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#00F0FF",
                    color: "#000",
                    border: "2px solid #000",
                    boxShadow: "3px 3px 0 #000",
                    padding: "8px 16px",
                    fontWeight: 800,
                    fontSize: "13px",
                    textDecoration: "none",
                  }}
                >
                  OPEN ITEM IN NEW TAB <ExternalLink size={14} />
                </a>
              </div>
            )}

            {/* Controls Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                style={{
                  background: "#FFFDF8",
                  border: "2px solid #000",
                  boxShadow: "3px 3px 0 #000",
                  padding: "10px 16px",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                {isTimerRunning ? "PAUSE TIMER" : "RESUME TIMER"}
              </button>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => handleNext(false)}
                  style={{
                    background: "#FFFDF8",
                    border: "2px solid #000",
                    boxShadow: "3px 3px 0 #000",
                    padding: "10px 16px",
                    fontWeight: 800,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <SkipForward size={16} /> SKIP
                </button>

                <button
                  onClick={() => handleNext(true)}
                  style={{
                    background: "#B6FF3C",
                    border: "3px solid #000",
                    boxShadow: "4px 4px 0 #000",
                    padding: "10px 20px",
                    fontWeight: 800,
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <CheckCircle size={18} /> MARK DONE & NEXT →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
