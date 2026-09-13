"use client";

import React, { useState, useMemo } from "react";
import { FinancialDebtRow } from "@/lib/ledger/types";
import { calculateDebtObligationsSummary } from "@/lib/ledger/debtPayoff";
import { formatCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import {
  Flame,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
  Sparkles,
  CreditCard,
  Building2,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

interface DebtObligationBannerProps {
  debts: FinancialDebtRow[];
  currency?: string;
  onScrollToSimulator?: () => void;
}

export const DebtObligationBanner: React.FC<DebtObligationBannerProps> = ({
  debts,
  currency = "USD",
  onScrollToSimulator,
}) => {
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Compute multi-debt obligation metrics
  const summary = useMemo(() => calculateDebtObligationsSummary(debts), [debts]);
  const sym = getCurrencySymbol(currency);

  // Calculate next due obligation based on current day of the month
  const nextDueInfo = useMemo(() => {
    const activeWithDue = summary.accounts.filter(
      (a) => a.dueDay && a.dueDay >= 1 && a.dueDay <= 31
    );
    if (activeWithDue.length === 0) return null;

    const todayDay = new Date().getDate();

    // Sort by days remaining until due day
    const sorted = [...activeWithDue].map((a) => {
      const due = a.dueDay!;
      const daysUntil = due >= todayDay ? due - todayDay : 30 - todayDay + due;
      return { ...a, daysUntil };
    }).sort((a, b) => a.daysUntil - b.daysUntil);

    return sorted[0];
  }, [summary.accounts]);

  // Handle toggle with sound
  const handleToggleAudit = () => {
    playSound.pop();
    setIsAuditOpen((prev) => !prev);
  };

  // If user has zero active debts, show triumphant debt-free state
  if (summary.activeCount === 0) {
    return (
      <div className="debt-ob-banner debt-ob-banner--free">
        <div className="debt-ob-free-content">
          <div className="debt-ob-free-badge">
            <Sparkles size={16} className="debt-ob-sparkle" />
            <span>FINANCIAL FREEDOM // ZERO LIABILITIES</span>
          </div>
          <h3 className="debt-ob-free-title">
            100% DEBT-FREE — $0.00 MONTHLY INTEREST DRAIN
          </h3>
          <p className="debt-ob-free-desc">
            You have no active debt obligations. 100% of your incoming capital is preserved for savings, investments, and wealth compounding.
          </p>
        </div>
      </div>
    );
  }

  const isHighApr = summary.weightedApr >= 18;

  return (
    <div className={`debt-ob-banner ${summary.isNegativeAmortization ? "debt-ob-banner--danger" : ""}`}>
      {/* ── 1. LIVE TELEMETRY STATUS STRIP ── */}
      <div className="debt-ob-header-strip">
        <div className="debt-ob-strip-left">
          <div className="debt-ob-pulse-wrap">
            <span className={`debt-ob-pulse ${isHighApr ? "danger" : "warning"}`} />
            <span className="debt-ob-strip-title">
              FISCAL_OS // DEBT_CARRYING_COST_RADAR
            </span>
          </div>
          <span className="debt-ob-strip-sub">LIVE OBLIGATION MONITOR</span>
        </div>

        <div className="debt-ob-strip-right">
          <div className="debt-ob-chip">
            <CreditCard size={12} />
            <span>{summary.activeCount} {summary.activeCount === 1 ? "ACCOUNT" : "ACCOUNTS"}</span>
          </div>

          <div className={`debt-ob-chip ${isHighApr ? "danger" : "accent"}`}>
            <Zap size={12} />
            <span>{summary.weightedApr}% BLENDED APR</span>
          </div>

          {nextDueInfo && (
            <div className="debt-ob-chip highlight">
              <Calendar size={12} />
              <span>
                NEXT: DAY {nextDueInfo.dueDay} ({nextDueInfo.name.slice(0, 14)})
                {nextDueInfo.daysUntil === 0
                  ? " · DUE TODAY"
                  : nextDueInfo.daysUntil === 1
                  ? " · TOMORROW"
                  : ` · IN ${nextDueInfo.daysUntil}D`}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleAudit}
            className={`debt-ob-toggle-btn ${isAuditOpen ? "active" : ""}`}
            title="Toggle individual debt interest breakdown"
          >
            {isAuditOpen ? (
              <>
                <span>HIDE AUDIT</span>
                <ChevronUp size={13} />
              </>
            ) : (
              <>
                <span>AUDIT BY ACCOUNT</span>
                <ChevronDown size={13} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. NEGATIVE AMORTIZATION CRITICAL WARNING (IF APPLICABLE) ── */}
      {summary.isNegativeAmortization && (
        <div className="debt-ob-danger-alert">
          <AlertTriangle size={16} className="debt-ob-alert-icon" />
          <div className="debt-ob-alert-text">
            <b>CRITICAL WARNING: NEGATIVE AMORTIZATION DETECTED.</b> Your monthly interest accrual ({formatCurrency(summary.totalMonthlyInterest, 2, currency)}/mo) exceeds your total scheduled minimum payments ({formatCurrency(summary.totalMinMonthly, 2, currency)}/mo). If you only pay minimums, your total debt balance will <b>increase by {formatCurrency(summary.totalMonthlyInterest - summary.totalMinMonthly, 2, currency)} every single month</b>.
          </div>
        </div>
      )}

      {/* ── 3. CORE METRICS COMMAND CELLS ── */}
      <div className="debt-ob-cells-grid">
        {/* CELL 1: MONTHLY INTEREST ACCRUAL */}
        <div className="debt-ob-cell debt-ob-cell--burn">
          <div className="debt-ob-cell-top">
            <div className="debt-ob-cell-label-wrap">
              <Flame size={14} className="debt-ob-cell-icon burn" />
              <span className="debt-ob-cell-label">MONTHLY INTEREST ACCRUAL</span>
            </div>
            <span className={`debt-ob-tag ${isHighApr ? "danger" : "burn"}`}>
              {isHighApr ? "CRITICAL LEAK" : "CARRYING COST"}
            </span>
          </div>

          <div className="debt-ob-cell-value-wrap">
            <span className="debt-ob-currency">{sym}</span>
            <span className="debt-ob-amount">
              {summary.totalMonthlyInterest.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="debt-ob-cadence">/mo</span>
          </div>

          <div className="debt-ob-cell-telemetry">
            <div className="debt-ob-telem-item">
              <span className="debt-ob-telem-dot red" />
              <span><b>{formatCurrency(summary.dailyInterestBurn, 2, currency)}</b> /day burn rate</span>
            </div>
            <div className="debt-ob-telem-item">
              <span className="debt-ob-telem-dot gray" />
              <span><b>{formatCurrency(summary.annualInterestDrain, 0, currency)}</b> /yr unrecoverable</span>
            </div>
          </div>
        </div>

        {/* CELL 2: TOTAL MINIMUM COMMITMENT */}
        <div className="debt-ob-cell debt-ob-cell--min">
          <div className="debt-ob-cell-top">
            <div className="debt-ob-cell-label-wrap">
              <ShieldCheck size={14} className="debt-ob-cell-icon min" />
              <span className="debt-ob-cell-label">TOTAL MONTHLY MINIMUMS</span>
            </div>
            <span className="debt-ob-tag min">MANDATORY BASELINE</span>
          </div>

          <div className="debt-ob-cell-value-wrap">
            <span className="debt-ob-currency">{sym}</span>
            <span className="debt-ob-amount">
              {summary.totalMinMonthly.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="debt-ob-cadence">/mo</span>
          </div>

          <div className="debt-ob-cell-telemetry">
            <div className="debt-ob-telem-item">
              <span className="debt-ob-telem-dot amber" />
              <span><b>{formatCurrency(summary.annualMinCommitment, 0, currency)}</b> /yr baseline outflow</span>
            </div>
            <div className="debt-ob-telem-item">
              <span className="debt-ob-telem-dot gray" />
              <span>
                <b>
                  {summary.totalBalance > 0
                    ? ((summary.totalMinMonthly / summary.totalBalance) * 100).toFixed(1)
                    : 0}%
                </b> of balance/mo
              </span>
            </div>
          </div>
        </div>

        {/* CELL 3: MINIMUM REPAYMENT SPLIT RATIO */}
        <div className="debt-ob-cell debt-ob-cell--split">
          <div className="debt-ob-cell-top">
            <div className="debt-ob-cell-label-wrap">
              <TrendingDown size={14} className="debt-ob-cell-icon split" />
              <span className="debt-ob-cell-label">MINIMUM PAYMENT SPLIT RATIO</span>
            </div>
            <span className="debt-ob-tag split">
              {summary.interestRatio}% INTEREST SINK
            </span>
          </div>

          {/* Bi-color segmented progress bar */}
          <div className="debt-ob-split-track-wrap">
            <div className="debt-ob-split-track">
              <div
                className="debt-ob-split-fill debt-ob-split-fill--principal"
                style={{ width: `${Math.max(4, summary.principalRatio)}%` }}
                title={`Principal Reduction: ${summary.principalRatio}%`}
              />
              <div
                className="debt-ob-split-fill debt-ob-split-fill--interest"
                style={{ width: `${Math.max(4, summary.interestRatio)}%` }}
                title={`Interest Waste: ${summary.interestRatio}%`}
              />
            </div>
          </div>

          {/* Split breakdown tags */}
          <div className="debt-ob-split-legend">
            <div className="debt-ob-split-legend-item green">
              <span className="debt-ob-split-dot green" />
              <span>PRINCIPAL: <b>{formatCurrency(summary.netPrincipalFromMinimums, 2, currency)}</b> ({summary.principalRatio}%)</span>
            </div>
            <div className="debt-ob-split-legend-item pink">
              <span className="debt-ob-split-dot pink" />
              <span>INTEREST: <b>{formatCurrency(Math.min(summary.totalMonthlyInterest, summary.totalMinMonthly), 2, currency)}</b> ({summary.interestRatio}%)</span>
            </div>
          </div>
        </div>

        {/* CELL 4: HIGHEST INTEREST OFFENDER */}
        {summary.topInterestBleeder && (
          <div className="debt-ob-cell debt-ob-cell--top">
            <div className="debt-ob-cell-top">
              <div className="debt-ob-cell-label-wrap">
                <AlertTriangle size={14} className="debt-ob-cell-icon top-offender" />
                <span className="debt-ob-cell-label">#1 INTEREST SINKHOLE</span>
              </div>
              <span className="debt-ob-tag offender">
                {summary.topInterestBleeder.shareOfTotalInterest}% OF BLEED
              </span>
            </div>

            <div className="debt-ob-top-offender-body">
              <div className="debt-ob-offender-name-row">
                <span className="debt-ob-offender-name" title={summary.topInterestBleeder.name}>
                  {summary.topInterestBleeder.name}
                </span>
                <span className="debt-ob-offender-apr">
                  {summary.topInterestBleeder.interestRate}% APR
                </span>
              </div>

              <div className="debt-ob-offender-stat-row">
                <span className="debt-ob-offender-cost">
                  {formatCurrency(summary.topInterestBleeder.monthlyInterest, 2, currency)}
                  <small>/mo interest</small>
                </span>
                <span className="debt-ob-offender-balance">
                  Bal: {formatCurrency(summary.topInterestBleeder.balance, 0, currency)}
                </span>
              </div>
            </div>

            <div className="debt-ob-cell-telemetry">
              <div className="debt-ob-telem-item">
                <span className="debt-ob-telem-dot cyan" />
                <span>
                  Target first to reclaim <b>{summary.topInterestBleeder.shareOfTotalInterest}%</b> of wasted interest
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. EXPANDABLE ACCOUNT-BY-ACCOUNT INTEREST AUDIT DRAWER ── */}
      {isAuditOpen && (
        <div className="debt-ob-audit-drawer">
          <div className="debt-ob-drawer-head">
            <div className="debt-ob-drawer-title-wrap">
              <Building2 size={14} />
              <span>INDIVIDUAL ACCOUNT INTEREST &amp; MINIMUM AUDIT</span>
            </div>
            <span className="debt-ob-drawer-meta">
              {summary.accounts.length} LIABILITIES ITEMIZED · SORTED BY INTEREST DRAIN
            </span>
          </div>

          <div className="debt-ob-drawer-grid">
            {summary.accounts
              .sort((a, b) => b.monthlyInterest - a.monthlyInterest)
              .map((acc, idx) => {
                const isWorst = idx === 0;
                const shareOfTotal =
                  summary.totalMonthlyInterest > 0
                    ? Math.round((acc.monthlyInterest / summary.totalMonthlyInterest) * 100)
                    : 0;

                return (
                  <div
                    key={acc.id}
                    className={`debt-ob-account-card ${isWorst ? "is-worst" : ""}`}
                  >
                    <div className="debt-ob-acc-header">
                      <div className="debt-ob-acc-title-group">
                        <span className="debt-ob-acc-rank">#{idx + 1}</span>
                        <span className="debt-ob-acc-name">{acc.name}</span>
                      </div>
                      <span
                        className={`debt-ob-acc-apr-badge ${
                          acc.interestRate >= 18 ? "high" : "normal"
                        }`}
                      >
                        {acc.interestRate}% APR
                      </span>
                    </div>

                    <div className="debt-ob-acc-metrics">
                      <div className="debt-ob-acc-metric">
                        <span className="debt-ob-acc-metric-label">MONTHLY INTEREST</span>
                        <span className="debt-ob-acc-metric-val red">
                          {formatCurrency(acc.monthlyInterest, 2, currency)}
                        </span>
                      </div>

                      <div className="debt-ob-acc-metric">
                        <span className="debt-ob-acc-metric-label">MIN PAYMENT</span>
                        <span className="debt-ob-acc-metric-val amber">
                          {formatCurrency(acc.minPayment, 2, currency)}
                        </span>
                      </div>

                      <div className="debt-ob-acc-metric">
                        <span className="debt-ob-acc-metric-label">PRINCIPAL NET</span>
                        <span className="debt-ob-acc-metric-val green">
                          {formatCurrency(acc.principalPortion, 2, currency)}
                        </span>
                      </div>

                      <div className="debt-ob-acc-metric">
                        <span className="debt-ob-acc-metric-label">BALANCE</span>
                        <span className="debt-ob-acc-metric-val">
                          {formatCurrency(acc.balance, 2, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Progress track showing interest ratio of minimum payment */}
                    <div className="debt-ob-acc-bar-wrap">
                      <div className="debt-ob-acc-bar">
                        <div
                          className="debt-ob-acc-fill"
                          style={{
                            width: `${Math.max(4, acc.interestRatio)}%`,
                            backgroundColor: acc.interestRatio >= 60 ? "#FF2E93" : "#FF9E2C",
                          }}
                        />
                      </div>
                      <div className="debt-ob-acc-bar-meta">
                        <span>{acc.interestRatio}% of minimum is pure interest</span>
                        <span>{shareOfTotal}% of total bleed</span>
                      </div>
                    </div>

                    <div className="debt-ob-acc-footer">
                      <span>LENDER: <b>{acc.lender || "UNSPECIFIED"}</b></span>
                      <span>DUE: <b>{acc.dueDay ? `DAY ${acc.dueDay}` : "N/A"}</b></span>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="debt-ob-drawer-footer">
            <div className="debt-ob-drawer-hint">
              💡 <b>PRO-TIP:</b> Eliminating just the #1 bleeder first ({summary.topInterestBleeder?.name}) will immediately stop <b>{summary.topInterestBleeder?.shareOfTotalInterest}%</b> of your monthly interest drain. Test payoff strategies in the simulator below.
            </div>
            {onScrollToSimulator && (
              <button
                type="button"
                onClick={() => {
                  playSound.click();
                  onScrollToSimulator();
                }}
                className="debt-ob-sim-jump-btn"
              >
                <span>OPEN WHAT-IF SIMULATOR</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
