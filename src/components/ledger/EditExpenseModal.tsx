"use client";

import React, { useState } from "react";
import { FinancialDailyExpenseRow } from "@/lib/ledger/types";
import {
  EXPENSE_CATEGORIES,
  DEFAULT_CATEGORY,
  detectExpenseCategory,
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
} from "lucide-react";

interface EditExpenseModalProps {
  expense: FinancialDailyExpenseRow;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: FinancialDailyExpenseRow) => void;
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

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState<string>(String(expense.amount));
  const [note, setNote] = useState<string>(expense.note);
  const [category, setCategory] = useState<string>(expense.category || "misc");
  const [date, setDate] = useState<string>(expense.date || "");
  const [time, setTime] = useState<string>(expense.time || "12:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0");
      return;
    }
    if (!note.trim()) {
      setErrorMsg("Please provide a note or description");
      return;
    }
    if (!date) {
      setErrorMsg("Please select a date");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    playSound.fileIt();

    try {
      const res = await fetch("/api/financial/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: expense.id,
          amount: numAmount,
          note: note.trim(),
          category,
          date,
          time: time || "12:00",
        }),
      });

      if (res.ok) {
        const updated: FinancialDailyExpenseRow = await res.json();
        onSave(updated);
        onClose();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to update expense");
      }
    } catch {
      setErrorMsg("Network error while updating expense");
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
            <span className="deck-dot dot-yellow" />
            <span className="ledger-modal-title">EDIT_LOG // EXPENSE_RECORD</span>
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

        <form onSubmit={handleSave} className="ledger-modal-form">
          {/* Amount & Currency */}
          <div className="ledger-form-group">
            <label className="ledger-form-label">
              <span>AMOUNT ({expense.currency || "USD"})</span>
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
          </div>

          {/* Note / Description */}
          <div className="ledger-form-group">
            <label className="ledger-form-label">
              <span>NOTE / MERCHANT</span>
            </label>
            <input
              type="text"
              required
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (!category || category === "misc") {
                  const detected = detectExpenseCategory(e.target.value);
                  if (detected.key !== "misc") {
                    setCategory(detected.key);
                  }
                }
              }}
              placeholder="e.g. Whole Foods, Blue Bottle, Metro"
              className="ledger-input-field"
            />
          </div>

          {/* Date & Time Row */}
          <div className="ledger-form-row">
            <div className="ledger-form-group" style={{ flex: 1 }}>
              <label className="ledger-form-label">
                <Calendar size={12} />
                <span>DATE</span>
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

          {/* Category Chips Selector */}
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
              disabled={isSubmitting}
              className="btn-ledger btn-ledger-primary"
            >
              {isSubmitting ? "SAVING..." : "UPDATE ENTRY"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
