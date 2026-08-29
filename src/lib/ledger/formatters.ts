/**
 * Financial Formatting Utilities for The Hoard Ledger
 * Follows rigorous accounting & UX guidelines:
 * - Negative currency places the minus sign BEFORE the currency symbol (-$150,150.00, NEVER $-150,150.00)
 * - Locale comma separators for thousands
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

export function formatCurrency(
  val: number | null | undefined,
  fractionDigits = 2,
  currency?: string | null
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return `${getCurrencySymbol(currency)}0.00`;
  }

  const sym = getCurrencySymbol(currency);
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return isNeg ? `-${sym}${formatted}` : `${sym}${formatted}`;
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

  if (val > 0) {
    const formatted = val.toLocaleString("en-IN", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `+${sym}${formatted}`;
  }

  if (val < 0) {
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString("en-IN", {
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
  const isNeg = val < 0;
  const absVal = Math.abs(val);

  let formatted = "";
  if (absVal >= 1_000_000_000) {
    formatted = `${(absVal / 1_000_000_000).toFixed(1)}B`;
  } else if (absVal >= 10_000_000) {
    // Indian Cr notation for INR
    formatted = currency === "INR" ? `${(absVal / 10_000_000).toFixed(2)} Cr` : `${(absVal / 1_000_000).toFixed(1)}M`;
  } else if (absVal >= 100_000 && currency === "INR") {
    formatted = `${(absVal / 100_000).toFixed(2)} L`;
  } else if (absVal >= 1_000_000) {
    formatted = `${(absVal / 1_000_000).toFixed(1)}M`;
  } else if (absVal >= 1_000) {
    formatted = `${(absVal / 1_000).toFixed(1)}K`;
  } else {
    formatted = absVal.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }

  return isNeg ? `-${sym}${formatted}` : `${sym}${formatted}`;
}
