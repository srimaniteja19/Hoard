export interface InkPoint {
  x: number;
  y: number;
  p: number; // Pressure: 0.0 to 1.0 (default ~0.5 for mouse)
}

export type InkToolType = "pen" | "hi" | "er";

export interface InkStroke {
  t: InkToolType;
  c: string; // Color hex
  w: number; // Width
  pts: InkPoint[];
}

export interface InkTool {
  t: InkToolType;
  c: string;
  w: number;
}

export interface InkEngineOptions {
  onCount?: (count: number) => void;
  onDirty?: () => void;
  onPen?: () => void;
}

/**
 * Standard vector sketch assets for default notes or demo blocks
 */
export const SAMPLE_SKETCHES: Record<string, string> = {
  q: '<svg viewBox="0 0 460 78" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#0A0A0A" stroke-width="2.3" stroke-linecap="round">' +
    '<path d="M14 40 C 22 24, 36 22, 42 32 C 48 44, 36 50, 34 42 C 33 30, 44 20, 56 26"/>' +
    '<path d="M70 22 L 70 46 M70 54 L 70 56"/></g>' +
    '<text x="86" y="34" font-family="Caveat,cursive" font-size="27" fill="#0A0A0A">is wear better than a number?</text>' +
    '<text x="86" y="62" font-family="Caveat,cursive" font-size="27" fill="#FF3D8A">both — wear first, count on hover</text>' +
    '<g fill="none" stroke="#FF3D8A" stroke-width="2.6" stroke-linecap="round">' +
    '<path d="M70 58 C 90 70, 260 70, 330 60"/></g></svg>',

  d: '<svg viewBox="0 0 460 96" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#0A0A0A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M18 20 C 110 16, 210 20, 300 17 C 303 42, 302 70, 300 86 C 210 89, 110 85, 20 87 C 16 62, 18 38, 18 20 Z"/>' +
    '<path d="M40 40 C 100 37, 160 40, 214 38 C 217 52, 216 66, 214 74 C 160 76, 100 73, 42 75 C 38 62, 40 50, 40 40 Z"/></g>' +
    '<g fill="none" stroke="#7B5CF0" stroke-width="3" stroke-linecap="round">' +
    '<path d="M318 52 C 350 52, 380 52, 412 52 M400 44 L 414 52 L 400 60"/></g>' +
    '<text x="50" y="34" font-family="Caveat,cursive" font-size="22" fill="#0A0A0A">ancestor</text>' +
    '<text x="60" y="60" font-family="Caveat,cursive" font-size="23" fill="#7B5CF0">blend lives here</text>' +
    '<text x="322" y="82" font-family="Caveat,cursive" font-size="21" fill="#7B5CF0">wrong backdrop</text></svg>',

  fix: '<svg viewBox="0 0 500 108" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#A8E85C" stroke-width="16" stroke-linecap="round" opacity=".5" style="mix-blend-mode:multiply">' +
    '<path d="M32 48 C 140 44, 250 50, 344 46"/></g>' +
    '<text x="32" y="56" font-family="Space Mono,monospace" font-size="18" font-weight="700" fill="#0A0A0A">.card { isolation: isolate }</text>' +
    '<g fill="none" stroke="#FF3D8A" stroke-width="2.8" stroke-linecap="round">' +
    '<path d="M28 70 C 140 84, 268 80, 366 68 M356 60 L 370 68 L 354 76"/></g>' +
    '<text x="112" y="100" font-family="Caveat,cursive" font-size="21" fill="#FF3D8A">now it has a known backdrop</text></svg>',

  marg: '<svg viewBox="0 0 52 56" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#FF3D8A" stroke-width="2.5" stroke-linecap="round">' +
    '<path d="M13 11 C 37 6, 47 22, 32 33 C 19 42, 6 31, 13 16"/>' +
    '<path d="M9 17 C 35 8, 48 26, 30 39 C 15 48, 2 35, 11 20"/></g>' +
    '<text x="5" y="54" font-family="Caveat,cursive" font-size="18" fill="#FF3D8A">!!</text></svg>',
};

/**
 * Converts an array of vector strokes to an SVG string.
 */
export function strokesToSvg(
  strokes: InkStroke[],
  width = 600,
  height = 200
): string {
  if (!strokes.length) {
    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }

  // Calculate actual bounding box if strokes exist
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of strokes) {
    for (const p of s.pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  const padding = 16;
  const vbX = Math.max(0, Math.floor(minX - padding));
  const vbY = Math.max(0, Math.floor(minY - padding));
  const vbW = Math.max(width, Math.ceil(maxX - minX + padding * 2));
  const vbH = Math.max(height, Math.ceil(maxY - minY + padding * 2));

  const pathElements: string[] = [];

  for (const s of strokes) {
    if (s.t === "er" || !s.pts.length) continue;

    if (s.pts.length === 1) {
      const p = s.pts[0];
      const r = s.t === "pen" ? Math.max(0.6, s.w * (0.35 + p.p * 1.3)) / 2 : s.w / 2;
      if (s.t === "hi") {
        pathElements.push(
          `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${s.c}" opacity="0.45" />`
        );
      } else {
        pathElements.push(
          `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${s.c}" />`
        );
      }
      continue;
    }

    let pathD = `M ${s.pts[0].x.toFixed(1)} ${s.pts[0].y.toFixed(1)}`;

    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1];
      const b = s.pts[i];
      const midX = ((a.x + b.x) / 2).toFixed(1);
      const midY = ((a.y + b.y) / 2).toFixed(1);
      pathD += ` Q ${a.x.toFixed(1)} ${a.y.toFixed(1)}, ${midX} ${midY}`;
    }

    const last = s.pts[s.pts.length - 1];
    pathD += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

    const avgP = s.pts.reduce((acc, pt) => acc + (pt.p || 0.5), 0) / s.pts.length;
    const strokeWidth =
      s.t === "pen"
        ? Math.max(0.6, s.w * (0.35 + avgP * 1.3)).toFixed(1)
        : s.w.toFixed(1);

    if (s.t === "hi") {
      pathElements.push(
        `<path d="${pathD}" fill="none" stroke="${s.c}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.45" />`
      );
    } else {
      pathElements.push(
        `<path d="${pathD}" fill="none" stroke="${s.c}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`
      );
    }
  }

  return `<svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg">${pathElements.join("")}</svg>`;
}

/**
 * Creates an interactive ink canvas engine instance attached to a HTML5 canvas.
 */
export function createInkEngine(
  canvas: HTMLCanvasElement,
  options: InkEngineOptions = {}
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  let strokes: InkStroke[] = [];
  let cur: InkStroke | null = null;
  let drawing = false;
  let tool: InkTool = { t: "pen", c: "#0A0A0A", w: 2 };
  let currentScale = 1;

  function renderStroke(s: InkStroke) {
    if (!ctx || !s.pts.length) return;
    ctx.save();

    if (s.t === "er") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000000";
      ctx.fillStyle = "#000000";
    } else if (s.t === "hi") {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = s.c;
      ctx.fillStyle = s.c;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = s.c;
      ctx.fillStyle = s.c;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (s.pts.length === 1) {
      const a = s.pts[0];
      const radius = (s.t === "pen" ? Math.max(0.6, s.w * (0.35 + a.p * 1.3)) : s.w) / 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, Math.max(0.8, radius), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1];
      const b = s.pts[i];
      ctx.beginPath();
      ctx.lineWidth = s.t === "pen" ? Math.max(0.6, s.w * (0.35 + b.p * 1.3)) : s.w;
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function redraw() {
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    strokes.forEach(renderStroke);
  }

  function fit() {
    if (!ctx) return;
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const d = window.devicePixelRatio || 1;
    currentScale = d;
    canvas.width = Math.round(r.width * d);
    canvas.height = Math.round(r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    redraw();
  }

  function getPoint(e: PointerEvent): InkPoint {
    const r = canvas.getBoundingClientRect();
    const isPenOrTouch = e.pointerType === "pen" || e.pointerType === "touch";
    const p = isPenOrTouch && e.pressure > 0 ? e.pressure : 0.5;
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      p,
    };
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return; // Primary button only
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {
      // Ignored if unsupported
    }
    drawing = true;
    const pt = getPoint(e);
    cur = { t: tool.t, c: tool.c, w: tool.w, pts: [pt] };
    strokes.push(cur);

    if (e.pointerType === "pen") {
      options.onPen?.();
    }
    options.onDirty?.();

    redraw();
    options.onCount?.(strokes.length);
  }

  function onPointerMove(e: PointerEvent) {
    if (!drawing || !cur) return;
    const p = getPoint(e);
    const last = cur.pts[cur.pts.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1.0) return;
    cur.pts.push(p);
    redraw();
  }

  function onPointerEnd(e: PointerEvent) {
    if (!drawing) return;
    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch (_) {
      // Ignored
    }
    drawing = false;
    cur = null;
    redraw();
    options.onCount?.(strokes.length);
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerEnd);
  canvas.addEventListener("pointercancel", onPointerEnd);
  canvas.addEventListener("pointerleave", onPointerEnd);

  return {
    fit,
    redraw,
    setTool(t: InkTool) {
      tool = { ...t };
    },
    undo() {
      strokes.pop();
      redraw();
      options.onCount?.(strokes.length);
    },
    clear() {
      strokes = [];
      redraw();
      options.onCount?.(0);
    },
    count() {
      return strokes.length;
    },
    getStrokes() {
      return strokes;
    },
    setStrokes(newStrokes: InkStroke[]) {
      strokes = [...newStrokes];
      redraw();
      options.onCount?.(strokes.length);
    },
    toSvg() {
      const r = canvas.getBoundingClientRect();
      return strokesToSvg(strokes, r.width || 600, r.height || 200);
    },
    destroy() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      canvas.removeEventListener("pointerleave", onPointerEnd);
    },
  };
}
