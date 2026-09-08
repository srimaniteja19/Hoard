"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FinancialOverviewPayload,
  FinancialDailyExpenseRow,
  DailyExpenseMetrics,
} from "@/lib/ledger/types";
import {
  calculateDailyMetrics,
  formatLocalDate,
  formatLocalTime,
  detectExpenseCategory,
  ExpenseCategoryConfig,
  EXPENSE_CATEGORIES,
  DEFAULT_CATEGORY,
} from "@/lib/ledger/dailyExpenses";
import { playSound } from "@/lib/sound";
import {
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
  Receipt,
  X,
  LucideIcon,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

interface DailyExpenseTrackerProps {
  overview: FinancialOverviewPayload;
  onRefresh?: (silent?: boolean) => void;
  onExpenseCreated?: (expense: FinancialDailyExpenseRow) => void;
  onExpenseDeleted?: (id: string) => void;
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

const QUICK_TAGS: Array<{ key: string; label: string; icon: LucideIcon; bg: string }> = [
  { key: "cafe", label: "Coffee", icon: Coffee, bg: "#FCE94F" },
  { key: "dining", label: "Dining", icon: Utensils, bg: "#FF9E2C" },
  { key: "groceries", label: "Grocery", icon: ShoppingCart, bg: "#B8F04A" },
  { key: "shopping", label: "Shopping", icon: Package, bg: "#7FE9F7" },
  { key: "transit", label: "Transit", icon: Car, bg: "#FDE047" },
  { key: "entertainment", label: "Fun", icon: Film, bg: "#D8B4FE" },
  { key: "utilities", label: "Bills", icon: Zap, bg: "#BAE6FD" },
  { key: "health", label: "Health", icon: HeartPulse, bg: "#5EEAD4" },
];

const INCREMENTS = [5, 10, 20, 40, 60, 100];

export const DailyExpenseTracker: React.FC<DailyExpenseTrackerProps> = ({
  overview,
  onRefresh,
  onExpenseCreated,
  onExpenseDeleted,
}) => {
  const [localExpenses, setLocalExpenses] = useState<FinancialDailyExpenseRow[]>(
    overview.dailyExpenses || []
  );

  // Synchronize local expenses if overview updates from outside
  useEffect(() => {
    if (overview.dailyExpenses) {
      setLocalExpenses(overview.dailyExpenses);
    }
  }, [overview.dailyExpenses]);

  // Compute live metrics dynamically
  const metrics: DailyExpenseMetrics = useMemo(() => {
    return calculateDailyMetrics({
      incomes: overview.incomes,
      subscriptions: overview.subscriptions,
      debts: overview.debts,
      investments: overview.investments,
      assets: overview.assets,
      dailyExpenses: localExpenses,
      customFxInrRate: overview.fxSnapshot?.inrPerUsd,
    });
  }, [overview, localExpenses]);

  // Speed Logger Form state
  const [amountInput, setAmountInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle quick increments
  const handleAddIncrement = (inc: number) => {
    playSound.pop();
    const current = parseFloat(amountInput) || 0;
    const next = Math.max(0, current + inc);
    setAmountInput(next.toString());
  };

  // Handle selecting quick tags
  const handleSelectTag = (tag: typeof QUICK_TAGS[0]) => {
    playSound.pop();
    if (selectedCategory === tag.key) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(tag.key);
      if (!noteInput.trim()) {
        setNoteInput(tag.label);
      }
    }
  };

  // Handle logging an expense
  const handleLogExpense = async () => {
    const amt = parseFloat(amountInput);
    const note = noteInput.trim() || "Expense";

    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid expense amount greater than 0.");
      return;
    }

    playSound.fileIt();
    setIsSubmitting(true);

    const tempId = `temp-${Date.now()}`;
    const todayStr = formatLocalDate();
    const nowTimeStr = formatLocalTime();

    const detected = detectExpenseCategory(note, selectedCategory);
    const finalCategory = selectedCategory || detected.key;

    const tempItem: FinancialDailyExpenseRow = {
      id: tempId,
      userId: "local",
      amount: amt,
      currency: "USD",
      note,
      category: finalCategory,
      date: todayStr,
      time: nowTimeStr,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Optimistic insert
    setLocalExpenses((prev) => [tempItem, ...prev]);
    setAmountInput("");
    setNoteInput("");
    setSelectedCategory(null);

    try {
      const res = await fetch("/api/financial/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          note,
          category: finalCategory,
          date: todayStr,
          time: nowTimeStr,
          currency: "USD",
        }),
      });

      if (res.ok) {
        const saved: FinancialDailyExpenseRow = await res.json();
        setLocalExpenses((prev) =>
          prev.map((item) => (item.id === tempId ? saved : item))
        );
        onExpenseCreated?.(saved);
        onRefresh?.(true);
      } else {
        // Rollback
        setLocalExpenses((prev) => prev.filter((item) => item.id !== tempId));
        alert("Failed to save expense. Please try again.");
      }
    } catch {
      setLocalExpenses((prev) => prev.filter((item) => item.id !== tempId));
      alert("Network error while recording expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting an expense
  const handleDeleteExpense = async (id: string) => {
    playSound.bury();
    const previous = [...localExpenses];
    setLocalExpenses((prev) => prev.filter((e) => e.id !== id));

    try {
      const res = await fetch(`/api/financial/expenses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onExpenseDeleted?.(id);
        onRefresh?.(true);
      } else {
        setLocalExpenses(previous);
        alert("Could not delete expense. Rolled back.");
      }
    } catch {
      setLocalExpenses(previous);
      alert("Network error deleting expense.");
    }
  };

  // Chart max calculation & threshold position
  const maxBarVal = useMemo(() => {
    let max = metrics.baseDailyAllowance * 1.5;
    for (const d of metrics.monthDailyBreakdown) {
      if (d.spent > max) max = d.spent;
    }
    return Math.max(max, 40);
  }, [metrics]);

  const threshHeightPct = useMemo(() => {
    return Math.min(95, Math.max(10, (metrics.baseDailyAllowance / maxBarVal) * 100));
  }, [metrics.baseDailyAllowance, maxBarVal]);

  // Max benchmark value for past comparison progress bars
  const maxBenchVal = useMemo(() => {
    return (
      Math.max(
        metrics.benchmarks.last7DaysDailyAvg,
        metrics.benchmarks.prior7DaysDailyAvg,
        metrics.benchmarks.monthToDateDailyAvg,
        metrics.baseDailyAllowance,
        1
      ) * 1.15
    );
  }, [metrics]);

  const leftInPool = Math.max(
    0,
    metrics.discretionaryPool - metrics.totalSpentThisMonth
  );

  const tomorrowGain = useMemo(() => {
    return Math.round(metrics.tomorrowIfZeroSpend - metrics.baseDailyAllowance);
  }, [metrics.tomorrowIfZeroSpend, metrics.baseDailyAllowance]);

  const pctSpentToday = useMemo(() => {
    if (metrics.baseDailyAllowance <= 0) return 0;
    return Math.min(100, Math.round((metrics.spentToday / metrics.baseDailyAllowance) * 100));
  }, [metrics.spentToday, metrics.baseDailyAllowance]);

  return (
    <div className="dues-wrap">
      {/* ── 1. HERO BOX ── */}
      <div className="dues-hero-box">
        <div className="dues-hero-topline">
          <div className="dues-hero-kicker-tag">
            <span className="dues-hero-dot" /> SAFE TO SPEND TODAY
          </div>
          <span className="dues-hero-day-stat">
            DAY {metrics.currentDay} OF {metrics.daysInMonth} · {metrics.daysRemaining} DAYS REMAINING
          </span>
        </div>

        <div className="dues-hero-body">
          <div className="dues-hero-main">
            <div className="dues-hero-amount">
              <span className="dues-hero-curr">$</span>
              <span className="dues-hero-num">
                {Math.abs(metrics.safeToSpendToday).toFixed(0)}
              </span>
            </div>

            <div className="dues-hero-sub">
              <div className="dues-hero-sub-line1">
                ${metrics.spentToday.toFixed(0)} SPENT OF ${metrics.baseDailyAllowance.toFixed(0)} TODAY
              </div>
              <div className="dues-hero-sub-line2">
                {metrics.isOverBudgetToday
                  ? "OVER BUDGET TODAY · EXCESS CUTS DIRECTLY INTO TOMORROW"
                  : "WHAT YOU DON'T SPEND TODAY EXPANDS TOMORROW'S ALLOWANCE"}
              </div>
            </div>
          </div>

          {/* Right Side: Hero Visual Budget Meter */}
          <div className="dues-hero-meter-wrap">
            <div className="dues-hero-meter-card">
              <div className="dues-hero-meter-head">
                <span className="dues-hero-meter-lbl">TODAY&apos;S PACING</span>
                <span className={`dues-hero-meter-badge ${metrics.isOverBudgetToday ? "over" : "safe"}`}>
                  {metrics.isOverBudgetToday ? "OVER BUDGET" : `${100 - pctSpentToday}% SAFE`}
                </span>
              </div>

              <div className="dues-hero-progress-track">
                <div
                  className={`dues-hero-progress-fill ${metrics.isOverBudgetToday ? "over" : "safe"}`}
                  style={{ width: `${pctSpentToday}%` }}
                />
              </div>

              <div className="dues-hero-meter-stats">
                <div className="dues-meter-stat">
                  <span className="dues-meter-stat-val">${metrics.spentToday.toFixed(0)}</span>
                  <span className="dues-meter-stat-lbl">SPENT</span>
                </div>
                <div className="dues-meter-stat-div" />
                <div className="dues-meter-stat">
                  <span className="dues-meter-stat-val">${metrics.baseDailyAllowance.toFixed(0)}</span>
                  <span className="dues-meter-stat-lbl">ALLOWANCE</span>
                </div>
                <div className="dues-meter-stat-div" />
                <div className="dues-meter-stat">
                  <span className="dues-meter-stat-val">{metrics.daysRemaining}d</span>
                  <span className="dues-meter-stat-lbl">CYCLE LEFT</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Arithmetic Ribbon */}
        <div className="dues-hero-arithmetic">
          <div className="dues-arith-col">
            <div className="dues-arith-val">${Math.round(metrics.availablePool).toLocaleString()}</div>
            <div className="dues-arith-lbl">AVAILABLE THIS MONTH</div>
          </div>

          <div className="dues-arith-op">−</div>

          <div className="dues-arith-col">
            <div className="dues-arith-val">${Math.round(metrics.committedTotal).toLocaleString()}</div>
            <div className="dues-arith-lbl">COMMITTED BILLS</div>
          </div>

          <div className="dues-arith-op">−</div>

          <div className="dues-arith-col">
            <div className="dues-arith-val">${Math.round(metrics.spentEarlierInMonth).toLocaleString()}</div>
            <div className="dues-arith-lbl">SPENT EARLIER</div>
          </div>

          <div className="dues-arith-op">÷</div>

          <div className="dues-arith-col">
            <div className="dues-arith-val">{metrics.daysRemaining}</div>
            <div className="dues-arith-lbl">DAYS REMAINING</div>
          </div>

          <div className="dues-arith-op">=</div>

          <div className="dues-arith-col highlight">
            <div className="dues-arith-val">${metrics.baseDailyAllowance.toFixed(0)}</div>
            <div className="dues-arith-lbl">TODAY&apos;S ALLOWANCE</div>
          </div>
        </div>
      </div>

      {/* ── 2. CONSEQUENCES 2-CARD ROW ── */}
      <div className="dues-conseq-box">
        <div className="dues-conseq-col safe">
          <div className="dues-conseq-head">
            <div className="dues-conseq-icon-wrap safe">
              <TrendingUp size={15} strokeWidth={2.5} />
            </div>
            <span className="dues-conseq-kicker">IF YOU SPEND $0 MORE TODAY</span>
            <span className="dues-conseq-pill safe">
              +{tomorrowGain > 0 ? `$${tomorrowGain}` : "$0"}/DAY BOOST
            </span>
          </div>

          <div className="dues-conseq-num safe">
            ${metrics.tomorrowIfZeroSpend.toFixed(0)}
          </div>
          <div className="dues-conseq-lbl">TOMORROW&apos;S DAILY ALLOWANCE</div>
        </div>

        <div className="dues-conseq-col neutral">
          <div className="dues-conseq-head">
            <div className="dues-conseq-icon-wrap neutral">
              <ArrowRight size={15} strokeWidth={2.5} />
            </div>
            <span className="dues-conseq-kicker">IF YOU SPEND ALL OF IT</span>
            <span className="dues-conseq-pill neutral">
              {metrics.isOverBudgetToday ? "BUDGET CUT" : "BASELINE HOLD"}
            </span>
          </div>

          <div className="dues-conseq-num max">
            ${metrics.tomorrowIfFullSpend.toFixed(0)}
          </div>
          <div className="dues-conseq-lbl">TOMORROW&apos;S DAILY ALLOWANCE</div>
        </div>
      </div>

      {/* ── 3. SPEED LOGGER ── */}
      <div className="dues-log-box">
        <div className="dues-log-row">
          <div className="dues-log-amount-wrap">
            <span className="dues-log-curr">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogExpense()}
              placeholder="0"
              className="dues-log-input-num"
            />
          </div>

          <div className="dues-log-divider" />

          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogExpense()}
            placeholder="what for? — optional, one word is fine"
            className="dues-log-input-text"
          />

          <button
            type="button"
            onClick={handleLogExpense}
            disabled={isSubmitting || !amountInput || parseFloat(amountInput) <= 0}
            className="dues-log-btn"
          >
            {isSubmitting ? "LOGGING..." : "LOG IT"}
          </button>
        </div>

        {/* Speed Controls: Organized Increments and Tag chips */}
        <div className="dues-log-controls">
          <div className="dues-log-increments-group">
            <span className="dues-log-group-label">QUICK ADD:</span>
            {INCREMENTS.map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() => handleAddIncrement(inc)}
                className="dues-log-chip"
              >
                +${inc}
              </button>
            ))}
          </div>

          <div className="dues-log-tags-group">
            <span className="dues-log-group-label">TAG:</span>
            {QUICK_TAGS.map((tag) => {
              const isSelected = selectedCategory === tag.key;
              const TagIcon = tag.icon;
              return (
                <button
                  key={tag.key}
                  type="button"
                  onClick={() => handleSelectTag(tag)}
                  className={`dues-log-tag-chip ${isSelected ? "active" : ""}`}
                  style={isSelected ? { backgroundColor: tag.bg } : undefined}
                  title={`Tag as ${tag.label}`}
                >
                  <TagIcon size={12} strokeWidth={2.2} />
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="dues-log-footer">
          ⚡ Safe spend moves real-time · No bank logins or manual categorization required.
        </div>
      </div>

      {/* ── 4. TODAY FEED ── */}
      <div className="dues-today-section">
        <div className="dues-today-header">
          <h3 className="dues-today-title">Today</h3>
          <div className="dues-today-line" />
          <div className="dues-today-meta">
            <span>
              {metrics.todayExpenses.length} {metrics.todayExpenses.length === 1 ? "ENTRY" : "ENTRIES"}
            </span>
            <span className="dues-today-meta-dot">·</span>
            <span className="dues-today-meta-spent">
              ${metrics.spentToday.toFixed(0)} SPENT
            </span>
          </div>
        </div>

        <div className="dues-today-list">
          {metrics.todayExpenses.length === 0 ? (
            <div className="dues-today-empty">
              <Receipt size={16} strokeWidth={2} />
              <span>0 entries logged today. What you don&apos;t spend moves forward.</span>
            </div>
          ) : (
            metrics.todayExpenses.map((exp) => {
              const cat = detectExpenseCategory(exp.note, exp.category);
              const IconComp = CATEGORY_ICONS[cat.key] || Receipt;
              return (
                <div key={exp.id} className="dues-today-row">
                  <div className="dues-today-left">
                    <div
                      className="dues-today-icon-badge"
                      style={{ backgroundColor: cat.bg }}
                      title={cat.name}
                    >
                      <IconComp size={15} strokeWidth={2.2} />
                    </div>

                    <div className="dues-today-info">
                      <span className="dues-today-note">{exp.note}</span>
                      <span className="dues-today-sep">·</span>
                      <span className="dues-today-cat-tag">{cat.name}</span>
                      <span className="dues-today-sep">·</span>
                      <span className="dues-today-time">{exp.time || "TODAY"}</span>
                    </div>
                  </div>

                  <div className="dues-today-right">
                    <span className="dues-today-amt">
                      ${Number(exp.amount).toFixed(0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="dues-today-del"
                      title="Delete entry"
                      aria-label="Delete entry"
                    >
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 5. THE MONTH, DAY BY DAY ── */}
      <div className="dues-month-box">
        <div className="dues-month-head">
          <div className="dues-month-title">THE MONTH, DAY BY DAY</div>
          <div className="dues-month-meta">
            ${metrics.totalSpentThisMonth.toFixed(0)} SPENT · ${leftInPool.toFixed(0)} LEFT
          </div>
        </div>

        <div className="dues-month-body">
          {/* Threshold line with right badge */}
          <div
            className="dues-month-thresh-line"
            style={{ bottom: `${threshHeightPct}%` }}
          >
            <div className="dues-month-thresh-pill">
              ${metrics.baseDailyAllowance.toFixed(0)} / DAY
            </div>
          </div>

          {/* Bar columns */}
          <div className="dues-month-bars">
            {metrics.monthDailyBreakdown.map((d) => {
              const heightPct = Math.min(100, Math.max(3, (d.spent / maxBarVal) * 100));
              return (
                <div
                  key={d.date}
                  className={`dues-mbar-col ${d.isToday ? "today" : ""}`}
                  title={`Day ${d.dayOfMonth}: $${d.spent.toFixed(0)}`}
                >
                  <div
                    className={`dues-mbar-fill ${
                      d.isFuture ? "future" : d.isOverBudget ? "over" : "under"
                    }`}
                    style={{
                      height: d.isFuture ? "90%" : `${heightPct}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Tick numbers */}
          <div className="dues-month-ticks">
            <span>1</span>
            <span>10</span>
            <span>20</span>
            <span>{metrics.daysInMonth}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="dues-month-legend">
          <div className="dues-legend-item">
            <span className="dues-legend-swatch under" />
            <span>UNDER THE DAY&apos;S ALLOWANCE</span>
          </div>
          <div className="dues-legend-item">
            <span className="dues-legend-swatch over" />
            <span>OVER IT</span>
          </div>
          <div className="dues-legend-item">
            <span className="dues-legend-swatch future" />
            <span>STILL TO COME</span>
          </div>
        </div>
      </div>

      {/* ── 6. COMPARED ONLY WITH YOUR OWN PAST ── */}
      <div className="dues-comp-box">
        <div className="dues-comp-header">
          <span className="dues-comp-title">COMPARED ONLY WITH YOUR OWN PAST</span>
          <span className="dues-comp-badge">NO BENCHMARKS</span>
        </div>

        <div className="dues-comp-body">
          <div className="dues-comp-row">
            <div className="dues-comp-label">LAST 7 DAYS</div>
            <div className="dues-comp-track">
              <div
                className="dues-comp-bar"
                style={{
                  width: `${Math.min(
                    100,
                    (metrics.benchmarks.last7DaysDailyAvg / maxBenchVal) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="dues-comp-val">
              ${metrics.benchmarks.last7DaysDailyAvg.toFixed(0)}/day
            </div>
          </div>

          <div className="dues-comp-row">
            <div className="dues-comp-label">THE 7 BEFORE</div>
            <div className="dues-comp-track">
              <div
                className="dues-comp-bar"
                style={{
                  width: `${Math.min(
                    100,
                    (metrics.benchmarks.prior7DaysDailyAvg / maxBenchVal) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="dues-comp-val">
              ${metrics.benchmarks.prior7DaysDailyAvg.toFixed(0)}/day
            </div>
          </div>

          <div className="dues-comp-row">
            <div className="dues-comp-label">THIS MONTH SO FAR</div>
            <div className="dues-comp-track">
              <div
                className="dues-comp-bar"
                style={{
                  width: `${Math.min(
                    100,
                    (metrics.benchmarks.monthToDateDailyAvg / maxBenchVal) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="dues-comp-val">
              ${metrics.benchmarks.monthToDateDailyAvg.toFixed(0)}/day
            </div>
          </div>

          <div className="dues-comp-row">
            <div className="dues-comp-label">TODAY&apos;S ALLOWANCE</div>
            <div className="dues-comp-track">
              <div
                className="dues-comp-bar"
                style={{
                  width: `${Math.min(
                    100,
                    (metrics.baseDailyAllowance / maxBenchVal) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="dues-comp-val">
              ${metrics.baseDailyAllowance.toFixed(0)}/day
            </div>
          </div>
        </div>

        <div className="dues-comp-footer">
          THERE IS NO &quot;AVERAGE PERSON&quot; IN HERE AND NEVER WILL BE. THE ONLY USEFUL COMPARISON IS TO THE VERSION OF YOU THAT SPENT LAST WEEK.
        </div>
      </div>
    </div>
  );
};
