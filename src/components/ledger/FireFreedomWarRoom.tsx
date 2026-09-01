"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  calculateFireMetrics,
  simulateFireDelta,
  FireParameters,
} from "@/lib/ledger/fireCalculator";
import { formatCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import {
  Flame,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Calendar,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface FireFreedomWarRoomProps {
  isOpen: boolean;
  onClose: () => void;
  currentNetWorth: number;
  monthlyExpenses: number;
  monthlySurplus: number;
  currency?: string;
  inrRate?: number;
}

export const FireFreedomWarRoom: React.FC<FireFreedomWarRoomProps> = ({
  isOpen,
  onClose,
  currentNetWorth,
  monthlyExpenses,
  monthlySurplus,
  currency = "USD",
  inrRate = 86.85,
}) => {
  // Tracked ledger outflows (subscriptions + debt minimums) alone drastically
  // understate real spending — there's no rent/groceries/utilities field
  // anywhere in the app. Let the user tell us their actual monthly living
  // expenses so the FIRE number reflects what they'd really need to cover.
  const LIVING_EXPENSES_STORAGE_KEY = "hoard_fire_monthly_living_expenses";
  const [livingExpenses, setLivingExpenses] = useState<number>(0);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LIVING_EXPENSES_STORAGE_KEY);
      if (stored) setLivingExpenses(Math.max(0, parseFloat(stored) || 0));
    } catch {
      // ignore
    }
  }, []);
  const updateLivingExpenses = (value: number) => {
    const clean = Math.max(0, value || 0);
    setLivingExpenses(clean);
    try {
      localStorage.setItem(LIVING_EXPENSES_STORAGE_KEY, String(clean));
    } catch {
      // ignore
    }
  };

  // Baseline initial estimates
  const initialAnnualExpenses = Math.max(12000, (monthlyExpenses + livingExpenses) * 12);
  const initialContribution = Math.max(500, monthlySurplus);

  // Interactive Scenario Sliders State
  const [currentAge, setCurrentAge] = useState<number>(28);
  const [contributionBoost, setContributionBoost] = useState<number>(0);
  const [expenseCull, setExpenseCull] = useState<number>(0);
  const [cagrPct, setCagrPct] = useState<number>(10.0);
  const [swrPct, setSwrPct] = useState<number>(4.0);

  // 1. Baseline parameters (without scenario optimizations)
  const baselineParams: FireParameters = useMemo(
    () => ({
      currentNetWorth,
      annualExpenses: initialAnnualExpenses,
      monthlyContribution: initialContribution,
      expectedCagrPct: 8.5,
      safeWithdrawalRatePct: 4.0,
      currentAge,
    }),
    [currentNetWorth, initialAnnualExpenses, initialContribution, currentAge]
  );

  // 2. Active scenario parameters (with interactive sliders)
  const activeParams: FireParameters = useMemo(
    () => ({
      currentNetWorth,
      annualExpenses: Math.max(6000, initialAnnualExpenses - expenseCull * 12),
      monthlyContribution: Math.max(0, initialContribution + contributionBoost),
      expectedCagrPct: cagrPct,
      safeWithdrawalRatePct: swrPct,
      currentAge,
    }),
    [currentNetWorth, initialAnnualExpenses, expenseCull, initialContribution, contributionBoost, cagrPct, swrPct, currentAge]
  );

  const metrics = useMemo(() => calculateFireMetrics(activeParams), [activeParams]);
  const delta = useMemo(() => simulateFireDelta(baselineParams, activeParams), [baselineParams, activeParams]);

  if (!isOpen) return null;

  const handleReset = () => {
    playSound.click();
    setContributionBoost(0);
    setExpenseCull(0);
    setCagrPct(10.0);
    setSwrPct(4.0);
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div
        className="ledger-modal-box"
        style={{
          maxWidth: "880px",
          width: "95vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div
          className="ledger-modal-header"
          style={{
            padding: "16px 22px",
            background: "#0A0A0A",
            color: "#FFFFFF",
            borderBottom: "2px solid #000000",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Flame size={20} color="#FF6B00" aria-hidden="true" />
            <h2 style={{ color: "#FFFFFF", margin: 0, fontSize: "17px", letterSpacing: "0.04em" }}>
              FIRE FREEDOM CLOCK &amp; WHAT-IF WAR ROOM
            </h2>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                background: "#FF6B00",
                color: "#FFFFFF",
                padding: "2px 6px",
                borderRadius: "2px",
              }}
            >
              FINANCIAL INDEPENDENCE
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="btn-card-action"
              onClick={handleReset}
              style={{
                background: "#222222",
                color: "#FFFFFF",
                borderColor: "#444444",
                fontSize: "10.5px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <RotateCcw size={11} />
              RESET
            </button>
            <button
              type="button"
              className="btn-card-action"
              onClick={onClose}
              style={{
                background: "#222222",
                color: "#FFFFFF",
                borderColor: "#444444",
                padding: "4px 8px",
              }}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* ── TOP HERO FREEDOM DIAL & ACCELERATION CALLOUT ── */}
          <div
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              border: "2.5px solid #000000",
              boxShadow: "4px 4px 0 #000000",
              padding: "20px 24px",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10.5px",
                  fontWeight: 900,
                  color: "#FF6B00",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "4px",
                }}
              >
                <Sparkles size={12} color="#FF6B00" />
                PROJECTED FINANCIAL FREEDOM HORIZON
              </div>
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: "36px",
                  fontWeight: 900,
                  lineHeight: 1.1,
                  color: "#FFE600",
                }}
              >
                {metrics.projectedFireYear} · Age {metrics.projectedFireAge}
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "#A3A3A3", marginTop: "4px" }}>
                Target Nest Egg: <b>{formatCurrency(metrics.targetFireNumber, 0, currency)}</b> ({formatCurrency(metrics.monthlyPassiveIncomeAtFire, 0, currency)}/mo passive income)
              </div>
            </div>

            {/* Delta Acceleration Pill */}
            <div
              style={{
                background: delta.yearsReclaimed > 0 ? "#166534" : "#222222",
                border: `1.5px solid ${delta.yearsReclaimed > 0 ? "#22C55E" : "#444444"}`,
                padding: "12px 16px",
                borderRadius: "3px",
                textAlign: "right",
              }}
            >
              <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", fontWeight: 900, color: "#86EFAC", textTransform: "uppercase" }}>
                TIME RECLAIMED
              </div>
              <div style={{ fontFamily: "var(--display)", fontSize: "24px", fontWeight: 900, color: "#FFFFFF" }}>
                {delta.yearsReclaimed > 0 ? `⚡ +${delta.yearsReclaimed} YRS` : "BASELINE"}
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#D1D5DB" }}>
                {delta.yearsReclaimed > 0
                  ? `Retire ${delta.yearsReclaimed} years earlier than status quo`
                  : "Drag sliders below to accelerate"}
              </div>
            </div>
          </div>

          {/* ── PROGRESS BAR TOWARD FIRE NUMBER ── */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #0A0A0A",
              boxShadow: "3px 3px 0 #0A0A0A",
              padding: "16px 18px",
              borderRadius: "3px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900 }}>
              <span>CURRENT PROGRESS: <b>{metrics.currentProgressPct}%</b> OF TARGET</span>
              <span style={{ color: "#166534" }}>
                {formatCurrency(currentNetWorth, 0, currency)} / {formatCurrency(metrics.targetFireNumber, 0, currency)}
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "16px",
                background: "#F1F5F9",
                border: "1.5px solid #0A0A0A",
                borderRadius: "2px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${Math.max(2, Math.min(100, metrics.currentProgressPct))}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #FF6B00 0%, #FFE600 100%)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* ── MONTHLY LIVING EXPENSES INPUT ── */}
          <div
            style={{
              background: livingExpenses > 0 ? "#F8FAFC" : "#FFF7ED",
              border: `2px solid ${livingExpenses > 0 ? "#0A0A0A" : "#EA580C"}`,
              boxShadow: `3.5px 3.5px 0 ${livingExpenses > 0 ? "#0A0A0A" : "#EA580C"}`,
              padding: "14px 18px",
              borderRadius: "3px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <label htmlFor="fire-living-expenses" style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase" }}>
              Monthly Living Expenses (rent, food, utilities, insurance, etc.)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 900 }}>{getCurrencySymbol(currency)}</span>
              <input
                id="fire-living-expenses"
                type="number"
                min="0"
                step="50"
                value={livingExpenses || ""}
                placeholder="0"
                onChange={(e) => updateLivingExpenses(Number(e.target.value))}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 800,
                  padding: "6px 8px",
                  border: "1.5px solid #0A0A0A",
                  borderRadius: "3px",
                  width: "140px",
                }}
              />
              <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#666" }}>/month</span>
            </div>
            {livingExpenses <= 0 && (
              <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#9A3412", fontWeight: 700 }}>
                ⚠ Without this, your FIRE number only accounts for subscriptions + debt minimums — it will be a
                large underestimate of what you actually need to retire on.
              </div>
            )}
          </div>

          {/* ── INTERACTIVE WHAT-IF SLIDERS ── */}
          <div
            style={{
              background: "#F8FAFC",
              border: "2px solid #0A0A0A",
              boxShadow: "3.5px 3.5px 0 #0A0A0A",
              padding: "18px 20px",
              borderRadius: "3px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
              <Sliders size={13} />
              INTERACTIVE COMPOUND ACCELERATORS &amp; SCENARIOS
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
              {/* Slider 1: Monthly SIP / Contribution Boost */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: "11px", marginBottom: "4px" }}>
                  <span>Monthly Investment Boost:</span>
                  <b style={{ color: "#15803D" }}>+{formatCurrency(contributionBoost, 0, currency)}/mo</b>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3000"
                  step="100"
                  value={contributionBoost}
                  onChange={(e) => {
                    setContributionBoost(Number(e.target.value));
                    playSound.click();
                  }}
                  style={{ width: "100%", cursor: "pointer", accentColor: "#16A34A" }}
                />
                <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#666", display: "flex", justifyContent: "space-between" }}>
                  <span>+$0</span>
                  <span>+₹{(contributionBoost * inrRate).toLocaleString()} INR/mo</span>
                  <span>+$3,000</span>
                </div>
              </div>

              {/* Slider 2: Subscription & Fixed Burn Culling */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: "11px", marginBottom: "4px" }}>
                  <span>Burn / Subscription Cull:</span>
                  <b style={{ color: "#DC2626" }}>-{formatCurrency(expenseCull, 0, currency)}/mo</b>
                </div>
                <input
                  type="range"
                  min="0"
                  max="600"
                  step="25"
                  value={expenseCull}
                  onChange={(e) => {
                    setExpenseCull(Number(e.target.value));
                    playSound.click();
                  }}
                  style={{ width: "100%", cursor: "pointer", accentColor: "#DC2626" }}
                />
                <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#666", display: "flex", justifyContent: "space-between" }}>
                  <span>-$0</span>
                  <span>Lowers target by {formatCurrency(expenseCull * 12 * 25, 0, currency)}</span>
                  <span>-$600</span>
                </div>
              </div>

              {/* Slider 3: Portfolio CAGR Return */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: "11px", marginBottom: "4px" }}>
                  <span>Portfolio Compounding CAGR:</span>
                  <b style={{ color: "#2563EB" }}>{cagrPct.toFixed(1)}%</b>
                </div>
                <input
                  type="range"
                  min="6.0"
                  max="16.0"
                  step="0.5"
                  value={cagrPct}
                  onChange={(e) => {
                    setCagrPct(Number(e.target.value));
                    playSound.click();
                  }}
                  style={{ width: "100%", cursor: "pointer", accentColor: "#2563EB" }}
                />
                <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#666", display: "flex", justifyContent: "space-between" }}>
                  <span>6% (Conservative)</span>
                  <span>10% (S&P 500)</span>
                  <span>16% (Growth SIPs)</span>
                </div>
              </div>

              {/* Slider 4: Current Age */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: "11px", marginBottom: "4px" }}>
                  <span>Current Starting Age:</span>
                  <b style={{ color: "#7C3AED" }}>Age {currentAge}</b>
                </div>
                <input
                  type="range"
                  min="18"
                  max="65"
                  step="1"
                  value={currentAge}
                  onChange={(e) => {
                    setCurrentAge(Number(e.target.value));
                    playSound.click();
                  }}
                  style={{ width: "100%", cursor: "pointer", accentColor: "#7C3AED" }}
                />
                <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#666", display: "flex", justifyContent: "space-between" }}>
                  <span>18</span>
                  <span>Age {currentAge}</span>
                  <span>65</span>
                </div>
              </div>
            </div>

            {/* SWR Presets Selection */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px solid #E2E8F0" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", fontWeight: 900 }}>
                SAFE WITHDRAWAL RULE:
              </span>
              {[
                { label: "Standard (4.0%)", val: 4.0, desc: "25x Annual Expenses" },
                { label: "Fat FIRE (3.3%)", val: 3.3, desc: "30x Conservative" },
                { label: "Lean FIRE (5.0%)", val: 5.0, desc: "20x Fast Freedom" },
              ].map((rule) => (
                <button
                  key={rule.val}
                  type="button"
                  onClick={() => {
                    setSwrPct(rule.val);
                    playSound.click();
                  }}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "10px",
                    fontWeight: 900,
                    padding: "3px 8px",
                    background: swrPct === rule.val ? "#0A0A0A" : "#FFFFFF",
                    color: swrPct === rule.val ? "#FFE600" : "#444444",
                    border: "1.5px solid #0A0A0A",
                    borderRadius: "2px",
                    cursor: "pointer",
                  }}
                >
                  {rule.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── MILESTONE HORIZON CHECKPOINTS ── */}
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", marginBottom: "10px" }}>
              🏁 WEALTH ACCELERATION CHECKPOINTS
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
              {metrics.milestones.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    background: m.achieved ? "#DCFCE7" : "#FFFFFF",
                    border: `1.5px solid ${m.achieved ? "#16A34A" : "#0A0A0A"}`,
                    boxShadow: "2px 2px 0 #0A0A0A",
                    padding: "10px 12px",
                    borderRadius: "3px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", fontWeight: 900, color: m.achieved ? "#15803D" : "#666666" }}>
                      {m.label}
                    </span>
                    {m.achieved && <span style={{ color: "#16A34A", fontSize: "11px" }}>✓</span>}
                  </div>
                  <div style={{ fontFamily: "var(--display)", fontSize: "16px", fontWeight: 900, color: "#0A0A0A", margin: "2px 0" }}>
                    {formatCurrency(m.targetAmount, 0, currency)}
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "#555555" }}>
                    {m.achieved
                      ? "Achieved!"
                      : m.yearAtMilestone
                      ? `${m.yearAtMilestone} (Age ${m.ageAtMilestone})`
                      : "Pending"}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── MODAL FOOTER ── */}
        <div
          className="ledger-modal-footer"
          style={{
            padding: "14px 22px",
            borderTop: "1.5px solid #0A0A0A",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#FAFAFA",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#555" }}>
            Monthly Inflow: <b>+{formatCurrency(activeParams.monthlyContribution, 0, currency)}/mo</b> compounding at <b>{cagrPct}%</b>
          </div>
          <button
            type="button"
            className="btn-ledger btn-ledger-primary"
            onClick={onClose}
            style={{ fontSize: "11px" }}
          >
            DONE / CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
