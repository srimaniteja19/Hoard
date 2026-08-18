"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TilType } from "@/db/schema";
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

  // Coalesce rapid slider/pinch input into at most one state update per
  // animation frame. Without this, each native `input` event (which can fire
  // far faster than 60/s) drives its own synchronous re-render — and content
  // mode's virtualized window shifts enough per zoom step that most tiles
  // unmount/remount rather than cheaply restyle in place, compounding badly
  // under a fast drag.
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

  // ── Fetch the aggregate exactly once on mount ──────────────────────────────
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

  // ── Measure container width ─────────────────────────────────────────────
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

  // ── Debounced URL sync (never on the hot drag path) ─────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("zoom", String(zoom));
      router.replace(`/til?${params.toString()}`, { scroll: false });
    }, URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // router/searchParams intentionally excluded: including them would reset
    // this debounce timer on every navigation, not just on zoom changes.
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

  // ── content mode: fetch bodies for the visible range, debounced ─────────
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
    // Re-runs when dayCells changes (e.g. the aggregate finishes loading after
    // this effect's first, premature bail-out) and when entryBodies changes
    // (to re-check whether anything visible is still missing after a fetch
    // resolves) — both intentional, not exhaustive-deps oversights.
  }, [mode, visibleRange.startIndex, visibleRange.endIndex, dayCells, entryBodies, days]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // ── Keyboard: +/- step, 1/2/3 jump to mode ──────────────────────────────
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

  // ── Touch: pinch to zoom ─────────────────────────────────────────────────
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

  const renderTile = (cell: DayCell, style: React.CSSProperties) => {
    const height = tileHeightForZoom(zoom, mode);

    if (cell.count === 0) {
      return (
        <div
          key={cell.date}
          title={cell.date}
          style={{
            ...style,
            width: zoom,
            height,
            border: "1px solid var(--ink)",
            opacity: 0.15,
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
          title={`${cell.date} — ${cell.count} ${cell.count === 1 ? "entry" : "entries"}`}
          style={{
            ...style,
            width: zoom,
            height,
            background: color,
            opacity,
            border: "2px solid var(--ink)",
            boxSizing: "border-box",
            transition: tileTransition,
          }}
        />
      );
    }

    if (mode === "composition") {
      return (
        <div
          key={cell.date}
          title={cell.date}
          style={{
            ...style,
            width: zoom,
            height,
            background: color,
            border: "2px solid var(--ink)",
            boxSizing: "border-box",
            position: "relative",
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
              opacity: 0.85,
              color: "var(--ink)",
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
        style={{
          ...style,
          width: zoom,
          height,
          background: color,
          border: "2px solid var(--ink)",
          boxSizing: "border-box",
          padding: "6px 7px",
          overflow: "hidden",
          transition: tileTransition,
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 8,
            fontWeight: 800,
            border: "2px solid var(--ink)",
            background: "var(--paper)",
            padding: "0 4px",
            display: "inline-block",
            marginBottom: 4,
            color: "var(--ink)",
          }}
        >
          {entry?.type || type}
        </span>
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
    <div>
      <div
        style={{
          border: "var(--bd)",
          background: "var(--paper)",
          boxShadow: "var(--sh)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "11px 14px",
            borderBottom: "var(--bd)",
            background: "var(--cream)",
          }}
        >
          <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", opacity: 0.6 }}>
            ZOOM
          </span>
          <input
            type="range"
            min={WALL_ZOOM_MIN}
            max={WALL_ZOOM_MAX}
            value={zoom}
            onChange={(e) => scheduleZoomUpdate(clampWallZoom(Number(e.target.value)))}
            className="wall-zoom-slider"
            aria-label="Wall zoom"
          />
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 800 }}>
            {zoom}px · {mode.toUpperCase()}
          </span>
          <span className="wall-zoom-meta" style={{ fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", opacity: 0.6 }}>
            {days.length} DAYS · {totalEntries} ENTRIES · {activeDays} ACTIVE
          </span>
        </div>

        {loading ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            LOADING YEAR WALL...
          </div>
        ) : (
          <div
            ref={containerRef}
            onScroll={virtualize ? handleScroll : undefined}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              padding: 14,
              maxHeight: 520,
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
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11.5,
          lineHeight: 1.7,
          borderLeft: "5px solid var(--pink)",
          background: "var(--paper)",
          border: "2px solid var(--ink)",
          borderLeftWidth: 5,
          padding: "11px 13px",
          marginTop: 16,
        }}
      >
        {WALL_VIRTUALIZE_THRESHOLD}px+ tiles virtualize to the visible viewport plus one screen of buffer.
        Below that, all {days.length} days render at once. Content-mode bodies are fetched only for days
        currently in view.
      </div>
    </div>
  );
}
