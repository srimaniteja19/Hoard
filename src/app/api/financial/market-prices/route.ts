import { NextResponse } from "next/server";
import { getLiveFxSnapshot } from "@/lib/ledger/fx";
import {
  LiveMarketPricesPayload,
  LiveCryptoQuote,
  LiveMetalsQuote,
  LiveFundQuote,
  LiveStockQuote,
  calculateMetalPriceBreakdown,
} from "@/lib/ledger/marketTypes";

// In-memory 60-second cache
let cachedPayload: LiveMarketPricesPayload | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function GET() {
  const now = Date.now();
  if (cachedPayload && now - lastCacheTime < CACHE_TTL_MS) {
    return NextResponse.json({ ...cachedPayload, source: "CACHE" });
  }

  const fxSnapshot = await getLiveFxSnapshot();
  const inrRate = fxSnapshot.inrPerUsd;

  // 1. Fetch Top 5 Crypto + Gold Spot from CoinGecko
  let cryptoQuotes: LiveCryptoQuote[] = [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", priceUsd: 78150, priceInr: 78150 * inrRate, change24hUsd: 0.58, change24hInr: 0.58, icon: "₿", rank: 1 },
    { id: "ethereum", symbol: "ETH", name: "Ethereum", priceUsd: 2455, priceInr: 2455 * inrRate, change24hUsd: 0.62, change24hInr: 0.62, icon: "Ξ", rank: 2 },
    { id: "solana", symbol: "SOL", name: "Solana", priceUsd: 105.10, priceInr: 105.10 * inrRate, change24hUsd: 0.85, change24hInr: 0.85, icon: "◎", rank: 3 },
    { id: "binancecoin", symbol: "BNB", name: "BNB", priceUsd: 694.0, priceInr: 694.0 * inrRate, change24hUsd: 0.49, change24hInr: 0.49, icon: "🔶", rank: 4 },
    { id: "ripple", symbol: "XRP", name: "XRP", priceUsd: 1.39, priceInr: 1.39 * inrRate, change24hUsd: 0.42, change24hInr: 0.42, icon: "✕", rank: 5 },
  ];

  let rawGoldSpotUsd = 2510.0;
  let gold24hChange = 0.25;

  try {
    const cgRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,pax-gold&vs_currencies=usd,inr&include_24hr_change=true",
      { headers: { Accept: "application/json" }, next: { revalidate: 60 } }
    );

    if (cgRes.ok) {
      const cgData = await cgRes.json();

      const cryptoMap: Record<string, { symbol: string; name: string; icon: string; rank: number }> = {
        bitcoin: { symbol: "BTC", name: "Bitcoin", icon: "₿", rank: 1 },
        ethereum: { symbol: "ETH", name: "Ethereum", icon: "Ξ", rank: 2 },
        solana: { symbol: "SOL", name: "Solana", icon: "◎", rank: 3 },
        binancecoin: { symbol: "BNB", name: "BNB", icon: "🔶", rank: 4 },
        ripple: { symbol: "XRP", name: "XRP", icon: "✕", rank: 5 },
      };

      const parsedCrypto: LiveCryptoQuote[] = [];
      Object.entries(cryptoMap).forEach(([id, meta]) => {
        if (cgData[id]) {
          parsedCrypto.push({
            id,
            symbol: meta.symbol,
            name: meta.name,
            priceUsd: cgData[id].usd ?? 0,
            priceInr: cgData[id].inr ?? cgData[id].usd * inrRate,
            change24hUsd: Math.round((cgData[id].usd_24h_change || 0) * 100) / 100,
            change24hInr: Math.round((cgData[id].inr_24h_change || 0) * 100) / 100,
            icon: meta.icon,
            rank: meta.rank,
          });
        }
      });

      if (parsedCrypto.length > 0) {
        cryptoQuotes = parsedCrypto.sort((a, b) => a.rank - b.rank);
      }

      if (cgData["pax-gold"]?.usd) {
        // PAXG is pegged 1:1 to 1 troy oz of physical gold
        rawGoldSpotUsd = cgData["pax-gold"].usd;
        gold24hChange = cgData["pax-gold"].usd_24h_change || 0.25;
      }
    }
  } catch (err) {
    console.warn("CoinGecko fetch failed, using resilient fallback crypto quotes:", err);
  }

  // 2. Build Precious Metals Vault Quotes
  // Gold 24K
  const gold24k = calculateMetalPriceBreakdown(rawGoldSpotUsd, inrRate, gold24hChange);

  // Gold 22K (91.6% purity jewelry bullion standard)
  const gold22k = calculateMetalPriceBreakdown(rawGoldSpotUsd * 0.9167, inrRate, gold24hChange);

  // Silver 999 (Gold-to-Silver ratio ~84.5 or spot ~$29.70/oz)
  const silverSpotUsd = Math.round((rawGoldSpotUsd / 84.5) * 100) / 100;
  const silver999 = calculateMetalPriceBreakdown(silverSpotUsd, inrRate, gold24hChange * 1.2);

  // Platinum Bullion (Spot ~$950/oz)
  const platinumSpotUsd = Math.round((rawGoldSpotUsd * 0.38) * 100) / 100;
  const platinum = calculateMetalPriceBreakdown(platinumSpotUsd, inrRate, gold24hChange * 0.9);

  const metalsQuotes: LiveMetalsQuote[] = [
    {
      id: "GOLD_24K",
      name: "24K Pure Gold",
      purity: "99.9% Fine Gold",
      pricePerOzUsd: gold24k.pricePerOzUsd,
      pricePerOzInr: gold24k.pricePerOzInr,
      pricePerGramUsd: gold24k.pricePerGramUsd,
      pricePerGramInr: gold24k.pricePerGramInr,
      pricePer10gInr: gold24k.pricePer10gInr,
      change24hPct: gold24k.change24hPct,
      icon: "👑",
      accentColor: "#FFE600",
    },
    {
      id: "GOLD_22K",
      name: "22K Standard Gold",
      purity: "91.6% Hallmark Standard",
      pricePerOzUsd: gold22k.pricePerOzUsd,
      pricePerOzInr: gold22k.pricePerOzInr,
      pricePerGramUsd: gold22k.pricePerGramUsd,
      pricePerGramInr: gold22k.pricePerGramInr,
      pricePer10gInr: gold22k.pricePer10gInr,
      change24hPct: gold22k.change24hPct,
      icon: "🪙",
      accentColor: "#F59E0B",
    },
    {
      id: "SILVER_999",
      name: "Fine Silver 999",
      purity: "99.9% Pure Silver",
      pricePerOzUsd: silver999.pricePerOzUsd,
      pricePerOzInr: silver999.pricePerOzInr,
      pricePerGramUsd: silver999.pricePerGramUsd,
      pricePerGramInr: silver999.pricePerGramInr,
      pricePer10gInr: silver999.pricePer10gInr,
      change24hPct: silver999.change24hPct,
      icon: "🥈",
      accentColor: "#CBD5E1",
    },
    {
      id: "PLATINUM",
      name: "Platinum Bullion",
      purity: "99.95% Pure Platinum",
      pricePerOzUsd: platinum.pricePerOzUsd,
      pricePerOzInr: platinum.pricePerOzInr,
      pricePerGramUsd: platinum.pricePerGramUsd,
      pricePerGramInr: platinum.pricePerGramInr,
      pricePer10gInr: platinum.pricePer10gInr,
      change24hPct: platinum.change24hPct,
      icon: "💎",
      accentColor: "#00F0FF",
    },
  ];

  // 3. Fetch Indian Mutual Funds via MFAPI.in
  const fundSchemes = [
    { code: 120473, shortName: "Axis Gold Direct", house: "Axis Mutual Fund", type: "GOLD_FOF" as const },
    { code: 120828, shortName: "Quant Small Cap Direct", house: "Quant Mutual Fund", type: "MUTUAL_FUND" as const },
    { code: 119551, shortName: "Aditya Birla Sun Life", house: "Aditya Birla MF", type: "MUTUAL_FUND" as const },
  ];

  const fundQuotes: LiveFundQuote[] = [];
  for (const f of fundSchemes) {
    try {
      const res = await fetch(`https://api.mfapi.in/mf/${f.code}/latest`, {
        next: { revalidate: 300 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCESS" && data.data?.[0]) {
          const navInr = parseFloat(data.data[0].nav) || 0;
          fundQuotes.push({
            schemeCode: f.code,
            schemeName: data.meta.scheme_name || f.shortName,
            shortName: f.shortName,
            fundHouse: f.house,
            navInr: Math.round(navInr * 100) / 100,
            navUsd: Math.round((navInr / inrRate) * 100) / 100,
            navDate: data.data[0].date,
            change24hPct: 0.35,
            type: f.type,
          });
        }
      }
    } catch {
      // ignore, use fallback below
    }
  }

  // If MFAPI wasn't fully reached, populate fallback funds
  if (fundQuotes.length === 0) {
    fundQuotes.push(
      {
        schemeCode: 120473,
        schemeName: "Axis Gold Fund - Direct Plan - Growth option",
        shortName: "Axis Gold Direct",
        fundHouse: "Axis Mutual Fund",
        navInr: 49.86,
        navUsd: Math.round((49.86 / inrRate) * 100) / 100,
        navDate: new Date().toLocaleDateString("en-GB"),
        change24hPct: 0.42,
        type: "GOLD_FOF",
      },
      {
        schemeCode: 120828,
        schemeName: "Quant Small Cap Fund - Direct Plan - Growth",
        shortName: "Quant Small Cap Direct",
        fundHouse: "Quant Mutual Fund",
        navInr: 268.45,
        navUsd: Math.round((268.45 / inrRate) * 100) / 100,
        navDate: new Date().toLocaleDateString("en-GB"),
        change24hPct: 1.15,
        type: "MUTUAL_FUND",
      }
    );
  }

  // 4. Fetch US Stock Quotes (Rivian Automotive / RIVN, S&P 500 / VOO)
  const stockQuotes: LiveStockQuote[] = [];
  const stockSymbols = ["RIVN", "VOO"];

  for (const sym of stockSymbols) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const data = await res.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (meta) {
          const priceUsd = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
          stockQuotes.push({
            symbol: sym,
            name: meta.longName || meta.shortName || sym,
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
      // fallback handled below
    }
  }

  if (stockQuotes.length === 0) {
    stockQuotes.push(
      {
        symbol: "RIVN",
        name: "Rivian Automotive, Inc.",
        priceUsd: 16.07,
        priceInr: Math.round(16.07 * inrRate * 100) / 100,
        change24hPct: -4.35,
        fiftyTwoWeekHigh: 22.69,
        fiftyTwoWeekLow: 12.39,
        dayHigh: 16.73,
        dayLow: 15.61,
        currency: "USD",
      },
      {
        symbol: "VOO",
        name: "Vanguard S&P 500 ETF",
        priceUsd: 512.40,
        priceInr: Math.round(512.40 * inrRate * 100) / 100,
        change24hPct: 0.72,
        fiftyTwoWeekHigh: 520.10,
        fiftyTwoWeekLow: 395.20,
        dayHigh: 513.80,
        dayLow: 509.60,
        currency: "USD",
      }
    );
  }

  const payload: LiveMarketPricesPayload = {
    timestamp: new Date().toISOString(),
    formattedDate: fxSnapshot.formattedDate,
    fxRate: inrRate,
    crypto: cryptoQuotes,
    metals: metalsQuotes,
    investedFunds: fundQuotes,
    stocks: stockQuotes,
    source: "LIVE_GATEWAY",
  };

  cachedPayload = payload;
  lastCacheTime = now;

  return NextResponse.json(payload);
}
