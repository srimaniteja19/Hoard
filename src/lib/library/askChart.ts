export type AskChartKind = "usd" | "pct" | "number";

export type AskChartBar = {
  label: string;
  value: number;
  display: string;
  color: string;
};

export type AskCandle = {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  display: string;
};

export type AskChart =
  | { type: "hbar"; title: string; kind: AskChartKind; log: boolean; fromZero: boolean; bars: AskChartBar[] }
  | { type: "column"; title: string; kind: AskChartKind; bars: AskChartBar[] }
  | { type: "line"; title: string; kind: AskChartKind; points: AskChartBar[] }
  | { type: "ohlc"; title: string; candles: AskCandle[] }
  | { type: "pie"; title: string; slices: AskChartBar[] };

const PALETTE = ["var(--cyan)", "var(--yel)", "var(--pink)", "var(--lime)"];

const SCALE = [
  ["trillion", 1e12],
  ["billion", 1e9],
  ["million", 1e6],
] as const;

const SUFFIX: Record<string, number> = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 };

export function stripAskMarks(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function chartLabel(text: string): string {
  const plain = stripAskMarks(text);
  const iso = plain.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}-${iso[3]}`;
  const ticker = plain.match(/\(([A-Z0-9.]{2,8})\)/);
  return ticker ? ticker[1] : plain || "—";
}

export function parseAskNumber(raw: string): { value: number; kind: AskChartKind } | null {
  const cleaned = stripAskMarks(raw.replace(/~/g, "").replace(/,/g, ""));
  if (!cleaned) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return null;
  const hadDollar = /\$/.test(cleaned);
  const text = cleaned.replace(/\$/g, "").trim();

  const pct = text.match(/^([+-]?)(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*%$/);
  if (pct) {
    const sign = pct[1] === "-" ? -1 : 1;
    const a = Number(pct[2]);
    const b = pct[3] ? Number(pct[3]) : a;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return { value: (sign * (a + b)) / 2, kind: "pct" };
  }

  let kind: AskChartKind = hadDollar ? "usd" : "number";
  let scaled = text;
  let mul = 1;
  for (const [word, factor] of SCALE) {
    if (new RegExp(word, "i").test(scaled)) {
      mul = factor;
      scaled = scaled.replace(new RegExp(word, "i"), "").trim();
      kind = "usd";
      break;
    }
  }
  const suffix = scaled.match(/^([+-]?)(\d+(?:\.\d+)?)([TBMK])\b/i);
  if (suffix) {
    const factor = SUFFIX[suffix[3].toUpperCase()];
    const value = Number(suffix[2]) * factor * (suffix[1] === "-" ? -1 : 1);
    if (Number.isFinite(value)) return { value, kind: kind === "number" && factor >= 1e6 ? "usd" : kind };
  }
  const num = scaled.match(/^[+-]?(\d+(?:\.\d+)?)/);
  if (!num) return null;
  const value = Number(num[1]) * mul * (scaled.startsWith("-") ? -1 : 1);
  if (!Number.isFinite(value)) return null;
  return { value, kind };
}

function headerKind(header: string, sample: { kind: AskChartKind } | null): AskChartKind | null {
  const h = stripAskMarks(header).toLowerCase();
  if (/change|%|pct|percent/.test(h)) return "pct";
  if (/price|cap|usd|\$|value|market|open|high|low|close|last/.test(h)) return "usd";
  if (/volume|vol\b|share|alloc/.test(h)) return sample?.kind ?? "number";
  return sample?.kind ?? null;
}

function findCol(headers: string[], re: RegExp): number {
  return headers.findIndex((header, index) => index > 0 && re.test(stripAskMarks(header)));
}

function isDateLabel(text: string): boolean {
  const plain = stripAskMarks(text);
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(plain) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(plain);
}

function series(
  headers: string[],
  rows: string[][],
  col: number
): { kind: AskChartKind; bars: AskChartBar[] } | null {
  const parsed = rows.map((row) => parseAskNumber(row[col] ?? ""));
  const hits = parsed.filter((item): item is { value: number; kind: AskChartKind } => item != null);
  if (hits.length < 2) return null;
  const kind = headerKind(headers[col], hits[0]) ?? hits[0].kind;
  return {
    kind,
    bars: rows.map((row, index) => ({
      label: chartLabel(row[0] ?? ""),
      value: parsed[index]?.value ?? 0,
      display: stripAskMarks(row[col] ?? "") || "—",
      color: PALETTE[index % PALETTE.length],
    })),
  };
}

function ohlcFromTable(headers: string[], rows: string[][]): AskChart[] | null {
  const dateLike = rows.filter((row) => isDateLabel(row[0] ?? "")).length >= Math.ceil(rows.length * 0.8);
  if (!dateLike) return null;
  const open = findCol(headers, /^open$/i);
  const high = findCol(headers, /^high$/i);
  const low = findCol(headers, /^low$/i);
  const close = findCol(headers, /^(close|last|settle)$/i);
  const volume = findCol(headers, /^(volume|vol)$/i);
  if (open < 0 || high < 0 || low < 0 || close < 0) return null;

  const candles: AskCandle[] = [];
  for (const row of rows) {
    const o = parseAskNumber(row[open] ?? "");
    const h = parseAskNumber(row[high] ?? "");
    const l = parseAskNumber(row[low] ?? "");
    const c = parseAskNumber(row[close] ?? "");
    if (!o || !h || !l || !c) continue;
    candles.push({
      label: chartLabel(row[0] ?? ""),
      open: o.value,
      high: h.value,
      low: l.value,
      close: c.value,
      display: stripAskMarks(row[close] ?? ""),
    });
  }
  if (candles.length < 2) return null;

  const charts: AskChart[] = [{ type: "ohlc", title: "OHLC", candles: candles }];
  const vol = volume >= 0 ? series(headers, rows, volume) : null;
  if (vol) charts.push({ type: "column", title: stripAskMarks(headers[volume]) || "Volume", kind: vol.kind, bars: vol.bars });
  return charts;
}

function pieFromSeries(title: string, kind: AskChartKind, bars: AskChartBar[]): AskChart | null {
  if (kind === "pct") return null;
  if (bars.length < 3 || bars.length > 8) return null;
  if (bars.some((bar) => bar.value <= 0)) return null;
  if (bars.some((bar) => isDateLabel(bar.label))) return null;
  const max = Math.max(...bars.map((bar) => bar.value));
  const min = Math.min(...bars.map((bar) => bar.value));
  if (max / Math.max(min, Number.EPSILON) >= 20) return null;
  if (!/share|alloc|mix|split|composition|of total/i.test(title)) return null;
  return { type: "pie", title, slices: bars };
}

export function chartsFromTable(headers: string[], rows: string[][]): AskChart[] {
  if (headers.length < 2 || rows.length < 2) return [];
  const ohlc = ohlcFromTable(headers, rows);
  if (ohlc) return ohlc;

  const dateLike = rows.filter((row) => isDateLabel(row[0] ?? "")).length >= Math.ceil(rows.length * 0.8);
  const charts: AskChart[] = [];

  for (let col = 1; col < headers.length; col += 1) {
    const next = series(headers, rows, col);
    if (!next) continue;
    const title = stripAskMarks(headers[col]) || "Value";
    const values = next.bars.map((bar) => bar.value);
    const max = Math.max(...values.map((value) => Math.abs(value)));
    const positives = values.filter((value) => value > 0);
    const min = positives.length ? Math.min(...positives) : 0;
    if (max === 0) continue;

    if (dateLike) {
      if (/volume|vol\b/i.test(title)) {
        charts.push({ type: "column", title, kind: next.kind, bars: next.bars });
      } else {
        charts.push({ type: "line", title, kind: next.kind, points: next.bars });
      }
      if (charts.length >= 2) break;
      continue;
    }

    const pie = pieFromSeries(title, next.kind, next.bars);
    if (pie) {
      charts.push(pie);
      continue;
    }

    const log = next.kind !== "pct" && min > 0 && max / min >= 20;
    const fromZero = next.kind === "pct" || log || min <= 0 || max / Math.max(min, Number.EPSILON) >= 3;
    charts.push({ type: "hbar", title, kind: next.kind, log, fromZero, bars: next.bars });
    if (charts.length >= 2) break;
  }

  return charts.slice(0, 2);
}

export function barWidth(value: number, bars: AskChartBar[], log: boolean, fromZero = true): number {
  const abs = bars.map((bar) => Math.abs(bar.value)).filter((n) => n > 0);
  if (abs.length === 0 || value === 0) return 0;
  const max = Math.max(...abs);
  const min = Math.min(...abs);
  if (log) {
    const lo = Math.log10(min);
    const hi = Math.log10(max);
    if (hi <= lo) return 100;
    return Math.max(8, ((Math.log10(Math.abs(value)) - lo) / (hi - lo)) * 100);
  }
  if (!fromZero && max > min) {
    return Math.max(6, ((Math.abs(value) - min) / (max - min)) * 100);
  }
  return Math.max(4, (Math.abs(value) / max) * 100);
}

export function tapeStamp(chart: AskChart): string {
  if (chart.type === "ohlc") return "CANDLES";
  if (chart.type === "column") return "BARS";
  if (chart.type === "line") return "LINE";
  if (chart.type === "pie") return "PIE";
  if (chart.type === "hbar" && chart.log) return "LOG";
  return "BARS";
}
