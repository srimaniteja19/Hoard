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
  | { type: "column"; title: string; kind: AskChartKind; fromZero: boolean; bars: AskChartBar[] }
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

const MONTH = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

export function chartLabel(text: string): string {
  const plain = stripAskMarks(text);
  const iso = plain.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}-${iso[3]}`;
  const named = plain.match(new RegExp(`^(${MONTH})\\s+(\\d{1,2})(?:,?\\s*\\d{4})?`, "i"));
  if (named) return `${named[1].slice(0, 3)} ${named[2]}`;
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
  const range = scaled.match(/^([+-]?)(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const a = Number(range[2]);
    const b = Number(range[3]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { value: ((range[1] === "-" ? -1 : 1) * (a + b)) / 2, kind };
    }
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
  if (/temp|humidity|precip|rainfall|wind|inch|celsius|fahrenheit|°/.test(h)) return "number";
  if (/^(open|high|low|close|last|settle)$/i.test(h) || /price|market cap|\busd\b|\$/.test(h)) return "usd";
  if (/volume|vol\b|share|alloc/.test(h)) return sample?.kind ?? "number";
  return sample?.kind ?? null;
}

function findCol(headers: string[], re: RegExp): number {
  return headers.findIndex((header, index) => index > 0 && re.test(stripAskMarks(header)));
}

function isDateLabel(text: string): boolean {
  const plain = stripAskMarks(text);
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(plain)) return true;
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(plain)) return true;
  return new RegExp(`^(${MONTH})\\s+\\d{1,2}(?:,?\\s*\\d{4})?\\b`, "i").test(plain);
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

function ohlcFromTable(headers: string[], rows: string[][], hint: ChartHint): AskChart[] | null {
  const dateLike = rows.filter((row) => isDateLabel(row[0] ?? "")).length >= Math.ceil(rows.length * 0.8);
  if (!dateLike) return null;
  if (hint === "line" || hint === "column" || hint === "hbar" || hint === "pie") return null;
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
  if (vol) charts.push({ type: "column", title: stripAskMarks(headers[volume]) || "Volume", kind: vol.kind, fromZero: true, bars: vol.bars });
  return charts;
}

export type ChartHint = "line" | "column" | "hbar" | "pie" | "ohlc" | null;

export function chartHintFromPrompt(text: string): ChartHint {
  const hay = text.toLowerCase();
  const hits: { at: number; hint: Exclude<ChartHint, null> }[] = [];
  const rules: { re: RegExp; hint: Exclude<ChartHint, null> }[] = [
    { re: /\b(pie|donut)s?\b/g, hint: "pie" },
    { re: /\b(candle|ohlc|candlestick)s?\b/g, hint: "ohlc" },
    { re: /\b(?:line(?:ar)?|trend)\s*charts?\b|\bline graphs?\b|\blinear charts?\b/g, hint: "line" },
    { re: /\b(?:bar|column)\s*charts?\b|\bbar graphs?\b|\bin bars?\b/g, hint: "column" },
  ];
  for (const rule of rules) {
    rule.re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.re.exec(hay))) {
      hits.push({ at: match.index, hint: rule.hint });
    }
  }
  if (hits.length === 0) return null;
  return hits.sort((a, b) => a.at - b.at)[hits.length - 1]?.hint ?? null;
}

function isCountSeries(title: string): boolean {
  return /volume|vol\b|precip|rain|count|qty|quantity/i.test(title);
}

function pieFromSeries(title: string, kind: AskChartKind, bars: AskChartBar[], forced: boolean): AskChart | null {
  if (kind === "pct") return null;
  if (bars.length < 3 || bars.length > 8) return null;
  if (bars.some((bar) => bar.value <= 0)) return null;
  if (bars.some((bar) => isDateLabel(bar.label))) return null;
  const max = Math.max(...bars.map((bar) => bar.value));
  const min = Math.min(...bars.map((bar) => bar.value));
  if (max / Math.max(min, Number.EPSILON) >= 20) return null;
  if (!forced && !/share|alloc|mix|split|composition|of total/i.test(title)) return null;
  return { type: "pie", title, slices: bars };
}

function seriesChart(
  title: string,
  kind: AskChartKind,
  bars: AskChartBar[],
  dateLike: boolean,
  hint: ChartHint,
  min: number,
  max: number
): AskChart {
  if (hint === "pie") {
    const pie = pieFromSeries(title, kind, bars, true);
    if (pie) return pie;
  }
  if (dateLike) {
    const fromZero = isCountSeries(title) || min <= 0 || max / Math.max(min, Number.EPSILON) >= 3;
    if (hint === "column" || hint === "hbar") {
      return { type: "column", title, kind, fromZero, bars };
    }
    if (hint === "line" || !isCountSeries(title)) {
      return { type: "line", title, kind, points: bars };
    }
    return { type: "column", title, kind, fromZero: true, bars };
  }
  if (hint === "line") return { type: "line", title, kind, points: bars };
  if (hint === "column") {
    const fromZero = kind === "pct" || min <= 0 || max / Math.max(min, Number.EPSILON) >= 3;
    return { type: "column", title, kind, fromZero, bars };
  }
  const pie = pieFromSeries(title, kind, bars, false);
  if (pie) return pie;
  const log = kind !== "pct" && min > 0 && max / min >= 20;
  const fromZero = kind === "pct" || log || min <= 0 || max / Math.max(min, Number.EPSILON) >= 3;
  return { type: "hbar", title, kind, log, fromZero, bars };
}

export function chartsFromTable(headers: string[], rows: string[][], hint: ChartHint = null): AskChart[] {
  if (headers.length < 2 || rows.length < 2) return [];
  const ohlc = ohlcFromTable(headers, rows, hint);
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

    charts.push(seriesChart(title, next.kind, next.bars, dateLike, hint, min, max));
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
