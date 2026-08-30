/**
 * Live Market Prices & Bullion / Crypto / Stocks Types
 */

export interface LiveCryptoQuote {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceInr: number;
  change24hUsd: number; // Percentage, e.g. +2.45
  change24hInr: number;
  icon: string;
  rank: number;
}

export interface LiveMetalsQuote {
  id: "GOLD_24K" | "GOLD_22K" | "SILVER_999" | "PLATINUM";
  name: string;
  purity: string;
  pricePerOzUsd: number;
  pricePerOzInr: number;
  pricePerGramUsd: number;
  pricePerGramInr: number;
  pricePer10gInr: number;
  change24hPct: number;
  icon: string;
  accentColor: string;
}

export interface LiveFundQuote {
  schemeCode: number;
  schemeName: string;
  shortName: string;
  fundHouse: string;
  navInr: number;
  navUsd: number;
  navDate: string;
  change24hPct: number;
  type: "MUTUAL_FUND" | "ETF" | "GOLD_FOF";
}

export interface LiveStockQuote {
  symbol: string;
  name: string;
  priceUsd: number;
  priceInr: number;
  change24hPct: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  dayHigh: number;
  dayLow: number;
  currency: string;
}

export interface LiveMarketPricesPayload {
  timestamp: string;
  formattedDate: string;
  fxRate: number; // INR per USD
  crypto: LiveCryptoQuote[];
  metals: LiveMetalsQuote[];
  investedFunds: LiveFundQuote[];
  stocks: LiveStockQuote[];
  source: "LIVE_GATEWAY" | "CACHE" | "FALLBACK";
}

export interface LiveMarketSearchResults {
  funds: LiveFundQuote[];
  stocks: LiveStockQuote[];
  crypto: LiveCryptoQuote[];
}

/**
 * 1 Troy Ounce in Grams = 31.1034768
 */
export const TROY_OUNCE_GRAMS = 31.1034768;

/**
 * Calculates per-gram and per-10g metrics from raw Troy Ounce spot price.
 */
export function calculateMetalPriceBreakdown(
  pricePerOzUsd: number,
  inrRate: number,
  change24hPct: number = 0
) {
  const pricePerOzInr = pricePerOzUsd * inrRate;
  const pricePerGramUsd = pricePerOzUsd / TROY_OUNCE_GRAMS;
  const pricePerGramInr = pricePerOzInr / TROY_OUNCE_GRAMS;
  const pricePer10gInr = pricePerGramInr * 10;

  return {
    pricePerOzUsd: Math.round(pricePerOzUsd * 100) / 100,
    pricePerOzInr: Math.round(pricePerOzInr * 100) / 100,
    pricePerGramUsd: Math.round(pricePerGramUsd * 100) / 100,
    pricePerGramInr: Math.round(pricePerGramInr * 100) / 100,
    pricePer10gInr: Math.round(pricePer10gInr),
    change24hPct: Math.round(change24hPct * 100) / 100,
  };
}
