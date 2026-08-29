/**
 * Financial Formatting Utilities for The Hoard Ledger
 * Follows rigorous accounting & UX guidelines:
 * - Negative currency places the minus sign BEFORE the currency symbol (-$150,150.00, NEVER $-150,150.00)
 * - Locale comma separators for thousands
 * - Consistent decimal precision
 */

export function formatCurrency(
  val: number | null | undefined,
  fractionDigits = 2
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "$0.00";
  }

  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return isNeg ? `-$${formatted}` : `$${formatted}`;
}

export function formatSignedCurrency(
  val: number | null | undefined,
  fractionDigits = 2
): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "$0.00";
  }

  if (val > 0) {
    const formatted = val.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `+$${formatted}`;
  }

  if (val < 0) {
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `-$${formatted}`;
  }

  return `$${(0).toFixed(fractionDigits)}`;
}

export function formatCompactCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return "$0";
  }

  const isNeg = val < 0;
  const absVal = Math.abs(val);

  let formatted = "";
  if (absVal >= 1_000_000_000) {
    formatted = `${(absVal / 1_000_000_000).toFixed(1)}B`;
  } else if (absVal >= 1_000_000) {
    formatted = `${(absVal / 1_000_000).toFixed(1)}M`;
  } else if (absVal >= 1_000) {
    formatted = `${(absVal / 1_000).toFixed(1)}K`;
  } else {
    formatted = absVal.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  return isNeg ? `-$${formatted}` : `$${formatted}`;
}
