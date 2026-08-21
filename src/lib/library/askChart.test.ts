import { describe, expect, it } from "vitest";
import { barWidth, chartHintFromPrompt, chartLabel, chartsFromTable, parseAskNumber } from "./askChart";

describe("chartLabel", () => {
  it("strips markdown, prefers a ticker, and shortens ISO dates", () => {
    expect(chartLabel("**Bitcoin (BTC)**")).toBe("BTC");
    expect(chartLabel("**Dogecoin (DOGE)**")).toBe("DOGE");
    expect(chartLabel("Solana")).toBe("Solana");
    expect(chartLabel("2026-08-16")).toBe("08-16");
    expect(chartLabel("August 16")).toBe("Aug 16");
    expect(chartLabel("")).toBe("—");
  });
});

describe("parseAskNumber", () => {
  it("reads money, percents, compact suffixes, and ranges", () => {
    expect(parseAskNumber("~$77,700")).toEqual({ value: 77700, kind: "usd" });
    expect(parseAskNumber("$0.088")).toEqual({ value: 0.088, kind: "usd" });
    expect(parseAskNumber("+9%")).toEqual({ value: 9, kind: "pct" });
    expect(parseAskNumber("+5–7%")).toEqual({ value: 6, kind: "pct" });
    expect(parseAskNumber("$1.56 trillion")).toEqual({ value: 1.56e12, kind: "usd" });
    expect(parseAskNumber("~$1.56T")).toEqual({ value: 1.56e12, kind: "usd" });
    expect(parseAskNumber("**+$6.6%**")).toEqual({ value: 6.6, kind: "pct" });
    expect(parseAskNumber("118500")).toEqual({ value: 118500, kind: "number" });
    expect(parseAskNumber("68–69°F")).toEqual({ value: 68.5, kind: "number" });
    expect(parseAskNumber("~68°F")).toEqual({ value: 68, kind: "number" });
    expect(parseAskNumber("2026-08-16")).toBeNull();
  });
});

describe("chartsFromTable", () => {
  it("builds log price bars and change bars for a coin comparison", () => {
    const charts = chartsFromTable(
      ["Coin", "Price", "24h Change", "Source"],
      [
        ["**Bitcoin (BTC)**", "~$77,700", "+5–7%", "CoinGecko"],
        ["**Solana (SOL)**", "~$92", "+5%", "CoinGecko"],
        ["**Dogecoin (DOGE)**", "~$0.088", "+9%", "CoinGecko"],
      ]
    );
    expect(charts.map((chart) => chart.type)).toEqual(["hbar", "hbar"]);
    expect(charts[0]?.type === "hbar" && charts[0].log).toBe(true);
    expect(charts[0]?.type === "hbar" && charts[0].bars.map((bar) => bar.label)).toEqual(["BTC", "SOL", "DOGE"]);
    expect(charts[1]?.type === "hbar" && charts[1].kind).toBe("pct");
    if (charts[0]?.type === "hbar") {
      expect(barWidth(77700, charts[0].bars, true)).toBeGreaterThan(barWidth(0.088, charts[0].bars, true));
    }
  });

  it("uses candlesticks and volume bars for an OHLC time series", () => {
    const charts = chartsFromTable(
      ["Date", "Open", "High", "Low", "Close", "Volume"],
      [
        ["2026-08-16", "118500", "120200", "117800", "119750", "32450"],
        ["2026-08-17", "119750", "121600", "118900", "120950", "35820"],
        ["2026-08-18", "120950", "122300", "119400", "121800", "38150"],
        ["2026-08-19", "121800", "123100", "120700", "122650", "41200"],
        ["2026-08-20", "122650", "124500", "121900", "123950", "44780"],
      ]
    );
    expect(charts.map((chart) => chart.type)).toEqual(["ohlc", "column"]);
    expect(charts[0]?.type === "ohlc" && charts[0].candles).toHaveLength(5);
    expect(charts[0]?.type === "ohlc" && charts[0].candles[0]?.label).toBe("08-16");
    expect(charts[1]?.type === "column" && charts[1].title).toMatch(/volume/i);
  });

  it("reads August weather as a line unless the prompt asks for bars", () => {
    const rows = [
      ["August 16", "68–69°F", "56°F", "Cool, foggy", "0.00\""],
      ["August 17", "72°F", "57°F", "Partly cloudy", "0.00\""],
      ["August 18", "67–69°F", "55°F", "Marine layer", "0.00\""],
      ["August 19", "~68°F", "~56°F", "Overcast", "0.00\""],
      ["August 20", "69°F", "56°F", "Overcast, hazy", "0.00\""],
    ] as string[][];
    const headers = ["Date", "High Temperature", "Low Temperature", "Conditions", "Precipitation"];
    expect(chartsFromTable(headers, rows).map((chart) => chart.type)).toEqual(["line", "line"]);
    expect(chartsFromTable(headers, rows, "column").map((chart) => chart.type)).toEqual(["column", "column"]);
    expect(chartsFromTable(headers, rows, "line").map((chart) => chart.type)).toEqual(["line", "line"]);
    expect(chartsFromTable(headers, rows, "compare in linear charts").map((chart) => chart.type)).toEqual(["line", "line"]);
    expect(chartsFromTable(headers, rows, "compare in bar charts").map((chart) => chart.type)).toEqual(["column", "column"]);
  });
});

describe("chartHintFromPrompt", () => {
  it("reads line, bar, and pie asks", () => {
    expect(chartHintFromPrompt("compare weather in linear charts")).toBe("line");
    expect(chartHintFromPrompt("compare weather in sf for the past 5 days, in bar charts")).toBe("column");
    expect(chartHintFromPrompt("show allocation as a pie")).toBe("pie");
    expect(chartHintFromPrompt("compare bitcoin last 10 days")).toBeNull();
  });
});
