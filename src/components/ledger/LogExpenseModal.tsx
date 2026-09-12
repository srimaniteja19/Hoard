"use client";

import React, { useState, useEffect } from "react";
import { FinancialDailyExpenseRow } from "@/lib/ledger/types";
import {
  EXPENSE_CATEGORIES,
  DEFAULT_CATEGORY,
  detectExpenseCategory,
  formatLocalDate,
  formatLocalTime,
} from "@/lib/ledger/dailyExpenses";
import { playSound } from "@/lib/sound";
import {
  X,
  Calendar,
  Clock,
  Tag,
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
  Check,
  Plus,
} from "lucide-react";

interface LogExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated: (expense: FinancialDailyExpenseRow) => void;
  defaultDate?: string;
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

const INCREMENTS = [5, 10, 20, 50, 100];

export const LogExpenseModal: React.FC<LogExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseCreated,
  defaultDate,
}) => {
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [category, setCategory] = useState<string>("misc");
  const [date, setDate] = useState<string>(defaultDate || formatLocalDate());
  const [time, setTime] = useState<string>(formatLocalTime());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate || formatLocalDate());
      setTime(formatLocalTime());
      setAmount("");
      setNote("");
      setCategory("misc");
      setErrorMsg(null);
    }
  }, [isOpen, defaultDate]);

  if (!isOpen) return null;

  const handleAddIncrement = (inc: number) => {
    playSound.pop();
    const curr = parseFloat(amount) || 0;
    setAmount((curr + inc).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0");
      return;
    }
    if (!note.trim()) {
      setErrorMsg("Please enter a note or merchant description");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    playSound.fileIt();

    const tempId = `temp-${Date.now()}`;
    const detected = detectExpenseCategory(note.trim(), category);
    const finalCategory = category !== "misc" ? category : detected.key;

    try {
      const res = await fetch("/api/financial/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          note: note.trim(),
          category: finalCategory,
          date: date || formatLocalDate(),
          time: time || formatLocalTime(),
          currency: "USD",
        }),
      });

      if (res.ok) {
        const created: FinancialDailyExpenseRow = await res.json();
        onExpenseCreated(created);
        onClose();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to create expense record");
      }
    } catch {
      setErrorMsg("Network error while recording expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCatConfig =
    EXPENSE_CATEGORIES.find((c) => c.key === category) || DEFAULT_CATEGORY;

  return (
    <div className="ledger-modal-backdrop" onClick={onClose}>
      <div
        className="ledger-modal-card edit-expense-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="ledger-modal-header">
          <div className="ledger-modal-title-group">
            <span className="deck-dot dot-green" />
            <span className="ledger-modal-title">NEW_LOG // RECORD_EXPENSE</span>
          </div>
          <button
            type="button"
            className="ledger-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="ledger-modal-error-banner">
            <span>⚠ {errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ledger-modal-form">
          {/* Amount & Quick Add Chips */}
          <div className="ledger-form-group">
            <label className="ledger-form-label">
              <span>EXPENSE AMOUNT (USD)</span>
            </label>
            <div className="ledger-input-amount-wrapper">
              <span className="ledger-input-prefix">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="ledger-input-field ledger-input-number"
                autoFocus
              />
            </div>
            {/* Increments */}
            <div className="modal-quick-increments">
              <span className="modal-increments-label">QUICK:</span>
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
          </div>

          {/* Note / Merchant */}
          <div className="ledger-form-group">
            <label className="ledger-form-label">
              <span>NOTE / MERCHANT / ITEM</span>
            </label>
            <input
              type="text"
              required
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (category === "misc") {
                  const detected = detectExpenseCategory(e.target.value);
                  if (detected.key !== "misc") {
                    setCategory(detected.key);
                  }
                }
              }}
              placeholder="e.g. Blue Bottle coffee, Chipotle lunch, Grocery haul"
              className="ledger-input-field"
            />
          </div>

          {/* Date & Time */}
          <div className="ledger-form-row">
            <div className="ledger-form-group" style={{ flex: 1 }}>
              <label className="ledger-form-label">
                <Calendar size={12} />
                <span>EXPENSE DATE</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ledger-input-field"
              />
            </div>

            <div className="ledger-form-group" style={{ width: "130px" }}>
              <label className="ledger-form-label">
                <Clock size={12} />
                <span>TIME</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="ledger-input-field"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="ledger-form-group">
            <label className="ledger-form-label">
              <Tag size={12} />
              <span>CATEGORY (ACTIVE: {currentCatConfig.name})</span>
            </label>
            <div className="ledger-category-chip-grid">
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = category === cat.key;
                const IconComp = CATEGORY_ICONS[cat.key] || Receipt;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      playSound.pop();
                      setCategory(cat.key);
                    }}
                    className={`ledger-cat-choice-chip ${isSelected ? "selected" : ""}`}
                    style={isSelected ? { backgroundColor: cat.bg } : undefined}
                  >
                    <IconComp size={12} strokeWidth={2.4} />
                    <span>{cat.name}</span>
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  playSound.pop();
                  setCategory("misc");
                }}
                className={`ledger-cat-choice-chip ${category === "misc" ? "selected" : ""}`}
                style={category === "misc" ? { backgroundColor: DEFAULT_CATEGORY.bg } : undefined}
              >
                <Receipt size={12} strokeWidth={2.4} />
                <span>MISC</span>
                {category === "misc" && <Check size={11} strokeWidth={3} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="ledger-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-ledger btn-ledger-secondary"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              className="btn-ledger btn-ledger-primary"
            >
              <Plus size={13} strokeWidth={3} />
              {isSubmitting ? "RECORDING..." : "LOG EXPENSE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
