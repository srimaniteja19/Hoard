/**
 * Real-Time Foreign Exchange (FX) Currency Conversion Engine
 *
 * Provides real-time and cached conversion rates between INR (and other major currencies)
 * and USD, with rate timestamps and date tracking for financial statistics and AI audits.
 */

export interface FxRateSnapshot {
  base: string; // "USD"
  rates: Record<string, number>; // e.g. { INR: 86.85, EUR: 0.92, ... }
  date: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "Aug 29, 2026"
  lastUpdated: string; // ISO string
  inrPerUsd: number;
  usdPerInr: number;
  /** False when these are hardcoded fallback rates, not a live/cached fetch. */
  isLive: boolean;
}

// Fallback baseline rates (updated daily/fallback)
export const FALLBACK_FX_RATES: Record<string, number> = {
  USD: 1,
  INR: 86.85,
  EUR: 0.92,
  GBP: 0.78,
  CAD: 1.43,
  AUD: 1.58,
  JPY: 153.2,
  AED: 3.67,
  SGD: 1.35,
};

let cachedSnapshot: FxRateSnapshot | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

function buildSnapshot(rates: Record<string, number>, dateStr?: string, isLive: boolean = false): FxRateSnapshot {
  const now = new Date();
  const date = dateStr || now.toISOString().split("T")[0];
  const inrRate = rates["INR"] && rates["INR"] > 0 ? rates["INR"] : FALLBACK_FX_RATES.INR;

  return {
    base: "USD",
    rates: { ...FALLBACK_FX_RATES, ...rates, USD: 1 },
    date,
    formattedDate: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    lastUpdated: now.toISOString(),
    inrPerUsd: inrRate,
    usdPerInr: inrRate > 0 ? 1 / inrRate : 1 / 86.85,
    isLive,
  };
}

/**
 * Returns synchronous cached or fallback FX rates immediately. Never fetches
 * live rates itself — callers on a cold instance that haven't awaited
 * getLiveFxSnapshot() yet will get hardcoded fallback rates (isLive: false).
 */
export function getFxSnapshotSync(): FxRateSnapshot {
  if (cachedSnapshot && Date.now() < cacheExpiry) {
    return cachedSnapshot;
  }
  const snapshot = buildSnapshot(cachedSnapshot?.rates || FALLBACK_FX_RATES, undefined, cachedSnapshot?.isLive ?? false);
  cachedSnapshot = snapshot;
  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return snapshot;
}

/**
 * Fetches real-time exchange rates with in-memory caching and fallback
 */
export async function getLiveFxSnapshot(): Promise<FxRateSnapshot> {
  if (cachedSnapshot && Date.now() < cacheExpiry) {
    return cachedSnapshot;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.rates && typeof data.rates === "object") {
        const snapshot = buildSnapshot(
          data.rates,
          data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().split("T")[0] : undefined,
          true
        );
        cachedSnapshot = snapshot;
        cacheExpiry = Date.now() + CACHE_TTL_MS;
        return snapshot;
      }
    }
  } catch {
    // Network or timeout - use fallback smoothly
  }

  const fallback = buildSnapshot(FALLBACK_FX_RATES, undefined, false);
  cachedSnapshot = fallback;
  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return fallback;
}

/**
 * Converts any currency amount to USD (Base)
 */
export function convertToUsd(
  amount: number | null | undefined,
  fromCurrency?: string | null,
  customInrRate?: number
): number {
  if (!amount || isNaN(amount) || amount === 0) return 0;
  if (!fromCurrency || fromCurrency.toUpperCase() === "USD") return amount;

  const code = fromCurrency.toUpperCase();
  if (code === "INR") {
    const rate = customInrRate && customInrRate > 0 ? customInrRate : (cachedSnapshot?.inrPerUsd || FALLBACK_FX_RATES.INR);
    return Math.round((amount / rate) * 100) / 100;
  }

  const rates = cachedSnapshot?.rates || FALLBACK_FX_RATES;
  const rateToUsd = rates[code];
  if (rateToUsd && rateToUsd > 0) {
    return Math.round((amount / rateToUsd) * 100) / 100;
  }

  console.warn(`[fx] No exchange rate for currency "${code}" — treating ${amount} as USD unconverted.`);
  return amount;
}

/**
 * Converts USD amount to a target currency
 */
export function convertFromUsd(
  usdAmount: number | null | undefined,
  toCurrency?: string | null,
  customInrRate?: number
): number {
  if (!usdAmount || isNaN(usdAmount) || usdAmount === 0) return 0;
  if (!toCurrency || toCurrency.toUpperCase() === "USD") return usdAmount;

  const code = toCurrency.toUpperCase();
  if (code === "INR") {
    const rate = customInrRate && customInrRate > 0 ? customInrRate : (cachedSnapshot?.inrPerUsd || FALLBACK_FX_RATES.INR);
    return Math.round(usdAmount * rate * 100) / 100;
  }

  const rates = cachedSnapshot?.rates || FALLBACK_FX_RATES;
  const rate = rates[code];
  if (rate && rate > 0) {
    return Math.round(usdAmount * rate * 100) / 100;
  }

  console.warn(`[fx] No exchange rate for currency "${code}" — treating ${usdAmount} as unconverted.`);
  return usdAmount;
}
