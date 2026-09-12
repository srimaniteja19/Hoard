"use client";

import React, { useState, useMemo } from "react";
import { FinancialDailyExpenseRow, DailyExpenseMetrics } from "@/lib/ledger/types";
import {
  calculateExpenseAnalytics,
  getCategoryBreakdown,
  EXPENSE_CATEGORIES,
  formatLocalDate,
} from "@/lib/ledger/dailyExpenses";
import { playSound } from "@/lib/sound";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  Flame,
  Award,
  Clock,
  ArrowUpRight,
  Receipt,
  ShoppingCart,
  Coffee,
  Utensils,
  Package,
  Car,
  Film,
  HeartPulse,
  Zap,
  Wine,
  Home as HomeIcon,
  LucideIcon,
  Sparkles,
} from "lucide-react";

interface ExpenseAnalyticsViewProps {
  expenses: FinancialDailyExpenseRow[];
  dailyMetrics?: DailyExpenseMetrics;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  groceries: ShoppingCart,
  cafe: Coffee,
  dining: Utensils,
  shopping: Package,
  transit: Car,
  entertainment: Film,
  health: HeartPulse,
  utilities: Zap,
  drinks: Wine,
  home: HomeIcon,
  misc: Receipt,
};

type DeepDiveHorizon = "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR" | "ALL_TIME";

export const ExpenseAnalyticsView: React.FC<ExpenseAnalyticsViewProps> = ({
  expenses,
  dailyMetrics,
}) => {
  const [horizon, setHorizon] = useState<DeepDiveHorizon>("THIS_MONTH");

  const todayStr = useMemo(() => formatLocalDate(), []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const currentYearPrefix = useMemo(() => todayStr.slice(0, 4), [todayStr]);

  // Compute week range (Mon-Sun)
  const [weekStartStr, weekEndStr] = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day + 6) % 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return [formatLocalDate(mon), formatLocalDate(sun)];
  }, []);

  // Compute full analytics payload
  const analytics = useMemo(() => {
    return calculateExpenseAnalytics(expenses, todayStr);
  }, [expenses, todayStr]);

  // Expenses scoped to selected deep-dive horizon
  const horizonExpenses = useMemo(() => {
    if (horizon === "THIS_WEEK") {
      return expenses.filter((e) => e.date >= weekStartStr && e.date <= weekEndStr);
    }
    if (horizon === "THIS_MONTH") {
      return expenses.filter((e) => e.date.startsWith(currentMonthPrefix));
    }
    if (horizon === "THIS_YEAR") {
      return expenses.filter((e) => e.date.startsWith(currentYearPrefix));
    }
    return expenses;
  }, [expenses, horizon, weekStartStr, weekEndStr, currentMonthPrefix, currentYearPrefix]);

  // Horizon-specific category breakdown
  const horizonCategories = useMemo(() => {
    return getCategoryBreakdown(horizonExpenses);
  }, [horizonExpenses]);

  // Horizon-specific total spent
  const horizonTotal = useMemo(() => {
    return Math.round(horizonExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) * 100) / 100;
  }, [horizonExpenses]);

  // Max day-of-week spend for bar height calculation
  const maxDowSpend = useMemo(() => {
    const max = Math.max(...analytics.dayOfWeek.map((d) => d.totalSpent));
    return Math.max(max, 10);
  }, [analytics.dayOfWeek]);

  // Peak day of the week
  const peakDay = useMemo(() => {
    return analytics.dayOfWeek.find((d) => d.isPeak);
  }, [analytics.dayOfWeek]);

  // Top outflows in selected horizon
  const topHorizonExpenses = useMemo(() => {
    return [...horizonExpenses]
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 6);
  }, [horizonExpenses]);

  return (
    <div className="dues-analytics-wrap">
      {/* ── 1. HEADER COMMAND STRIP ── */}
      <div className="dues-analytics-header">
        <div className="dues-analytics-header-left">
          <div className="dues-hero-kicker-tag">
            <span className="dues-hero-dot" /> SPEND INTELLIGENCE // COMMAND DECK
          </div>
          <h2 className="dues-analytics-headline">EXPENDITURE METRICS & HORIZONS</h2>
        </div>

        <div className="dues-analytics-header-right">
          <div className="dues-analytics-live-tag">
            <span className="deck-status-pulse" />
            <span>DATA CURRENT AS OF {todayStr}</span>
          </div>
        </div>
      </div>

      {/* ── 2. THE 4 PRIMARY HORIZON COMMAND CARDS ── */}
      <div className="dues-cards-grid">
        {/* CARD 1: TODAY */}
        <div className="dues-stat-card dues-stat-card--today">
          <div className="dues-stat-card-top">
            <span className="dues-stat-tag dues-stat-tag--today">TODAY</span>
            <span
              className={`dues-stat-badge ${
                dailyMetrics?.isOverBudgetToday ? "danger" : "safe"
              }`}
            >
              {dailyMetrics?.isOverBudgetToday
                ? "OVER ALLOWANCE"
                : `${analytics.today.count} ${analytics.today.count === 1 ? "ENTRY" : "ENTRIES"}`}
            </span>
          </div>

          <div className="dues-stat-main-num">
            <span className="dues-stat-curr">$</span>
            <span>{analytics.today.total.toFixed(0)}</span>
          </div>

          <div className="dues-stat-sub-label">SPENT TODAY</div>

          <div className="dues-stat-footer-bar">
            {dailyMetrics ? (
              <span>
                ALLOWANCE: <b>${dailyMetrics.baseDailyAllowance.toFixed(0)}</b> (
                {dailyMetrics.baseDailyAllowance > 0
                  ? `${Math.min(
                      100,
                      Math.round(
                        (analytics.today.total / dailyMetrics.baseDailyAllowance) * 100
                      )
                    )}% used`
                  : "0%"}{" "}
                )
              </span>
            ) : (
              <span>LARGEST TX: ${analytics.today.largestExpense.toFixed(0)}</span>
            )}
          </div>
        </div>

        {/* CARD 2: THIS WEEK */}
        <div className="dues-stat-card dues-stat-card--week">
          <div className="dues-stat-card-top">
            <span className="dues-stat-tag dues-stat-tag--week">THIS WEEK</span>
            {analytics.thisWeek.percentageChange !== undefined ? (
              <span
                className={`dues-stat-badge ${
                  analytics.thisWeek.percentageChange > 0 ? "warning" : "positive"
                }`}
              >
                {analytics.thisWeek.percentageChange > 0 ? (
                  <TrendingUp size={11} strokeWidth={2.6} />
                ) : (
                  <TrendingDown size={11} strokeWidth={2.6} />
                )}
                {Math.abs(analytics.thisWeek.percentageChange)}% vs last wk
              </span>
            ) : (
              <span className="dues-stat-badge neutral">
                {analytics.thisWeek.count} entries
              </span>
            )}
          </div>

          <div className="dues-stat-main-num">
            <span className="dues-stat-curr">$</span>
            <span>{analytics.thisWeek.total.toFixed(0)}</span>
          </div>

          <div className="dues-stat-sub-label">CURRENT WEEK BURN</div>

          <div className="dues-stat-footer-bar">
            <span>
              AVG: <b>${analytics.thisWeek.dailyAverage.toFixed(0)}/day</b> · PRIOR: $
              {(analytics.thisWeek.priorPeriodTotal || 0).toFixed(0)}
            </span>
          </div>
        </div>

        {/* CARD 3: THIS MONTH */}
        <div className="dues-stat-card dues-stat-card--month">
          <div className="dues-stat-card-top">
            <span className="dues-stat-tag dues-stat-tag--month">THIS MONTH</span>
            <span className="dues-stat-badge month">
              PROJECTED ~${analytics.thisMonth.projectedMonthEnd.toFixed(0)}
            </span>
          </div>

          <div className="dues-stat-main-num">
            <span className="dues-stat-curr">$</span>
            <span>{analytics.thisMonth.total.toFixed(0)}</span>
          </div>

          <div className="dues-stat-sub-label">MONTH-TO-DATE SPEND</div>

          <div className="dues-stat-footer-bar">
            <span>
              AVG: <b>${analytics.thisMonth.dailyAverage.toFixed(0)}/day</b> · {analytics.thisMonth.count} entries
            </span>
          </div>
        </div>

        {/* CARD 4: THIS YEAR */}
        <div className="dues-stat-card dues-stat-card--year">
          <div className="dues-stat-card-top">
            <span className="dues-stat-tag dues-stat-tag--year">THIS YEAR</span>
            <span className="dues-stat-badge year">
              ~${analytics.thisYear.projectedYearEnd.toFixed(0)} ANNUAL
            </span>
          </div>

          <div className="dues-stat-main-num">
            <span className="dues-stat-curr">$</span>
            <span>{analytics.thisYear.total.toFixed(0)}</span>
          </div>

          <div className="dues-stat-sub-label">CALENDAR YEAR {todayStr.slice(0, 4)}</div>

          <div className="dues-stat-footer-bar">
            <span>
              AVG: <b>${analytics.thisYear.monthlyAverage.toFixed(0)}/mo</b> · {analytics.thisYear.activeDays} active days
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. ALL-TIME TELEMETRY STRIP ── */}
      <div className="dues-alltime-strip">
        <div className="dues-alltime-item">
          <span className="dues-alltime-label">ALL-TIME LOGGED SPEND:</span>
          <span className="dues-alltime-value">${analytics.allTime.total.toLocaleString()}</span>
        </div>
        <div className="dues-alltime-divider" />
        <div className="dues-alltime-item">
          <span className="dues-alltime-label">TOTAL TRANSACTIONS:</span>
          <span className="dues-alltime-value">{analytics.allTime.count} RECORDS</span>
        </div>
        <div className="dues-alltime-divider" />
        <div className="dues-alltime-item">
          <span className="dues-alltime-label">ACTIVE SPENDING DAYS:</span>
          <span className="dues-alltime-value">{analytics.allTime.activeDays} DAYS</span>
        </div>
        <div className="dues-alltime-divider" />
        <div className="dues-alltime-item">
          <span className="dues-alltime-label">ALL-TIME DAILY AVG:</span>
          <span className="dues-alltime-value">${analytics.allTime.dailyAverage.toFixed(0)}/day</span>
        </div>
        {analytics.allTime.earliestDate && (
          <>
            <div className="dues-alltime-divider" />
            <div className="dues-alltime-item">
              <span className="dues-alltime-label">SPAN:</span>
              <span className="dues-alltime-value">
                {analytics.allTime.earliestDate} → {analytics.allTime.latestDate}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── 4. DEEP DIVE HORIZON CONTROLS ── */}
      <div className="dues-deepdive-nav">
        <div className="dues-deepdive-title-group">
          <BarChart3 size={15} />
          <span className="dues-deepdive-title">ANALYTICS HORIZON SCOPE:</span>
        </div>

        <div className="dues-deepdive-buttons">
          {(
            [
              { key: "THIS_WEEK", label: "THIS WEEK" },
              { key: "THIS_MONTH", label: "THIS MONTH" },
              { key: "THIS_YEAR", label: "THIS YEAR" },
              { key: "ALL_TIME", label: "ALL TIME" },
            ] as const
          ).map((h) => {
            const isActive = horizon === h.key;
            return (
              <button
                key={h.key}
                type="button"
                onClick={() => {
                  playSound.pop();
                  setHorizon(h.key);
                }}
                className={`dues-deepdive-btn ${isActive ? "active" : ""}`}
              >
                {h.label}
              </button>
            );
          })}
        </div>

        <div className="dues-deepdive-total-pill">
          PERIOD TOTAL: <b>${horizonTotal.toLocaleString()}</b> ({horizonExpenses.length} entries)
        </div>
      </div>

      {/* ── 5. CATEGORY BREAKDOWN WAR ROOM ── */}
      <div className="dues-analytics-section">
        <div className="dues-analytics-sec-head">
          <div className="dues-sec-title">
            <PieChart size={16} />
            <span>CATEGORY ALLOCATION // {horizon.replace("_", " ")}</span>
          </div>
          <span className="dues-sec-meta">
            {horizonCategories.length} {horizonCategories.length === 1 ? "CATEGORY" : "CATEGORIES"} DETECTED
          </span>
        </div>

        {/* Proportional Segmented Progress Track with Framed Legend */}
        {horizonTotal > 0 && horizonCategories.length > 0 && (
          <div className="dues-cat-multi-track-wrapper">
            <div className="dues-cat-multi-track" title="Proportional spending by category">
              {horizonCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="dues-cat-multi-segment"
                  style={{
                    width: `${Math.max(2, cat.percentage)}%`,
                    backgroundColor: cat.bg,
                  }}
                  title={`${cat.name}: $${cat.totalSpent.toFixed(0)} (${cat.percentage}%)`}
                />
              ))}
            </div>

            {/* Visual Legend Row */}
            <div className="dues-cat-legend-row">
              {horizonCategories.map((cat) => (
                <div key={cat.category} className="dues-cat-legend-item">
                  <span
                    className="dues-cat-legend-dot"
                    style={{ backgroundColor: cat.bg }}
                  />
                  <span className="dues-cat-legend-name">{cat.name}:</span>
                  <span className="dues-cat-legend-val">
                    ${cat.totalSpent.toFixed(2)} ({cat.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Cards Grid */}
        {horizonCategories.length === 0 ? (
          <div className="dues-analytics-empty-box">
            <Receipt size={24} />
            <span>No expenses logged in this selected horizon.</span>
          </div>
        ) : (
          <div className="dues-cat-cards-grid">
            {horizonCategories.map((cat, idx) => {
              const IconComp = CATEGORY_ICONS[cat.category] || Receipt;
              const isTop = idx === 0;
              return (
                <div
                  key={cat.category}
                  className={`dues-cat-stat-card ${isTop ? "dues-cat-stat-card--top" : ""}`}
                >
                  <div className="dues-cat-card-top">
                    <div
                      className="dues-today-icon-badge"
                      style={{ backgroundColor: cat.bg }}
                    >
                      <IconComp size={16} strokeWidth={2.4} />
                    </div>

                    <div className="dues-cat-card-title-wrap">
                      <span className="dues-cat-card-name">{cat.name}</span>
                      <span className="dues-cat-card-pct">{cat.percentage}% of total</span>
                    </div>

                    {isTop && (
                      <span className="dues-top-cat-pill">
                        <Flame size={10} strokeWidth={3} /> #1 SPEND
                      </span>
                    )}
                  </div>

                  <div className="dues-cat-card-amount">
                    ${cat.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  {/* Micro Progress Track */}
                  <div className="dues-cat-micro-track">
                    <div
                      className="dues-cat-micro-fill"
                      style={{
                        width: `${Math.max(3, cat.percentage)}%`,
                        backgroundColor: cat.bg,
                      }}
                    />
                  </div>

                  <div className="dues-cat-card-footer">
                    <span className="dues-cat-card-footer-item">
                      {cat.count} {cat.count === 1 ? "entry" : "entries"}
                    </span>
                    <span className="dues-cat-card-footer-item">
                      avg ${cat.average.toFixed(2)}/entry
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 6. DAY-OF-WEEK SPENDING RADAR ── */}
      <div className="dues-analytics-section">
        <div className="dues-analytics-sec-head">
          <div className="dues-sec-title">
            <Clock size={16} />
            <span>DAY-OF-WEEK SPENDING RADAR // PATTERNS & HABITS</span>
          </div>
          {peakDay && (
            <span className="dues-peak-day-badge">
              🔥 {peakDay.dayName.toUpperCase()} IS YOUR HIGHEST BURN DAY (${peakDay.totalSpent.toFixed(0)} TOTAL)
            </span>
          )}
        </div>

        <div className="dues-dow-chart-card">
          <div className="dues-dow-bars-container">
            {analytics.dayOfWeek.map((d) => {
              const heightPct = Math.min(100, Math.max(8, (d.totalSpent / maxDowSpend) * 100));
              return (
                <div key={d.dayIndex} className={`dues-dow-col ${d.isPeak ? "peak" : ""}`}>
                  <div className="dues-dow-amount-label">
                    ${d.totalSpent > 0 ? d.totalSpent.toFixed(0) : "0"}
                  </div>

                  <div className="dues-dow-bar-track">
                    <div
                      className={`dues-dow-bar-fill ${d.isPeak ? "peak" : ""}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  <div className="dues-dow-day-label">
                    <span>{d.dayName}</span>
                    {d.isPeak && <span className="dues-dow-peak-dot" />}
                  </div>

                  <div className="dues-dow-meta-label">
                    {d.count > 0 ? `${d.count} tx` : "0"}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dues-dow-footer-note">
            <span>
              ⚡ Analyze where your money leaks during the week. Weekend spikes and mid-week burns are reflected in real-time.
            </span>
          </div>
        </div>
      </div>

      {/* ── 7. TOP OUTFLOWS LEADERBOARD ── */}
      {topHorizonExpenses.length > 0 && (
        <div className="dues-analytics-section">
          <div className="dues-analytics-sec-head">
            <div className="dues-sec-title">
              <Award size={16} />
              <span>LARGEST TRANSACTIONS // {horizon.replace("_", " ")}</span>
            </div>
            <span className="dues-sec-meta">TOP OUTFLOWS</span>
          </div>

          <div className="dues-top-expenses-grid">
            {topHorizonExpenses.map((exp, rank) => {
              const cat = EXPENSE_CATEGORIES.find((c) => c.key === exp.category) || {
                name: "EXPENSE",
                bg: "#E2E8F0",
              };
              const IconComp = CATEGORY_ICONS[exp.category] || Receipt;
              return (
                <div key={exp.id} className="dues-top-exp-card">
                  <div className="dues-top-rank-badge">#{rank + 1}</div>

                  <div
                    className="dues-today-icon-badge"
                    style={{ backgroundColor: cat.bg }}
                  >
                    <IconComp size={15} strokeWidth={2.4} />
                  </div>

                  <div className="dues-top-exp-info">
                    <span className="dues-top-exp-note">{exp.note}</span>
                    <span className="dues-top-exp-date">
                      {exp.date} {exp.time ? `· ${exp.time}` : ""} · {cat.name}
                    </span>
                  </div>

                  <div className="dues-top-exp-amount">
                    ${Number(exp.amount).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
