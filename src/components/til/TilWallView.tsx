"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { tilTypeValues, type TilType } from "@/db/schema";
import { decodeWallAggregate, type WallWireFormat } from "@/lib/til/wallWireFormat";
import {
  WALL_ZOOM_MIN,
  WALL_ZOOM_MAX,
  WALL_ZOOM_DEFAULT,
  WALL_ROLLING_DAYS,
  WALL_VIRTUALIZE_THRESHOLD,
  getWallMode,
  shouldVirtualizeWall,
  clampWallZoom,
  zoomForMode,
  tileHeightForZoom,
  computeWallGridMetrics,
  computeVisibleDayRange,
  type WallMode,
} from "@/lib/til/wallZoom";
import { tilTypeColorVar, tilTypeInitial } from "@/lib/til/typeColorTokens";
import { useReducedMotion } from "@/lib/useReducedMotion";

const URL_SYNC_DEBOUNCE_MS = 150;
const ENTRIES_FETCH_DEBOUNCE_MS = 150;

interface DayCell {
  date: string; // YYYY-MM-DD
  count: number;
  dominantType: TilType | null;
}

interface DayEntryBody {
  type: TilType;
  body: string | null;
}

function buildRollingDays(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = WALL_ROLLING_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  return days;
}

export function TilWallView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();

  const urlZoom = clampWallZoom(Number(searchParams.get("zoom")) || WALL_ZOOM_DEFAULT);
  const [zoom, setZoom] = useState(urlZoom);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const pendingZoomRef = useRef<number | null>(null);
  const zoomRafScheduledRef = useRef(false);
  const scheduleZoomUpdate = useCallback((value: number) => {
    pendingZoomRef.current = value;
    if (!zoomRafScheduledRef.current) {
      zoomRafScheduledRef.current = true;
      requestAnimationFrame(() => {
        zoomRafScheduledRef.current = false;
        if (pendingZoomRef.current !== null) {
          setZoom(pendingZoomRef.current);
          pendingZoomRef.current = null;
        }
      });
    }
  }, []);

  const mode: WallMode = getWallMode(zoom);

  const [aggregate, setAggregate] = useState<WallWireFormat | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryBodies, setEntryBodies] = useState<Map<string, DayEntryBody>>(new Map());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(520);

  const days = useMemo(() => buildRollingDays(), []);

  const dayCells: DayCell[] = useMemo(() => {
    const byDate = aggregate ? decodeWallAggregate(aggregate) : [];
    const lookup = new Map(byDate.map((d) => [d.loggedFor, d]));
    return days.map((date) => {
      const row = lookup.get(date);
      return { date, count: row?.count ?? 0, dominantType: row?.dominantType ?? null };
    });
  }, [days, aggregate]);

  const activeDays = dayCells.filter((d) => d.count > 0).length;
  const totalEntries = dayCells.reduce((sum, d) => sum + d.count, 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/til/wall", { credentials: "include" });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as WallWireFormat;
          setAggregate(data);
        }
      } catch (e) {
        console.error("Failed to load Wall aggregate", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("zoom", String(zoom));
      router.replace(`/til?${params.toString()}`, { scroll: false });
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const virtualize = shouldVirtualizeWall(zoom);
  const gridMetrics = useMemo(
    () => computeWallGridMetrics(days.length, containerWidth, zoom, mode, 4),
    [days.length, containerWidth, zoom, mode]
  );

  const visibleRange = useMemo(() => {
    if (!virtualize) return { startIndex: 0, endIndex: days.length };
    return computeVisibleDayRange(gridMetrics, scrollTop, viewportHeight, days.length);
  }, [virtualize, gridMetrics, scrollTop, viewportHeight, days.length]);

  useEffect(() => {
    if (mode !== "content") return;
    const visibleDates = days.slice(visibleRange.startIndex, visibleRange.endIndex);
    const hasMissing = visibleDates.some((d, i) => {
      const cell = dayCells[visibleRange.startIndex + i];
      return (cell?.count ?? 0) > 0 && !entryBodies.has(d);
    });
    if (!hasMissing) return;

    const from = visibleDates[0];
    const to = visibleDates[visibleDates.length - 1];
    if (!from || !to) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/til/wall/entries?from=${from}&to=${to}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json();
        setEntryBodies((prev) => {
          const next = new Map(prev);
          for (const item of data.items as Array<{ loggedFor: string; type: TilType; body: string | null }>) {
            if (!next.has(item.loggedFor)) {
              next.set(item.loggedFor, { type: item.type, body: item.body });
            }
          }
          return next;
        });
      } catch (e) {
        console.error("Failed to load Wall entries for viewport", e);
      }
    }, ENTRIES_FETCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [mode, visibleRange.startIndex, visibleRange.endIndex, dayCells, entryBodies, days]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "+" || e.key === "=") {
        setZoom((z) => clampWallZoom(z + 4));
      } else if (e.key === "-" || e.key === "_") {
        setZoom((z) => clampWallZoom(z - 4));
      } else if (e.key === "1") {
        setZoom(zoomForMode("rhythm"));
      } else if (e.key === "2") {
        setZoom(zoomForMode("composition"));
      } else if (e.key === "3") {
        setZoom(zoomForMode("content"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pinchRef = useRef<{ startDistance: number; startZoom: number } | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      pinchRef.current = { startDistance: getTouchDistance(e.touches), startZoom: zoomRef.current };
    }
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const scale = distance / pinchRef.current.startDistance;
      scheduleZoomUpdate(clampWallZoom(pinchRef.current.startZoom * scale));
    }
  };
  const handleTouchEnd = () => {
    pinchRef.current = null;
  };

  const tileTransition = reducedMotion ? "none" : "transform 120ms, box-shadow 120ms";

  const handleSelectDayTile = (dateStr: string) => {
    router.push(`/til?day=${encodeURIComponent(dateStr)}`);
  };

  const renderTile = (cell: DayCell, style: React.CSSProperties) => {
    const height = tileHeightForZoom(zoom, mode);

    if (cell.count === 0) {
      return (
        <div
          key={cell.date}
          title={`${cell.date} — No entries`}
          style={{
            ...style,
            width: zoom,
            height,
            border: "1px solid var(--ink)",
            opacity: 0.14,
            boxSizing: "border-box",
          }}
        />
      );
    }

    const type = cell.dominantType as TilType;
    const color = tilTypeColorVar(type);
    const entry = entryBodies.get(cell.date);

    if (mode === "rhythm") {
      const opacity = Math.min(1, 0.45 + cell.count * 0.2);
      return (
        <div
          key={cell.date}
          role="button"
          tabIndex={0}
          onClick={() => handleSelectDayTile(cell.date)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelectDayTile(cell.date);
            }
          }}
          title={`${cell.date} — ${cell.count} ${cell.count === 1 ? "entry" : "entries"} (click to open day)`}
          style={{
            ...style,
            width: zoom,
            height,
            background: color,
            opacity,
            border: "1.5px solid var(--ink)",
            boxSizing: "border-box",
            cursor: "pointer",
            transition: tileTransition,
          }}
        />
      );
    }

    if (mode === "composition") {
      return (
        <div
          key={cell.date}
          role="button"
          tabIndex={0}
          onClick={() => handleSelectDayTile(cell.date)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelectDayTile(cell.date);
            }
          }}
          title={`${cell.date} — ${type} (${cell.count}) — click to open day`}
          style={{
            ...style,
            width: zoom,
            height,
            background: color,
            border: "1.5px solid var(--ink)",
            boxSizing: "border-box",
            position: "relative",
            cursor: "pointer",
            transition: tileTransition,
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 2,
              top: 1,
              fontFamily: "var(--mono)",
              fontSize: 8,
              fontWeight: 800,
              opacity: 0.9,
              color: "#0A0A0A",
            }}
          >
            {tilTypeInitial(type)}
            {cell.count > 1 ? cell.count : ""}
          </span>
        </div>
      );
    }

    // content mode
    return (
      <div
        key={cell.date}
        role="button"
        tabIndex={0}
        onClick={() => handleSelectDayTile(cell.date)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelectDayTile(cell.date);
          }
        }}
        title={`Open ${cell.date} in Stream`}
        style={{
          ...style,
          width: zoom,
          height,
          background: "var(--card)",
          border: "2px solid var(--ink)",
          boxSizing: "border-box",
          padding: "6px 7px",
          overflow: "hidden",
          cursor: "pointer",
          transition: tileTransition,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 8,
              fontWeight: 800,
              border: "1px solid var(--ink)",
              background: color,
              padding: "0 4px",
              color: "#0A0A0A",
            }}
          >
            {entry?.type || type}
          </span>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 8,
              fontWeight: 800,
              opacity: 0.65,
              color: "var(--ink)",
            }}
          >
            {cell.date.slice(5)}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.3,
            fontWeight: 600,
            color: "var(--ink)",
            display: "-webkit-box",
            WebkitLineClamp: 5,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {entry?.body ?? "…"}
        </div>
      </div>
    );
  };

  return (
    <div className="til-wall-container">
      {/* Masthead */}
      <header className="til-secondary-masthead">
        <div className="til-secondary-masthead__left">
          <div className="til-secondary-masthead__title-row">
            <h2 className="til-secondary-masthead__title">WALL // 365-DAY KNOWLEDGE MATRIX</h2>
            <span className="til-secondary-masthead__badge">SEMANTIC ZOOM</span>
          </div>
          <p className="til-secondary-masthead__desc">
            Continuous 365-day density overview. Zoom smoothly from heat rhythm to archetype initials and full daily claim cards, or click any active date tile to open that day.
          </p>
        </div>

        <div className="til-secondary-masthead__right">
          <div className="til-secondary-telemetry">
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{days.length}</span>
              <span className="til-secondary-stat__lbl">DAYS</span>
            </div>
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{totalEntries}</span>
              <span className="til-secondary-stat__lbl">ENTRIES</span>
            </div>
            <div className="til-secondary-stat">
              <span className="til-secondary-stat__val">{activeDays}</span>
              <span className="til-secondary-stat__lbl">ACTIVE DAYS</span>
            </div>
          </div>
        </div>
      </header>

      <div className="til-wall-card">
        {/* Control Bar */}
        <div className="til-wall-hud-header">
          <div className="til-wall-hud-left">
            <span className="til-wall-hud-label">TILE SCALE</span>
            <input
              type="range"
              min={WALL_ZOOM_MIN}
              max={WALL_ZOOM_MAX}
              value={zoom}
              onChange={(e) => scheduleZoomUpdate(clampWallZoom(Number(e.target.value)))}
              className="wall-zoom-slider"
              aria-label="Wall zoom"
            />
            <span className="til-wall-zoom-val">{zoom}PX</span>
          </div>

          <div className="til-wall-modes">
            <button
              type="button"
              className={`til-wall-mode-btn ${mode === "rhythm" ? "on" : ""}`}
              onClick={() => setZoom(zoomForMode("rhythm"))}
              title="Rhythm view (heat blocks)"
            >
              RHYTHM [1]
            </button>
            <button
              type="button"
              className={`til-wall-mode-btn ${mode === "composition" ? "on" : ""}`}
              onClick={() => setZoom(zoomForMode("composition"))}
              title="Composition view (type initials)"
            >
              COMPOSITION [2]
            </button>
            <button
              type="button"
              className={`til-wall-mode-btn ${mode === "content" ? "on" : ""}`}
              onClick={() => setZoom(zoomForMode("content"))}
              title="Content view (snippets & claim text)"
            >
              CONTENT [3]
            </button>
          </div>

          {/* Archetype Legend */}
          <div className="til-wall-legend">
            {tilTypeValues.map((t) => (
              <span key={t} className="til-wall-legend__item">
                <i
                  className="til-wall-legend__swatch"
                  style={{ background: tilTypeColorVar(t) }}
                />
                <span>{t}</span>
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="til-wall-loading">LOADING 365-DAY KNOWLEDGE WALL...</div>
        ) : (
          <div
            ref={containerRef}
            onScroll={virtualize ? handleScroll : undefined}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="til-wall-viewport"
            style={{
              padding: 16,
              maxHeight: 540,
              overflowY: "auto",
              display: virtualize ? "block" : "flex",
              flexWrap: virtualize ? undefined : "wrap",
              gap: virtualize ? undefined : 4,
              position: "relative",
            }}
          >
            {virtualize ? (
              <div style={{ position: "relative", width: "100%", height: gridMetrics.totalHeight }}>
                {days.slice(visibleRange.startIndex, visibleRange.endIndex).map((_date, i) => {
                  const globalIndex = visibleRange.startIndex + i;
                  const row = Math.floor(globalIndex / gridMetrics.columnsPerRow);
                  const col = globalIndex % gridMetrics.columnsPerRow;
                  return renderTile(dayCells[globalIndex], {
                    position: "absolute",
                    top: row * gridMetrics.rowHeight,
                    left: col * (zoom + 4),
                  });
                })}
              </div>
            ) : (
              dayCells.map((cell) => renderTile(cell, {}))
            )}
          </div>
        )}
      </div>

      <div className="til-secondary-footer-bar">
        <span className="til-info-tag">VIRTUALIZATION ENGINE</span>
        <span>
          {WALL_VIRTUALIZE_THRESHOLD}px+ tiles virtualize automatically for 60fps scrolling. Press keys{" "}
          <b>[1]</b>, <b>[2]</b>, or <b>[3]</b> to jump between Rhythm, Composition, and Content views, or click any tile to inspect that day.
        </span>
      </div>
    </div>
  );
}
