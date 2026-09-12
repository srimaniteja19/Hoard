"use client";

import React, { useState, useMemo } from "react";
import { FinancialDailyExpenseRow } from "@/lib/ledger/types";
import {
  EXPENSE_CATEGORIES,
  detectExpenseCategory,
  formatLocalDate,
} from "@/lib/ledger/dailyExpenses";
import { playSound } from "@/lib/sound";
import { EditExpenseModal } from "./EditExpenseModal";
import { LogExpenseModal } from "./LogExpenseModal";
import {
  Search,
  Calendar,
  Filter,
  Plus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Edit2,
  Trash2,
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
  CalendarDays,
  Sparkles,
} from "lucide-react";

interface ExpenseArchiveViewProps {
  expenses: FinancialDailyExpenseRow[];
  onExpenseCreated: (expense: FinancialDailyExpenseRow) => void;
  onExpenseUpdated: (expense: FinancialDailyExpenseRow) => void;
  onExpenseDeleted: (id: string) => void;
  isAddExpenseOpen?: boolean;
  onCloseAddExpense?: () => void;
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

type PresetFilter = "ALL" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR";
type SortOption = "NEWEST" | "OLDEST" | "HIGHEST" | "LOWEST";

export const ExpenseArchiveView: React.FC<ExpenseArchiveViewProps> = ({
  expenses,
  onExpenseCreated,
  onExpenseUpdated,
  onExpenseDeleted,
  isAddExpenseOpen = false,
  onCloseAddExpense,
}) => {
  const [preset, setPreset] = useState<PresetFilter>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(""); // specific YYYY-MM-DD
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("NEWEST");

  // Modal states
  const [editingExpense, setEditingExpense] = useState<FinancialDailyExpenseRow | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const todayStr = useMemo(() => formatLocalDate(), []);

  // Compute yesterday
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatLocalDate(d);
  }, []);

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

  // Current month & year prefix
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const currentYearPrefix = useMemo(() => todayStr.slice(0, 4), [todayStr]);

  // Handle Preset selection
  const handleSelectPreset = (p: PresetFilter) => {
    playSound.pop();
    setPreset(p);
    setSelectedDate(""); // clear specific date jump
  };

  // Handle Date Jump
  const handleDateJump = (dateVal: string) => {
    playSound.click();
    setSelectedDate(dateVal);
  };

  // Step day navigation
  const handleStepDay = (step: number) => {
    playSound.click();
    const baseDate = selectedDate || todayStr;
    const [y, m, d] = baseDate.split("-").map(Number);
    const newDate = new Date(y, m - 1, d + step);
    setSelectedDate(formatLocalDate(newDate));
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // 1. Specific date jump overrides presets if set
      if (selectedDate) {
        if (exp.date !== selectedDate) return false;
      } else {
        // Presets
        if (preset === "TODAY" && exp.date !== todayStr) return false;
        if (preset === "YESTERDAY" && exp.date !== yesterdayStr) return false;
        if (preset === "THIS_WEEK" && (exp.date < weekStartStr || exp.date > weekEndStr))
          return false;
        if (preset === "THIS_MONTH" && !exp.date.startsWith(currentMonthPrefix)) return false;
        if (preset === "THIS_YEAR" && !exp.date.startsWith(currentYearPrefix)) return false;
      }

      // 2. Category filter
      if (selectedCategory !== "ALL") {
        const detected = detectExpenseCategory(exp.note, exp.category);
        if (detected.key !== selectedCategory) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const noteMatch = exp.note.toLowerCase().includes(q);
        const catMatch = (exp.category || "").toLowerCase().includes(q);
        const amtMatch = String(exp.amount).includes(q);
        if (!noteMatch && !catMatch && !amtMatch) return false;
      }

      return true;
    });
  }, [
    expenses,
    selectedDate,
    preset,
    todayStr,
    yesterdayStr,
    weekStartStr,
    weekEndStr,
    currentMonthPrefix,
    currentYearPrefix,
    selectedCategory,
    searchQuery,
  ]);

  // Sorted expenses
  const sortedExpenses = useMemo(() => {
    const list = [...filteredExpenses];
    if (sortOption === "NEWEST") {
      list.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.time || "").localeCompare(a.time || "");
      });
    } else if (sortOption === "OLDEST") {
      list.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || "").localeCompare(b.time || "");
      });
    } else if (sortOption === "HIGHEST") {
      list.sort((a, b) => Number(b.amount) - Number(a.amount));
    } else if (sortOption === "LOWEST") {
      list.sort((a, b) => Number(a.amount) - Number(b.amount));
    }
    return list;
  }, [filteredExpenses, sortOption]);

  // Group by Date for high-clarity day timeline
  const groupedByDate = useMemo(() => {
    const groups: Array<{
      date: string;
      formattedDate: string;
      isToday: boolean;
      isYesterday: boolean;
      totalSpent: number;
      items: FinancialDailyExpenseRow[];
    }> = [];

    const map = new Map<string, FinancialDailyExpenseRow[]>();
    for (const exp of sortedExpenses) {
      const d = exp.date || todayStr;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(exp);
    }

    for (const [dateKey, items] of map.entries()) {
      const totalSpent = items.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const [y, m, d] = dateKey.split("-").map(Number);
      const dateObj = new Date(y, (m || 1) - 1, d || 1);
      const formattedDate = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      groups.push({
        date: dateKey,
        formattedDate,
        isToday: dateKey === todayStr,
        isYesterday: dateKey === yesterdayStr,
        totalSpent: Math.round(totalSpent * 100) / 100,
        items,
      });
    }

    return groups;
  }, [sortedExpenses, todayStr, yesterdayStr]);

  // Filtered totals
  const totalFilteredAmount = useMemo(() => {
    return Math.round(filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0) * 100) / 100;
  }, [filteredExpenses]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    expenses.forEach((e) => {
      const detected = detectExpenseCategory(e.note, e.category);
      counts[detected.key] = (counts[detected.key] || 0) + 1;
    });
    return counts;
  }, [expenses]);

  return (
    <div className="dues-archive-wrap">
      {/* ── 1. ARCHIVE TOP TELEMETRY RIBBON ── */}
      <div className="dues-archive-top-ribbon">
        <div className="dues-archive-top-left">
          <div className="dues-archive-tag">
            <span className="dues-hero-dot" /> TIMELINE JOURNAL
          </div>
          <span className="dues-archive-heading">
            {selectedDate
              ? `DAY LOG // ${selectedDate}`
              : preset === "ALL"
              ? "COMPLETE EXPENSE LOG"
              : `FILTERED // ${preset.replace("_", " ")}`}
          </span>
        </div>

        <div className="dues-archive-top-right">
          <div className="dues-archive-stat-pill">
            <span className="dues-archive-stat-label">RESULTS:</span>
            <span className="dues-archive-stat-value">{filteredExpenses.length} ENTRIES</span>
          </div>

          <div className="dues-archive-stat-pill highlight">
            <span className="dues-archive-stat-label">TOTAL SPENT:</span>
            <span className="dues-archive-stat-value">${totalFilteredAmount.toLocaleString()}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound.click();
              setIsLogModalOpen(true);
            }}
            className="btn-ledger btn-ledger-primary dues-archive-add-btn"
          >
            <Plus size={14} strokeWidth={3} />
            LOG EXPENSE
          </button>
        </div>
      </div>

      {/* ── 2. TACTICAL CONTROL DECK ── */}
      <div className="dues-archive-control-box">
        {/* Row A: Presets & Specific Date Picker Jump */}
        <div className="dues-archive-control-row">
          <div className="dues-archive-presets-group">
            <span className="dues-control-label">RANGE:</span>
            {(
              [
                { key: "ALL", label: "ALL TIME" },
                { key: "TODAY", label: "TODAY" },
                { key: "YESTERDAY", label: "YESTERDAY" },
                { key: "THIS_WEEK", label: "THIS WEEK" },
                { key: "THIS_MONTH", label: "THIS MONTH" },
                { key: "THIS_YEAR", label: "THIS YEAR" },
              ] as const
            ).map((p) => {
              const isActive = !selectedDate && preset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPreset(p.key)}
                  className={`dues-preset-btn ${isActive ? "active" : ""}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Jump to Any Date Input & Step Controls */}
          <div className="dues-date-jump-group">
            <span className="dues-control-label">JUMP TO DAY:</span>
            <button
              type="button"
              onClick={() => handleStepDay(-1)}
              className="dues-date-step-btn"
              title="Previous Day"
              aria-label="Previous day"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="dues-date-input-wrap">
              <Calendar size={13} className="dues-date-icon" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateJump(e.target.value)}
                className={`dues-date-picker-input ${selectedDate ? "has-value" : ""}`}
                title="Select any date to view whatever you logged on that day"
              />
            </div>

            <button
              type="button"
              onClick={() => handleStepDay(1)}
              className="dues-date-step-btn"
              title="Next Day"
              aria-label="Next day"
            >
              <ChevronRight size={14} />
            </button>

            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  playSound.pop();
                  setSelectedDate("");
                }}
                className="dues-date-clear-btn"
                title="Clear date filter"
              >
                <X size={12} /> CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Row B: Search & Sort */}
        <div className="dues-archive-control-row sub-row">
          <div className="dues-archive-search-wrap">
            <Search size={14} className="dues-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by merchant, note, or amount..."
              className="dues-archive-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="dues-search-clear"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="dues-archive-sort-wrap">
            <ArrowUpDown size={13} className="dues-sort-icon" />
            <span className="dues-control-label">SORT:</span>
            <select
              value={sortOption}
              onChange={(e) => {
                playSound.pop();
                setSortOption(e.target.value as SortOption);
              }}
              className="dues-archive-sort-select"
            >
              <option value="NEWEST">Newest Date First</option>
              <option value="OLDEST">Oldest Date First</option>
              <option value="HIGHEST">Highest Amount First</option>
              <option value="LOWEST">Lowest Amount First</option>
            </select>
          </div>
        </div>

        {/* Row C: Category Chips Filter */}
        <div className="dues-archive-categories-row">
          <span className="dues-control-label">CATEGORY:</span>
          <div className="dues-archive-cat-chips-list">
            <button
              type="button"
              onClick={() => {
                playSound.pop();
                setSelectedCategory("ALL");
              }}
              className={`dues-cat-chip ${selectedCategory === "ALL" ? "active" : ""}`}
            >
              <span>ALL ({expenses.length})</span>
            </button>

            {EXPENSE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              const IconComp = CATEGORY_ICONS[cat.key] || Receipt;
              const count = categoryCounts[cat.key] || 0;
              if (count === 0 && selectedCategory !== cat.key) return null; // hide 0-count unused categories to keep it neat
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    playSound.pop();
                    setSelectedCategory(isSelected ? "ALL" : cat.key);
                  }}
                  className={`dues-cat-chip ${isSelected ? "active" : ""}`}
                  style={isSelected ? { backgroundColor: cat.bg } : undefined}
                >
                  <IconComp size={11} strokeWidth={2.4} />
                  <span>{cat.name} ({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. GROUPED TIMELINE FEED ── */}
      <div className="dues-archive-feed">
        {groupedByDate.length === 0 ? (
          <div className="dues-archive-empty">
            <div className="dues-archive-empty-icon">
              <CalendarDays size={32} />
            </div>
            <h4 className="dues-archive-empty-title">NO EXPENSES LOGGED FOR THIS SELECTION</h4>
            <p className="dues-archive-empty-desc">
              {selectedDate
                ? `You have zero recorded transactions on ${selectedDate}.`
                : "No expense records match your active search and category filters."}
            </p>
            <button
              type="button"
              onClick={() => {
                playSound.click();
                setIsLogModalOpen(true);
              }}
              className="btn-ledger btn-ledger-primary"
            >
              <Plus size={14} strokeWidth={3} />
              {selectedDate ? `LOG EXPENSE FOR ${selectedDate}` : "LOG AN EXPENSE"}
            </button>
          </div>
        ) : (
          groupedByDate.map((group) => (
            <div key={group.date} className="dues-day-group">
              {/* Day Header Banner */}
              <div className="dues-day-banner">
                <div className="dues-day-banner-left">
                  <span className="dues-day-dot" />
                  <span className="dues-day-title">{group.formattedDate}</span>
                  {group.isToday && <span className="dues-day-tag today">TODAY</span>}
                  {group.isYesterday && <span className="dues-day-tag yesterday">YESTERDAY</span>}
                </div>

                <div className="dues-day-banner-right">
                  <span className="dues-day-count-badge">
                    {group.items.length} {group.items.length === 1 ? "ENTRY" : "ENTRIES"}
                  </span>
                  <span className="dues-day-total-badge">
                    ${group.totalSpent.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Day Item Cards */}
              <div className="dues-day-items-list">
                {group.items.map((exp) => {
                  const cat = detectExpenseCategory(exp.note, exp.category);
                  const IconComp = CATEGORY_ICONS[cat.key] || Receipt;
                  return (
                    <div key={exp.id} className="dues-archive-card">
                      <div className="dues-archive-card-left">
                        <div
                          className="dues-today-icon-badge"
                          style={{ backgroundColor: cat.bg }}
                          title={cat.name}
                        >
                          <IconComp size={15} strokeWidth={2.4} />
                        </div>

                        <div className="dues-archive-card-details">
                          <span className="dues-archive-card-note">{exp.note}</span>
                          <div className="dues-archive-card-meta">
                            <span
                              className="dues-cat-badge-tiny"
                              style={{ backgroundColor: `${cat.bg}88` }}
                            >
                              {cat.name}
                            </span>
                            <span className="dues-meta-sep">·</span>
                            <span className="dues-time-badge">{exp.time || "LOGGED"}</span>
                            <span className="dues-meta-sep">·</span>
                            <span className="dues-date-badge">{exp.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="dues-archive-card-right">
                        <span className="dues-archive-card-amount">
                          ${Number(exp.amount).toFixed(2)}
                        </span>

                        <div className="dues-archive-actions">
                          <button
                            type="button"
                            onClick={() => {
                              playSound.click();
                              setEditingExpense(exp);
                            }}
                            className="dues-action-btn edit"
                            title="Edit entry"
                            aria-label="Edit entry"
                          >
                            <Edit2 size={13} strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete "${exp.note}" ($${exp.amount})?`)) {
                                onExpenseDeleted(exp.id);
                              }
                            }}
                            className="dues-action-btn delete"
                            title="Delete entry"
                            aria-label="Delete entry"
                          >
                            <Trash2 size={13} strokeWidth={2.2} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          isOpen={Boolean(editingExpense)}
          onClose={() => setEditingExpense(null)}
          onSave={(updated) => {
            onExpenseUpdated(updated);
            setEditingExpense(null);
          }}
        />
      )}

      {/* Log Expense Modal */}
      <LogExpenseModal
        isOpen={isLogModalOpen || isAddExpenseOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          onCloseAddExpense?.();
        }}
        onExpenseCreated={(newExp) => {
          onExpenseCreated(newExp);
          setIsLogModalOpen(false);
          onCloseAddExpense?.();
        }}
        defaultDate={selectedDate || todayStr}
      />
    </div>
  );
};
