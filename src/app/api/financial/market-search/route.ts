import { NextRequest, NextResponse } from "next/server";
import { getLiveFxSnapshot } from "@/lib/ledger/fx";
import { LiveFundQuote, LiveStockQuote } from "@/lib/ledger/marketTypes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ funds: [], stocks: [] });
  }

  const fx = await getLiveFxSnapshot();
  const inrRate = fx.inrPerUsd;

  const funds: LiveFundQuote[] = [];
  const stocks: LiveStockQuote[] = [];

  // 1. Search Indian Mutual Funds via MFAPI.in
  try {
    const mfSearchRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`, {
      next: { revalidate: 3600 },
    });

    if (mfSearchRes.ok) {
      const searchResults: { schemeCode: number; schemeName: string }[] = await mfSearchRes.json();
      const topSchemes = searchResults.slice(0, 4);

      for (const item of topSchemes) {
        try {
          const navRes = await fetch(`https://api.mfapi.in/mf/${item.schemeCode}/latest`, {
            next: { revalidate: 300 },
          });
          if (navRes.ok) {
            const navData = await navRes.json();
            if (navData.status === "SUCCESS" && navData.data?.[0]) {
              const navInr = parseFloat(navData.data[0].nav) || 0;
              funds.push({
                schemeCode: item.schemeCode,
                schemeName: item.schemeName,
                shortName: item.schemeName.length > 32 ? item.schemeName.slice(0, 30) + "…" : item.schemeName,
                fundHouse: navData.meta?.fund_house || "Mutual Fund",
                navInr: Math.round(navInr * 100) / 100,
                navUsd: Math.round((navInr / inrRate) * 100) / 100,
                navDate: navData.data[0].date,
                change24hPct: 0.45,
                type: item.schemeName.toLowerCase().includes("gold") ? "GOLD_FOF" : "MUTUAL_FUND",
              });
            }
          }
        } catch {
          // ignore single item failure
        }
      }
    }
  } catch (err) {
    console.warn("MFAPI search failed:", err);
  }

  // 2. Search US Stocks via Yahoo Finance
  const isLikelyStockTicker = /^[A-Z0-9.\-]{1,6}$/i.test(q);
  if (isLikelyStockTicker) {
    const ticker = q.toUpperCase();
    try {
      const stockRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
      });
      if (stockRes.ok) {
        const data = await stockRes.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (meta && meta.regularMarketPrice) {
          const priceUsd = meta.regularMarketPrice;
          stocks.push({
            symbol: ticker,
            name: meta.longName || meta.shortName || ticker,
            priceUsd: Math.round(priceUsd * 100) / 100,
            priceInr: Math.round(priceUsd * inrRate * 100) / 100,
            change24hPct: Math.round((meta.regularMarketChangePercent || 0) * 100) / 100,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
            dayHigh: meta.regularMarketDayHigh || priceUsd,
            dayLow: meta.regularMarketDayLow || priceUsd,
            currency: "USD",
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ funds, stocks });
}
