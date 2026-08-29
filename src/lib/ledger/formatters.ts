/**
 * Financial Formatting Utilities for The Hoard Ledger
 * Follows rigorous accounting & UX guidelines:
 * - Negative currency places the minus sign BEFORE the currency symbol (-$150,150.00, NEVER $-150,150.00)
 * - Locale comma separators for thousands (en-US for USD, en-IN for INR)
 * - Consistent decimal precision
 * - Multi-currency aware: USD ($), INR (₹), EUR (€), GBP (£), JPY (¥), etc.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  SGD: "S$",
  AED: "AED ",
};

/** Returns the symbol for a given ISO currency code. Falls back to the code itself. */
export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return "$";
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

function getLocale(currency?: string | null): string {
  if (currency?.toUpperCase() === "INR") return "en-IN";
  return "en-US";
}

export function formatCurrency(
  val: number | null | undefined,
  fractionDigits = 2,
  currency?: string | null
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return `${getCurrencySymbol(currency)}0.00`;
  }

  const sym = getCurrencySymbol(currency);
  const locale = getLocale(currency);
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return isNeg ? `-${sym}${formatted}` : `${sym}${formatted}`;
}

export function getAssetCurrency(
  asset?: { notes?: string | null; institution?: string | null; currency?: string | null; name?: string | null } | null,
  fallback = "USD"
): string {
  if (!asset) return fallback;
  if ((asset as any).currency) return (asset as any).currency.toUpperCase();
  if (asset.notes) {
    const match = asset.notes.match(/\[currency:([A-Za-z]{3})\]/);
    if (match && match[1]) return match[1].toUpperCase();
    if (asset.notes.includes("Auto-linked from Recurring SIP")) return "INR";
  }
  const indianBrokers = ["Groww", "Jar", "Cred", "Zerodha", "Upstox", "AngelOne", "Paytm Money", "Indmoney", "Wint Wealth"];
  if (asset.institution && indianBrokers.some((b) => asset.institution?.toLowerCase().includes(b.toLowerCase()))) {
    return "INR";
  }
  if (asset.name && indianBrokers.some((b) => asset.name?.toLowerCase().includes(b.toLowerCase()))) {
    return "INR";
  }
  return fallback;
}

export function cleanNotesText(notes?: string | null): string {
  if (!notes) return "";
  return notes
    .replace(/\[currency:[A-Za-z]{3}\]/g, "")
    .replace(/\[accrual:{.*?}\]/g, "")
    .trim();
}

export function formatSignedCurrency(
  val: number | null | undefined,
  fractionDigits = 2,
  currency?: string | null
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return `${getCurrencySymbol(currency)}0.00`;
  }

  const sym = getCurrencySymbol(currency);
  const locale = getLocale(currency);

  if (val > 0) {
    const formatted = val.toLocaleString(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `+${sym}${formatted}`;
  }

  if (val < 0) {
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `-${sym}${formatted}`;
  }

  return `${sym}${(0).toFixed(fractionDigits)}`;
}

export function formatCompactCurrency(val: number | null | undefined, currency?: string | null): string {
  if (val === null || val === undefined || isNaN(val)) {
    return `${getCurrencySymbol(currency)}0`;
  }

  const sym = getCurrencySymbol(currency);
  const isINR = currency?.toUpperCase() === "INR";
  const locale = getLocale(currency);
  const isNeg = val < 0;
  const absVal = Math.abs(val);

  let formatted = "";
  if (absVal >= 1_000_000_000) {
    formatted = `${(absVal / 1_000_000_000).toFixed(1)}B`;
  } else if (absVal >= 10_000_000 && isINR) {
    // Indian Cr notation for INR
    formatted = `${(absVal / 10_000_000).toFixed(2)} Cr`;
  } else if (absVal >= 100_000 && isINR) {
    // Indian Lakh notation for INR
    formatted = `${(absVal / 100_000).toFixed(2)} L`;
  } else if (absVal >= 1_000_000) {
    formatted = `${(absVal / 1_000_000).toFixed(1)}M`;
  } else if (absVal >= 1_000) {
    formatted = `${(absVal / 1_000).toFixed(1)}K`;
  } else {
    formatted = absVal.toLocaleString(locale, { maximumFractionDigits: 0 });
  }

  return isNeg ? `-${sym}${formatted}` : `${sym}${formatted}`;
}
