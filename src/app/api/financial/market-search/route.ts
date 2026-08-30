import { NextRequest, NextResponse } from "next/server";
import { getLiveFxSnapshot } from "@/lib/ledger/fx";
import { LiveFundQuote, LiveStockQuote, LiveCryptoQuote, LiveMarketSearchResults } from "@/lib/ledger/marketTypes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json<LiveMarketSearchResults>({ funds: [], stocks: [], crypto: [] });
  }

  const fx = await getLiveFxSnapshot();
  const inrRate = fx.inrPerUsd;

  const funds: LiveFundQuote[] = [];
  const stocks: LiveStockQuote[] = [];
  const crypto: LiveCryptoQuote[] = [];

  // 1. Company Name & Stock Ticker Search via Yahoo Finance Search API
  try {
    const searchRes = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=6&newsCount=0`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const quotes = searchData.quotes || [];

      // Filter to equities & ETFs
      const equityQuotes = quotes
        .filter((item: any) => item.quoteType === "EQUITY" || item.quoteType === "ETF")
        .slice(0, 4);

      for (const item of equityQuotes) {
        try {
          const chartRes = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?interval=1d&range=1d`,
            {
              headers: { "User-Agent": "Mozilla/5.0" },
              next: { revalidate: 60 },
            }
          );

          if (chartRes.ok) {
            const chartData = await chartRes.json();
            const meta = chartData.chart?.result?.[0]?.meta;
            if (meta) {
              const priceUsd = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
              stocks.push({
                symbol: item.symbol,
                name: meta.longName || meta.shortName || item.shortname || item.longname || item.symbol,
                priceUsd: Math.round(priceUsd * 100) / 100,
                priceInr: Math.round(priceUsd * inrRate * 100) / 100,
                change24hPct: Math.round((meta.regularMarketChangePercent || 0) * 100) / 100,
                fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
                fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
                dayHigh: meta.regularMarketDayHigh || priceUsd,
                dayLow: meta.regularMarketDayLow || priceUsd,
                currency: meta.currency || "USD",
              });
            }
          }
        } catch {
          // ignore single stock failure
        }
      }
    }
  } catch (err) {
    console.warn("Yahoo search failed:", err);
  }

  // 2. Search Indian Mutual Funds via MFAPI.in
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

  // 3. Search Crypto Coins by Name via CoinGecko Search API
  try {
    const cgSearchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (cgSearchRes.ok) {
      const cgData = await cgSearchRes.json();
      const topCoins = (cgData.coins || []).slice(0, 3);

      if (topCoins.length > 0) {
        const coinIds = topCoins.map((c: any) => c.id).join(",");
        const priceRes = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd,inr&include_24hr_change=true`,
          { headers: { Accept: "application/json" }, next: { revalidate: 60 } }
        );

        if (priceRes.ok) {
          const prices = await priceRes.json();
          topCoins.forEach((c: any) => {
            if (prices[c.id]) {
              crypto.push({
                id: c.id,
                symbol: c.symbol.toUpperCase(),
                name: c.name,
                priceUsd: prices[c.id].usd ?? 0,
                priceInr: prices[c.id].inr ?? prices[c.id].usd * inrRate,
                change24hUsd: Math.round((prices[c.id].usd_24h_change || 0) * 100) / 100,
                change24hInr: Math.round((prices[c.id].inr_24h_change || 0) * 100) / 100,
                icon: "🪙",
                rank: c.market_cap_rank || 99,
              });
            }
          });
        }
      }
    }
  } catch (err) {
    console.warn("CoinGecko search failed:", err);
  }

  return NextResponse.json<LiveMarketSearchResults>({ funds, stocks, crypto });
}
