import { describe, expect, it } from "vitest";
import { barWidth, chartLabel, chartsFromTable, parseAskNumber } from "./askChart";

describe("chartLabel", () => {
  it("strips markdown, prefers a ticker, and shortens ISO dates", () => {
    expect(chartLabel("**Bitcoin (BTC)**")).toBe("BTC");
    expect(chartLabel("**Dogecoin (DOGE)**")).toBe("DOGE");
    expect(chartLabel("Solana")).toBe("Solana");
    expect(chartLabel("2026-08-16")).toBe("08-16");
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
});
