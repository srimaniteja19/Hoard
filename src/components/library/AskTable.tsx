"use client";

import { MarkdownLite } from "@/components/til/MarkdownLite";
import {
  barWidth,
  chartsFromTable,
  tapeStamp,
  type AskCandle,
  type AskChart,
  type AskChartBar,
  type AskChartKind,
} from "@/lib/library/askChart";
import { useState, type MouseEvent } from "react";

type TapeHover = { index: number; x: number; y: number };

function Inline({ text }: { text: string }) {
  return <MarkdownLite content={text} style={{ whiteSpace: "normal" }} />;
}

function looksNumeric(cell: string): boolean {
  const text = cell.replace(/[*`~,\s]/g, "");
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  return /\$/.test(text) || /%/.test(text) || /^-?\d/.test(text);
}

function yScale(value: number, min: number, max: number, top: number, height: number): number {
  const span = max - min || 1;
  return top + ((max - value) / span) * height;
}

function tapeNum(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100 || Number.isInteger(value)) return value.toLocaleString("en-US");
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function moveTapeHover(event: MouseEvent<SVGElement>, index: number, setHover: (next: TapeHover) => void) {
  const root = event.currentTarget.ownerSVGElement?.parentElement;
  if (!root) return;
  const box = root.getBoundingClientRect();
  setHover({ index, x: event.clientX - box.left, y: event.clientY - box.top });
}

function TapeTip({
  hover,
  label,
  rows,
}: {
  hover: TapeHover;
  label: string;
  rows: { key: string; value: string }[];
}) {
  const flipX = hover.x > 220;
  const flipY = hover.y < 36;
  return (
    <div
      className="ask-tape-tip"
      style={{
        left: hover.x,
        top: hover.y,
        transform: `translate(${flipX ? "-100%" : "8px"}, ${flipY ? "12px" : "calc(-100% - 8px)"})`,
      }}
    >
      <b>{label}</b>
      {rows.map((row) => (
        <div key={row.key}>
          <span>{row.key}</span>
          <em>{row.value}</em>
        </div>
      ))}
    </div>
  );
}

function OhlcTape({ candles }: { candles: AskCandle[] }) {
  const [hover, setHover] = useState<TapeHover | null>(null);
  if (!Array.isArray(candles) || candles.length === 0) return null;
  const width = 360;
  const height = 168;
  const left = 8;
  const right = 8;
  const top = 10;
  const bottom = 24;
  const plotH = height - top - bottom;
  const plotW = width - left - right;
  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const pad = (max - min) * 0.08 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const gap = plotW / candles.length;
  const bodyW = Math.min(16, gap * 0.52);
  const active = hover ? candles[hover.index] : null;

  return (
    <div className="ask-tape" onMouseLeave={() => setHover(null)}>
      <svg className="ask-tape-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="OHLC candlesticks">
        {candles.map((candle, index) => {
          const x = left + gap * (index + 0.5);
          const up = candle.close >= candle.open;
          const yHigh = yScale(candle.high, lo, hi, top, plotH);
          const yLow = yScale(candle.low, lo, hi, top, plotH);
          const yOpen = yScale(candle.open, lo, hi, top, plotH);
          const yClose = yScale(candle.close, lo, hi, top, plotH);
          const yTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(3, Math.abs(yClose - yOpen));
          const hot = hover?.index === index;
          return (
            <g key={`${index}-${candle.label || "c"}`}>
              <line x1={x} x2={x} y1={yHigh} y2={yLow} className="ask-tape-wick" />
              <rect
                x={x - bodyW / 2}
                y={yTop}
                width={bodyW}
                height={bodyH}
                className={`${up ? "ask-tape-up" : "ask-tape-down"}${hot ? " is-hot" : ""}`}
              />
              <text x={x} y={height - 8} className="ask-tape-axis" textAnchor="middle">
                {candle.label}
              </text>
              <rect
                className="ask-tape-hit"
                x={left + gap * index}
                y={top}
                width={gap}
                height={plotH}
                onMouseEnter={(event) => moveTapeHover(event, index, setHover)}
                onMouseMove={(event) => moveTapeHover(event, index, setHover)}
              />
            </g>
          );
        })}
      </svg>
      {hover && active ? (
        <TapeTip
          hover={hover}
          label={active.label}
          rows={[
            { key: "OPEN", value: tapeNum(active.open) },
            { key: "HIGH", value: tapeNum(active.high) },
            { key: "LOW", value: tapeNum(active.low) },
            { key: "CLOSE", value: active.display || tapeNum(active.close) },
          ]}
        />
      ) : null}
    </div>
  );
}

function ColumnTape({ bars, title }: { bars: AskChartBar[]; title: string }) {
  const [hover, setHover] = useState<TapeHover | null>(null);
  if (!Array.isArray(bars) || bars.length === 0) return null;
  const width = 360;
  const height = 148;
  const left = 8;
  const right = 8;
  const top = 8;
  const bottom = 24;
  const plotH = height - top - bottom;
  const plotW = width - left - right;
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  const gap = plotW / bars.length;
  const barW = Math.min(22, gap * 0.58);
  const active = hover ? bars[hover.index] : null;

  return (
    <div className="ask-tape" onMouseLeave={() => setHover(null)}>
      <svg className="ask-tape-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Column chart">
        {bars.map((bar, index) => {
          const x = left + gap * (index + 0.5);
          const h = Math.max(4, (bar.value / max) * plotH);
          const hot = hover?.index === index;
          return (
            <g key={`${index}-${bar.label || "b"}`}>
              <rect
                x={x - barW / 2}
                y={top + plotH - h}
                width={barW}
                height={h}
                fill={bar.color}
                stroke="#000"
                strokeWidth={hot ? 3 : 2}
              />
              <text x={x} y={height - 8} className="ask-tape-axis" textAnchor="middle">
                {bar.label}
              </text>
              <rect
                className="ask-tape-hit"
                x={left + gap * index}
                y={top}
                width={gap}
                height={plotH}
                onMouseEnter={(event) => moveTapeHover(event, index, setHover)}
                onMouseMove={(event) => moveTapeHover(event, index, setHover)}
              />
            </g>
          );
        })}
      </svg>
      {hover && active ? (
        <TapeTip
          hover={hover}
          label={active.label}
          rows={[{ key: title.toUpperCase() || "VALUE", value: active.display || tapeNum(active.value) }]}
        />
      ) : null}
    </div>
  );
}

function LineTape({ points, title }: { points: AskChartBar[]; title: string }) {
  const [hover, setHover] = useState<TapeHover | null>(null);
  if (!Array.isArray(points) || points.length === 0) return null;
  const width = 360;
  const height = 148;
  const left = 10;
  const right = 10;
  const top = 10;
  const bottom = 24;
  const plotH = height - top - bottom;
  const plotW = width - left - right;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const coords = points.map((point, index) => {
    const x = left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
    const y = yScale(point.value, lo, hi, top, plotH);
    return { x, y, point };
  });
  const d = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x} ${c.y}`).join(" ");
  const strip = plotW / Math.max(points.length, 1);
  const active = hover ? points[hover.index] : null;

  return (
    <div className="ask-tape" onMouseLeave={() => setHover(null)}>
      <svg className="ask-tape-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart">
        <path d={`${d} L${coords[coords.length - 1].x} ${top + plotH} L${coords[0].x} ${top + plotH} Z`} className="ask-tape-area" />
        <polyline points={coords.map((c) => `${c.x},${c.y}`).join(" ")} className="ask-tape-line" fill="none" />
        {coords.map((c, index) => (
          <g key={`${index}-${c.point.label || "p"}`}>
            <rect
              x={c.x - (hover?.index === index ? 5 : 4)}
              y={c.y - (hover?.index === index ? 5 : 4)}
              width={hover?.index === index ? 10 : 8}
              height={hover?.index === index ? 10 : 8}
              className={hover?.index === index ? "ask-tape-dot is-hot" : "ask-tape-dot"}
            />
            <text x={c.x} y={height - 8} className="ask-tape-axis" textAnchor="middle">
              {c.point.label}
            </text>
            <rect
              className="ask-tape-hit"
              x={Math.max(left, c.x - strip / 2)}
              y={top}
              width={strip}
              height={plotH}
              onMouseEnter={(event) => moveTapeHover(event, index, setHover)}
              onMouseMove={(event) => moveTapeHover(event, index, setHover)}
            />
          </g>
        ))}
      </svg>
      {hover && active ? (
        <TapeTip
          hover={hover}
          label={active.label}
          rows={[{ key: title.toUpperCase() || "VALUE", value: active.display || tapeNum(active.value) }]}
        />
      ) : null}
    </div>
  );
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
}

function PieTape({ slices }: { slices: AskChartBar[] }) {
  const [hover, setHover] = useState<TapeHover | null>(null);
  if (!Array.isArray(slices) || slices.length === 0) return null;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const cx = 64;
  const cy = 64;
  const r = 52;
  let angle = -Math.PI / 2;
  const arcs = slices.map((slice) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const [x1, y1] = polar(cx, cy, r, start);
    const [x2, y2] = polar(cx, cy, r, end);
    const large = sweep > Math.PI ? 1 : 0;
    return { slice, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` };
  });
  const active = hover ? slices[hover.index] : null;
  const share = active ? Math.round((active.value / total) * 1000) / 10 : 0;

  return (
    <div className="ask-pie ask-tape" onMouseLeave={() => setHover(null)}>
      <svg className="ask-tape-svg ask-pie-svg" viewBox="0 0 128 128" role="img" aria-label="Pie chart">
        {arcs.map((arc, index) => (
          <path
            key={`${index}-${arc.slice.label || "s"}`}
            d={arc.d}
            fill={arc.slice.color}
            stroke="#000"
            strokeWidth={hover?.index === index ? 3.5 : 2.5}
            onMouseEnter={(event) => moveTapeHover(event, index, setHover)}
            onMouseMove={(event) => moveTapeHover(event, index, setHover)}
          />
        ))}
      </svg>
      <ul className="ask-pie-legend">
        {slices.map((slice, index) => (
          <li key={`${index}-${slice.label || "s"}`} className={hover?.index === index ? "is-hot" : undefined}>
            <i style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <b>{slice.display}</b>
          </li>
        ))}
      </ul>
      {hover && active ? (
        <TapeTip
          hover={hover}
          label={active.label}
          rows={[
            { key: "VALUE", value: active.display || tapeNum(active.value) },
            { key: "SHARE", value: `${share}%` },
          ]}
        />
      ) : null}
    </div>
  );
}

function HBarTape({ chart }: { chart: Extract<AskChart, { type: "hbar" }> }) {
  const bars = chart.bars;
  if (!Array.isArray(bars) || bars.length === 0) return null;
  const signed = chart.kind === "pct" && bars.some((bar) => bar.value < 0);
  return (
    <ul className={signed ? "ask-chart-bars is-signed" : "ask-chart-bars"}>
      {bars.map((bar, index) => {
        const width = barWidth(bar.value, bars, chart.log, chart.fromZero);
        const down = bar.value < 0;
        return (
          <li key={`${index}-${bar.label || "bar"}`} title={`${bar.label} · ${bar.display}`}>
            <span className="ask-chart-name">{bar.label}</span>
            <span className="ask-chart-track">
              <span
                className={down ? "ask-chart-fill is-down" : "ask-chart-fill"}
                style={{ width: `${width}%`, background: down ? "var(--pink)" : bar.color }}
              />
            </span>
            <span className="ask-chart-val">{bar.display}</span>
          </li>
        );
      })}
    </ul>
  );
}

function AskChartBody({ chart }: { chart: AskChart }) {
  switch (chart.type) {
    case "ohlc":
      return <OhlcTape candles={chart.candles} />;
    case "column":
      return <ColumnTape bars={chart.bars} title={chart.title} />;
    case "line":
      return <LineTape points={chart.points} title={chart.title} />;
    case "pie":
      return <PieTape slices={chart.slices} />;
    case "hbar":
      return <HBarTape chart={chart} />;
    default: {
      const legacy = chart as { bars?: AskChartBar[]; kind?: AskChartKind; log?: boolean; fromZero?: boolean };
      if (!Array.isArray(legacy.bars)) return null;
      return (
        <HBarTape
          chart={{
            type: "hbar",
            title: "",
            kind: legacy.kind ?? "number",
            log: Boolean(legacy.log),
            fromZero: legacy.fromZero ?? true,
            bars: legacy.bars,
          }}
        />
      );
    }
  }
}

function AskChartCard({ chart }: { chart: AskChart }) {
  return (
    <div className="ask-chart">
      <div className="ask-chart-kicker">
        THE TAPE · {(chart.title ?? "TAPE").toUpperCase()}
        <span>{tapeStamp(chart)}</span>
      </div>
      <AskChartBody chart={chart} />
    </div>
  );
}

export function AskTable({ headers = [], rows = [] }: { headers: string[]; rows: string[][] }) {
  const charts = chartsFromTable(headers, rows);
  const numeric = headers.map((_, col) => col > 0 && rows.some((row) => looksNumeric(row[col] ?? "")));
  return (
    <div className="ask-figure">
      <div className="ask-table-wrap">
        <table className="ask-md-table">
          <thead>
            <tr>
              {headers.map((header, col) => (
                <th key={`${col}-${header}`} className={numeric[col] ? "is-num" : undefined}>
                  <Inline text={header} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${index}-${row[0] ?? ""}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cellIndex}-${cell.slice(0, 16)}`} className={numeric[cellIndex] ? "is-num" : undefined}>
                    <Inline text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {charts.map((chart, index) => (
        <AskChartCard key={`${chart.type}-${chart.title}-${index}`} chart={chart} />
      ))}
    </div>
  );
}
