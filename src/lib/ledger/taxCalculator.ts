import { IncomeCadence } from "./types";

export interface TaxCalculationParams {
  amount: number;
  cadence: IncomeCadence;
  isPreTax?: boolean;
  country?: string | null;
  region?: string | null;
  customTaxRate?: number | null;
}

export interface TaxCalculationResult {
  grossAnnual: number;
  grossMonthly: number;
  federalTaxAnnual: number;
  stateTaxAnnual: number;
  ficaTaxAnnual: number;
  totalTaxAnnual: number;
  totalTaxMonthly: number;
  effectiveTaxRatePct: number;
  netMonthlyIncome: number;
  jurisdictionLabel: string;
}

export const US_STATES = [
  { code: "AL", name: "Alabama (AL)", flatRate: 0.05 },
  { code: "AK", name: "Alaska (AK - 0%)", flatRate: 0.0 },
  { code: "AZ", name: "Arizona (AZ)", flatRate: 0.025 },
  { code: "AR", name: "Arkansas (AR)", flatRate: 0.044 },
  { code: "CA", name: "California (CA)", isProgressive: true },
  { code: "CO", name: "Colorado (CO)", flatRate: 0.044 },
  { code: "CT", name: "Connecticut (CT)", flatRate: 0.06 },
  { code: "DE", name: "Delaware (DE)", flatRate: 0.055 },
  { code: "FL", name: "Florida (FL - 0%)", flatRate: 0.0 },
  { code: "GA", name: "Georgia (GA)", flatRate: 0.0549 },
  { code: "HI", name: "Hawaii (HI)", flatRate: 0.07 },
  { code: "ID", name: "Idaho (ID)", flatRate: 0.058 },
  { code: "IL", name: "Illinois (IL)", flatRate: 0.0495 },
  { code: "IN", name: "Indiana (IN)", flatRate: 0.0305 },
  { code: "IA", name: "Iowa (IA)", flatRate: 0.038 },
  { code: "KS", name: "Kansas (KS)", flatRate: 0.057 },
  { code: "KY", name: "Kentucky (KY)", flatRate: 0.04 },
  { code: "LA", name: "Louisiana (LA)", flatRate: 0.0425 },
  { code: "ME", name: "Maine (ME)", flatRate: 0.065 },
  { code: "MD", name: "Maryland (MD)", flatRate: 0.05 },
  { code: "MA", name: "Massachusetts (MA)", flatRate: 0.05 },
  { code: "MI", name: "Michigan (MI)", flatRate: 0.0425 },
  { code: "MN", name: "Minnesota (MN)", flatRate: 0.075 },
  { code: "MS", name: "Mississippi (MS)", flatRate: 0.047 },
  { code: "MO", name: "Missouri (MO)", flatRate: 0.048 },
  { code: "MT", name: "Montana (MT)", flatRate: 0.059 },
  { code: "NE", name: "Nebraska (NE)", flatRate: 0.058 },
  { code: "NV", name: "Nevada (NV - 0%)", flatRate: 0.0 },
  { code: "NH", name: "New Hampshire (NH - 0%)", flatRate: 0.0 },
  { code: "NJ", name: "New Jersey (NJ)", flatRate: 0.065 },
  { code: "NM", name: "New Mexico (NM)", flatRate: 0.049 },
  { code: "NY", name: "New York (NY)", isProgressive: true },
  { code: "NC", name: "North Carolina (NC)", flatRate: 0.045 },
  { code: "ND", name: "North Dakota (ND)", flatRate: 0.02 },
  { code: "OH", name: "Ohio (OH)", flatRate: 0.035 },
  { code: "OK", name: "Oklahoma (OK)", flatRate: 0.0475 },
  { code: "OR", name: "Oregon (OR)", flatRate: 0.0875 },
  { code: "PA", name: "Pennsylvania (PA)", flatRate: 0.0307 },
  { code: "RI", name: "Rhode Island (RI)", flatRate: 0.05 },
  { code: "SC", name: "South Carolina (SC)", flatRate: 0.064 },
  { code: "SD", name: "South Dakota (SD - 0%)", flatRate: 0.0 },
  { code: "TN", name: "Tennessee (TN - 0%)", flatRate: 0.0 },
  { code: "TX", name: "Texas (TX - 0%)", flatRate: 0.0 },
  { code: "UT", name: "Utah (UT)", flatRate: 0.0465 },
  { code: "VT", name: "Vermont (VT)", flatRate: 0.065 },
  { code: "VA", name: "Virginia (VA)", flatRate: 0.0575 },
  { code: "WA", name: "Washington (WA - 0%)", flatRate: 0.0 },
  { code: "WV", name: "West Virginia (WV)", flatRate: 0.0512 },
  { code: "WI", name: "Wisconsin (WI)", flatRate: 0.053 },
  { code: "WY", name: "Wyoming (WY - 0%)", flatRate: 0.0 },
] as const;

export const SUPPORTED_COUNTRIES = [
  { code: "US", name: "United States (US)" },
  { code: "UK", name: "United Kingdom (UK)" },
  { code: "CA", name: "Canada (CA)" },
  { code: "IN", name: "India (IN)" },
  { code: "OTHER", name: "Other / Custom Rate" },
] as const;

export const CANADIAN_PROVINCES = [
  { code: "ON", name: "Ontario (ON)", rate: 0.09 },
  { code: "BC", name: "British Columbia (BC)", rate: 0.085 },
  { code: "AB", name: "Alberta (AB - 10%)", rate: 0.10 },
  { code: "QC", name: "Quebec (QC)", rate: 0.15 },
  { code: "OTHER", name: "Other Province", rate: 0.08 },
] as const;

export function normalizeToAnnual(amount: number, cadence: IncomeCadence): number {
  if (!amount || isNaN(amount) || amount <= 0) return 0;
  switch (cadence) {
    case "WEEKLY":
      return amount * 52;
    case "BIWEEKLY":
      return amount * 26;
    case "SEMI_MONTHLY":
      return amount * 24;
    case "MONTHLY":
      return amount * 12;
    case "ANNUAL":
      return amount;
    default:
      return amount * 12;
  }
}

/**
 * Calculates progressive tax through progressive bracket tiers
 */
function calculateProgressiveTax(
  taxableIncome: number,
  brackets: Array<{ upTo: number; rate: number }>
): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prevLimit = 0;

  for (const b of brackets) {
    if (taxableIncome > prevLimit) {
      const taxableChunk = Math.min(taxableIncome, b.upTo) - prevLimit;
      tax += taxableChunk * b.rate;
      prevLimit = b.upTo;
    } else {
      break;
    }
  }

  return tax;
}

/**
 * US Federal 2026 Single Filer Estimated Brackets
 */
const US_FED_BRACKETS = [
  { upTo: 11600, rate: 0.10 },
  { upTo: 47150, rate: 0.12 },
  { upTo: 100525, rate: 0.22 },
  { upTo: 191950, rate: 0.24 },
  { upTo: 243725, rate: 0.32 },
  { upTo: 609350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

const CA_STATE_BRACKETS = [
  { upTo: 10412, rate: 0.01 },
  { upTo: 24684, rate: 0.02 },
  { upTo: 38959, rate: 0.04 },
  { upTo: 54081, rate: 0.06 },
  { upTo: 68350, rate: 0.08 },
  { upTo: 349137, rate: 0.093 },
  { upTo: 418961, rate: 0.103 },
  { upTo: 698271, rate: 0.113 },
  { upTo: Infinity, rate: 0.123 },
];

const NY_STATE_BRACKETS = [
  { upTo: 8500, rate: 0.04 },
  { upTo: 11700, rate: 0.045 },
  { upTo: 13900, rate: 0.0525 },
  { upTo: 80650, rate: 0.0585 },
  { upTo: 215400, rate: 0.0625 },
  { upTo: 1077550, rate: 0.0685 },
  { upTo: Infinity, rate: 0.0965 },
];

/**
 * Computes exact estimated federal, state/provincial, FICA/NI, and effective tax rates
 */
export function calculateIncomeTax(params: TaxCalculationParams): TaxCalculationResult {
  const {
    amount,
    cadence,
    isPreTax = false,
    country = "US",
    region = "CA",
    customTaxRate = null,
  } = params;

  const grossAnnual = normalizeToAnnual(amount, cadence);
  const grossMonthly = grossAnnual / 12;

  // If already post-tax (net), no tax deduction applies
  if (!isPreTax || grossAnnual <= 0) {
    return {
      grossAnnual,
      grossMonthly,
      federalTaxAnnual: 0,
      stateTaxAnnual: 0,
      ficaTaxAnnual: 0,
      totalTaxAnnual: 0,
      totalTaxMonthly: 0,
      effectiveTaxRatePct: 0,
      netMonthlyIncome: grossMonthly,
      jurisdictionLabel: "Post-Tax (Take-Home)",
    };
  }

  // 1. Check custom override rate
  if (customTaxRate !== null && customTaxRate !== undefined && customTaxRate >= 0) {
    const rate = Math.min(100, customTaxRate) / 100;
    const totalTaxAnnual = grossAnnual * rate;
    const totalTaxMonthly = totalTaxAnnual / 12;
    return {
      grossAnnual,
      grossMonthly,
      federalTaxAnnual: totalTaxAnnual,
      stateTaxAnnual: 0,
      ficaTaxAnnual: 0,
      totalTaxAnnual,
      totalTaxMonthly,
      effectiveTaxRatePct: Math.round(customTaxRate * 10) / 10,
      netMonthlyIncome: Math.max(0, grossMonthly - totalTaxMonthly),
      jurisdictionLabel: `Custom (${customTaxRate}%)`,
    };
  }

  let federalTaxAnnual = 0;
  let stateTaxAnnual = 0;
  let ficaTaxAnnual = 0;
  let jurisdictionLabel = "US (Federal + State)";

  // 2. Country Specific Calculations
  if (country === "US") {
    // Federal Tax (Standard deduction approx $14,600)
    const stdDeduction = 14600;
    const federalTaxable = Math.max(0, grossAnnual - stdDeduction);
    federalTaxAnnual = calculateProgressiveTax(federalTaxable, US_FED_BRACKETS);

    // FICA: Social Security (6.2% up to $168,600) + Medicare (1.45%)
    const ssTaxable = Math.min(grossAnnual, 168600);
    const ssTax = ssTaxable * 0.062;
    const medicareTax = grossAnnual * 0.0145;
    const addlMedicare = grossAnnual > 200000 ? (grossAnnual - 200000) * 0.009 : 0;
    ficaTaxAnnual = ssTax + medicareTax + addlMedicare;

    // State Tax
    const stCode = (region || "CA").toUpperCase();
    const stConfig = US_STATES.find((s) => s.code === stCode);

    if (stCode === "CA") {
      const caDeduction = 5363;
      const caTaxable = Math.max(0, grossAnnual - caDeduction);
      stateTaxAnnual = calculateProgressiveTax(caTaxable, CA_STATE_BRACKETS);
      jurisdictionLabel = "US (Federal + CA + FICA)";
    } else if (stCode === "NY") {
      const nyDeduction = 8000;
      const nyTaxable = Math.max(0, grossAnnual - nyDeduction);
      stateTaxAnnual = calculateProgressiveTax(nyTaxable, NY_STATE_BRACKETS);
      jurisdictionLabel = "US (Federal + NY + FICA)";
    } else if (stConfig && "flatRate" in stConfig) {
      stateTaxAnnual = grossAnnual * stConfig.flatRate;
      jurisdictionLabel = `US (Federal + ${stCode} + FICA)`;
    } else {
      // Default state rate 4.5%
      stateTaxAnnual = grossAnnual * 0.045;
      jurisdictionLabel = `US (Federal + ${stCode} + FICA)`;
    }
  } else if (country === "UK") {
    // UK PAYE + NI
    const personalAllowance = grossAnnual > 100000 ? Math.max(0, 12570 - (grossAnnual - 100000) / 2) : 12570;
    const taxable = Math.max(0, grossAnnual - personalAllowance);

    const ukBrackets = [
      { upTo: 37700, rate: 0.20 }, // 12,570 to 50,270
      { upTo: 112570, rate: 0.40 }, // 50,270 to 125,140
      { upTo: Infinity, rate: 0.45 },
    ];
    federalTaxAnnual = calculateProgressiveTax(taxable, ukBrackets);

    // National Insurance (8% £12,570 to £50,270, 2% above)
    const niBand1 = Math.max(0, Math.min(grossAnnual, 50270) - 12570);
    const niBand2 = Math.max(0, grossAnnual - 50270);
    ficaTaxAnnual = niBand1 * 0.08 + niBand2 * 0.02;
    stateTaxAnnual = 0;
    jurisdictionLabel = "UK (Income Tax + NI)";
  } else if (country === "CA") {
    // Canada Federal + Provincial
    const caFederalBrackets = [
      { upTo: 55867, rate: 0.15 },
      { upTo: 111733, rate: 0.205 },
      { upTo: 173205, rate: 0.26 },
      { upTo: 246752, rate: 0.29 },
      { upTo: Infinity, rate: 0.33 },
    ];
    federalTaxAnnual = calculateProgressiveTax(grossAnnual, caFederalBrackets);

    const provCode = (region || "ON").toUpperCase();
    const provConfig = CANADIAN_PROVINCES.find((p) => p.code === provCode) || CANADIAN_PROVINCES[0];
    stateTaxAnnual = grossAnnual * provConfig.rate;

    // CPP + EI estimate approx 6.5% up to max cap
    ficaTaxAnnual = Math.min(grossAnnual, 68500) * 0.065;
    jurisdictionLabel = `Canada (Federal + ${provCode})`;
  } else if (country === "IN") {
    // India New Tax Regime
    const standardDeduction = 75000;
    const inTaxable = Math.max(0, grossAnnual - standardDeduction);
    const inBrackets = [
      { upTo: 300000, rate: 0.0 },
      { upTo: 700000, rate: 0.05 },
      { upTo: 1000000, rate: 0.10 },
      { upTo: 1200000, rate: 0.15 },
      { upTo: 1500000, rate: 0.20 },
      { upTo: Infinity, rate: 0.30 },
    ];
    federalTaxAnnual = calculateProgressiveTax(inTaxable, inBrackets);
    stateTaxAnnual = 0;
    ficaTaxAnnual = federalTaxAnnual * 0.04; // 4% Health & Education cess
    jurisdictionLabel = "India (New Regime)";
  } else {
    // Generic Default 25%
    federalTaxAnnual = grossAnnual * 0.25;
    jurisdictionLabel = "Global Estimate (25%)";
  }

  const totalTaxAnnual = federalTaxAnnual + stateTaxAnnual + ficaTaxAnnual;
  const totalTaxMonthly = totalTaxAnnual / 12;
  const effectiveTaxRatePct = grossAnnual > 0 ? Math.round((totalTaxAnnual / grossAnnual) * 1000) / 10 : 0;
  const netMonthlyIncome = Math.max(0, grossMonthly - totalTaxMonthly);

  return {
    grossAnnual,
    grossMonthly,
    federalTaxAnnual,
    stateTaxAnnual,
    ficaTaxAnnual,
    totalTaxAnnual,
    totalTaxMonthly,
    effectiveTaxRatePct,
    netMonthlyIncome,
    jurisdictionLabel,
  };
}
