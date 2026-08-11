"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ConstellationGraph,
  ConstellationNode,
  ConstellationEdge,
  ConstellationHubNode,
  ConstellationSatelliteNode,
} from "@/lib/til/constellationLayout";
import { CONSTELLATION_TIER_2_THRESHOLD } from "@/lib/til/constellationLayout";
import { buildQuadtree, Quadtree } from "@/lib/til/quadtree";
import { useReducedMotion } from "@/lib/useReducedMotion";

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 520;

type Positions = Record<string, { x: number; y: number }>;
type ApiTier = "full" | "hubs-only" | "neighborhood";

interface WorkerMessage {
  type: "tick" | "done";
  positions: Positions;
}

function isHub(node: ConstellationNode): node is ConstellationHubNode {
  return node.kind === "hub";
}

function satelliteVisual(satellite: ConstellationSatelliteNode) {
  return {
    opacity: Math.max(0.12, satellite.confidence / 100),
    radius: 4 + satellite.confidence / 34,
  };
}

function resolveThemeColor(el: Element, varName: string): string {
  return getComputedStyle(el).getPropertyValue(varName).trim() || "#888888";
}

export function TilConstellationView() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const [apiTier, setApiTier] = useState<ApiTier>("full");
  const [graph, setGraph] = useState<ConstellationGraph | null>(null);
  const [positions, setPositions] = useState<Positions>({});
  const [settled, setSettled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedHub, setExpandedHub] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const quadtreeRef = useRef<Quadtree | null>(null);

  const [renderedFromCache, setRenderedFromCache] = useState(false);

  const runSimulation = useCallback((nodes: ConstellationNode[], edges: ConstellationEdge[], persist: boolean) => {
    workerRef.current?.terminate();
    setSettled(false);
    setRenderedFromCache(false);

    const worker = new Worker(new URL("../../workers/constellation.worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === "tick") {
        // Reduced motion: ignore intermediate frames, only ever render the
        // final settled layout (SPECTACLE.md §3).
        if (!reducedMotionRef.current) setPositions(event.data.positions);
      } else {
        setPositions(event.data.positions);
        setSettled(true);
        // Cache the settled layout (Phase 10) so the next unscoped load can
        // skip simulation entirely — only for the default graph, never a hub
        // neighborhood, which the cache table doesn't key on.
        if (persist) {
          fetch("/api/til/constellation/layout", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ positions: event.data.positions }),
          }).catch((e) => console.error("Failed to persist Constellation layout", e));
        }
      }
    };

    worker.postMessage({ type: "simulate", nodes, edges });
  }, []);

  const loadGraph = useCallback(
    async (hubTag?: string) => {
      setLoading(true);
      try {
        const url = hubTag ? `/api/til/constellation?hub=${encodeURIComponent(hubTag)}` : "/api/til/constellation";
        // no-store: the unscoped response's cached/positions fields must
        // always reflect the current DB state, never a browser-cached one.
        const res = await fetch(url, { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ConstellationGraph & {
          tier: ApiTier;
          cached?: boolean;
          positions?: Positions;
        };
        setGraph({ nodes: data.nodes, edges: data.edges });
        setApiTier(data.tier);
        setHoveredId(null);

        if (!hubTag && data.cached && data.positions) {
          // Layout cache hit (Phase 10): render the settled positions
          // instantly, no Worker, no physics.
          workerRef.current?.terminate();
          workerRef.current = null;
          setPositions(data.positions);
          setSettled(true);
          setRenderedFromCache(true);
        } else {
          runSimulation(data.nodes, data.edges, !hubTag);
        }
      } catch (e) {
        console.error("Failed to load Constellation graph", e);
      } finally {
        setLoading(false);
      }
    },
    [runSimulation]
  );

  useEffect(() => {
    // Deferred a microtask out: loadGraph's first line sets loading state
    // synchronously (needed so it can be re-invoked from the hub-expand click
    // handler), which react-hooks/set-state-in-effect flags if called
    // directly from the effect body itself.
    Promise.resolve().then(() => loadGraph());
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nodesById = useMemo(() => {
    const map = new Map<string, ConstellationNode>();
    if (graph) for (const n of graph.nodes) map.set(n.id, n);
    return map;
  }, [graph]);

  // Node count decides SVG (tier 1) vs Canvas+quadtree (tier 2) hover
  // handling — SVG's per-element listeners are where 150+ nodes get slow.
  const renderMode: "hubs" | "svg" | "canvas" = useMemo(() => {
    if (apiTier === "hubs-only" && !expandedHub) return "hubs";
    if (!graph) return "svg";
    return graph.nodes.length >= CONSTELLATION_TIER_2_THRESHOLD ? "canvas" : "svg";
  }, [apiTier, expandedHub, graph]);

  const handleHubClick = (hub: ConstellationHubNode) => {
    if (apiTier === "hubs-only" && !expandedHub) {
      setExpandedHub(hub.tag);
      loadGraph(hub.tag);
      return;
    }
    router.push(`/til?view=codex&topic=${encodeURIComponent(hub.tag)}`);
  };

  const handleBackToOverview = () => {
    setExpandedHub(null);
    loadGraph();
  };

  // CSS `var()` tokens repaint themselves automatically on a theme switch,
  // but the Canvas path resolves them into literal color strings once at
  // draw time (Canvas can't consume var() directly) — without watching for
  // theme changes, switching themes would leave the previous theme's colors
  // baked into the canvas until something else forces a redraw.
  const [themeTick, setThemeTick] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((t) => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // ── Canvas draw + quadtree rebuild (tier 2) ─────────────────────────────
  useEffect(() => {
    if (renderMode !== "canvas" || !graph) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr * (cssWidth / VIEW_WIDTH), 0, 0, dpr * (cssHeight / VIEW_HEIGHT), 0, 0);
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const bgColor = resolveThemeColor(container, "--constellation-bg");
    const nodeColor = resolveThemeColor(container, "--constellation-node");
    const hubColor = resolveThemeColor(container, "--constellation-hub");
    const warnColor = resolveThemeColor(container, "--constellation-warn");

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    for (const edge of graph.edges) {
      const a = positions[edge.source];
      const b = positions[edge.target];
      if (!a || !b) continue;
      const isSupersession = edge.kind === "supersession";
      const isHot = hoveredId && (edge.source === hoveredId || edge.target === hoveredId) && !isSupersession;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isSupersession ? warnColor : isHot ? hubColor : nodeColor;
      ctx.globalAlpha = isSupersession ? 0.85 : isHot ? 0.9 : 0.15;
      ctx.lineWidth = isSupersession ? 1.6 : isHot ? 2 : 1;
      if (isSupersession) ctx.setLineDash([4, 3]);
      else ctx.setLineDash([]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const quadPoints: { id: string; x: number; y: number; radius: number }[] = [];

    for (const node of graph.nodes) {
      const pos = positions[node.id];
      if (!pos) continue;

      if (isHub(node)) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = hubColor;
        ctx.fill();
        ctx.strokeStyle = bgColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        quadPoints.push({ id: node.id, x: pos.x, y: pos.y, radius: node.radius });
      } else {
        const { opacity, radius } = satelliteVisual(node);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = nodeColor;
        ctx.fill();
        ctx.globalAlpha = 1;
        quadPoints.push({ id: node.id, x: pos.x, y: pos.y, radius: Math.max(radius, 6) });
      }
    }

    quadtreeRef.current = buildQuadtree(quadPoints, { x0: 0, y0: 0, x1: VIEW_WIDTH, y1: VIEW_HEIGHT });
  }, [renderMode, graph, positions, hoveredId, themeTick]);

  const canvasToViewCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
    return { x, y };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasToViewCoords(e);
    const found = quadtreeRef.current?.findAt(x, y);
    setHoveredId(found?.id ?? null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasToViewCoords(e);
    const found = quadtreeRef.current?.findAt(x, y);
    if (!found) return;
    const node = nodesById.get(found.id);
    if (node && isHub(node)) handleHubClick(node);
  };

  const renderEdgeSvg = (edge: ConstellationEdge, i: number) => {
    const a = positions[edge.source];
    const b = positions[edge.target];
    if (!a || !b) return null;

    const isHot = hoveredId && (edge.source === hoveredId || edge.target === hoveredId) && edge.kind !== "supersession";
    const isSupersession = edge.kind === "supersession";

    return (
      <line
        key={i}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={isSupersession ? "var(--constellation-warn)" : isHot ? "var(--constellation-hub)" : "var(--constellation-node)"}
        strokeOpacity={isSupersession ? 0.85 : isHot ? 0.9 : 0.18}
        strokeWidth={isSupersession ? 1.6 : isHot ? 2 : 1}
        strokeDasharray={isSupersession ? "4 3" : undefined}
      />
    );
  };

  const renderNodeSvg = (node: ConstellationNode) => {
    const pos = positions[node.id];
    if (!pos) return null;

    if (isHub(node)) {
      return (
        <g
          key={node.id}
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setHoveredId(node.id)}
          onMouseLeave={() => setHoveredId((h) => (h === node.id ? null : h))}
          onClick={() => handleHubClick(node)}
        >
          <circle cx={pos.x} cy={pos.y} r={node.radius} fill="var(--constellation-hub)" stroke="var(--constellation-bg)" strokeWidth={2} />
          <text x={pos.x} y={pos.y + 3.5} textAnchor="middle" fontFamily="var(--mono)" fontSize={10.5} fontWeight={800} fill="var(--constellation-bg)">
            {node.entryCount}
          </text>
          <text x={pos.x} y={pos.y + node.radius + 13} textAnchor="middle" fontFamily="var(--mono)" fontSize={9} fontWeight={800} fill="var(--constellation-node)" opacity={0.65}>
            {node.tag}
          </text>
        </g>
      );
    }

    const { opacity, radius } = satelliteVisual(node);

    return (
      <g
        key={node.id}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHoveredId(node.id)}
        onMouseLeave={() => setHoveredId((h) => (h === node.id ? null : h))}
      >
        <circle
          cx={pos.x}
          cy={pos.y}
          r={radius}
          fill="var(--constellation-node)"
          fillOpacity={opacity}
          strokeDasharray={node.superseded ? "2 2" : undefined}
          stroke={node.superseded ? "var(--constellation-warn)" : undefined}
          strokeWidth={node.superseded ? 1 : undefined}
        />
      </g>
    );
  };

  const hoveredNode = hoveredId ? nodesById.get(hoveredId) : null;
  const hoveredPos = hoveredId ? positions[hoveredId] : null;

  return (
    <div>
      {expandedHub && (
        <button
          type="button"
          onClick={handleBackToOverview}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            fontWeight: 800,
            border: "var(--bd)",
            background: "var(--paper)",
            color: "var(--ink)",
            padding: "5px 10px",
            marginBottom: 8,
            cursor: "pointer",
          }}
        >
          ← ALL TOPICS
        </button>
      )}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          border: "var(--bd)",
          background: "var(--constellation-bg)",
          boxShadow: "var(--sh)",
          height: 520,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 13,
              fontWeight: 800,
              color: "var(--constellation-node)",
            }}
          >
            SETTLING CONSTELLATION...
          </div>
        ) : (
          <>
            {renderMode === "canvas" ? (
              <canvas
                ref={canvasRef}
                onMouseMove={handleCanvasMouseMove}
                onMouseLeave={() => setHoveredId(null)}
                onClick={handleCanvasClick}
                style={{ display: "block", width: "100%", height: "100%", cursor: hoveredId ? "pointer" : "default" }}
              />
            ) : (
              <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width="100%" height="100%" style={{ display: "block" }}>
                {graph?.edges.map(renderEdgeSvg)}
                {graph?.nodes.map(renderNodeSvg)}
              </svg>
            )}

            {hoveredNode && hoveredPos && (
              <div
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  left: `${(hoveredPos.x / VIEW_WIDTH) * 100}%`,
                  top: `${Math.max(1, ((hoveredPos.y - 40) / VIEW_HEIGHT) * 100)}%`,
                  transform: hoveredPos.x > VIEW_WIDTH * 0.7 ? "translateX(-100%)" : undefined,
                  background: "var(--paper)",
                  border: "2px solid var(--ink)",
                  boxShadow: "var(--sh-sm)",
                  padding: "9px 11px",
                  maxWidth: 280,
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: "var(--ink)",
                  zIndex: 5,
                }}
              >
                {isHub(hoveredNode) ? (
                  <>
                    <b style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                      TOPIC · {hoveredNode.entryCount} ENTRIES
                    </b>
                    #{hoveredNode.tag}
                  </>
                ) : (
                  <>
                    <b style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>
                      {hoveredNode.type} · #{hoveredNode.shortHash} · CONF {hoveredNode.confidence}%
                    </b>
                    {hoveredNode.bodyPreview}
                  </>
                )}
              </div>
            )}

            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 12,
                fontFamily: "var(--mono)",
                fontSize: 9,
                fontWeight: 700,
                color: "var(--constellation-node)",
                opacity: 0.65,
                lineHeight: 1.9,
                letterSpacing: "0.06em",
              }}
            >
              <span style={{ display: "inline-block", width: 9, height: 9, background: "var(--constellation-hub)", border: "1px solid var(--constellation-bg)", verticalAlign: -1, marginRight: 5 }} />
              TOPIC HUB · SIZE = ENTRY COUNT
              <br />
              <span style={{ display: "inline-block", width: 9, height: 9, background: "var(--constellation-node)", border: "1px solid var(--constellation-bg)", verticalAlign: -1, marginRight: 5 }} />
              ENTRY · OPACITY = CONFIDENCE
              <br />
              <span style={{ display: "inline-block", width: 9, height: 9, background: "var(--constellation-warn)", border: "1px solid var(--constellation-bg)", verticalAlign: -1, marginRight: 5 }} />
              SUPERSESSION EDGE
            </div>

            {renderMode === "hubs" && (
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 12,
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "var(--constellation-node)",
                  opacity: 0.65,
                }}
              >
                {graph?.nodes.length} TOPICS · CLICK ONE TO EXPAND
              </div>
            )}
          </>
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
        The useful read is the dim clusters — a topic with several faded satellites is a subject you
        researched hard and mostly forgot.{" "}
        {renderedFromCache
          ? "Layout restored from cache — no simulation needed."
          : `Simulation runs off the main thread in a Web Worker${settled ? " and has settled." : "..."}`}
        {renderMode === "canvas" && " Rendering to Canvas with quadtree hit-testing at this scale."}
      </div>
    </div>
  );
}
