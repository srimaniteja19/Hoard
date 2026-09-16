"use client";

import React, { useState, useMemo } from "react";
import { FinancialDebtPaymentRow, FinancialDebtRow } from "@/lib/ledger/types";
import { formatCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import {
  CreditCard,
  DollarSign,
  Trash2,
  Filter,
  CheckCircle,
  TrendingDown,
  Sparkles,
  Receipt,
  Calendar,
  Layers,
} from "lucide-react";

interface DebtPaymentHistoryListProps {
  payments: FinancialDebtPaymentRow[];
  debts: FinancialDebtRow[];
  currency?: string;
  onDeletePayment?: (id: string) => Promise<void> | void;
  onSwitchToAccounts?: () => void;
}

export const DebtPaymentHistoryList: React.FC<DebtPaymentHistoryListProps> = ({
  payments,
  debts,
  currency = "USD",
  onDeletePayment,
  onSwitchToAccounts,
}) => {
  const [selectedDebtId, setSelectedDebtId] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sym = getCurrencySymbol(currency);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    if (selectedDebtId === "ALL") return payments;
    return payments.filter((p) => p.debtId === selectedDebtId);
  }, [payments, selectedDebtId]);

  // Aggregate telemetry
  const metrics = useMemo(() => {
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalInterest = payments.reduce((acc, p) => acc + (p.interestPortion || 0), 0);
    const totalPrincipal = payments.reduce((acc, p) => acc + (p.principalPortion || 0), 0);
    return {
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPrincipal: Math.round(totalPrincipal * 100) / 100,
      count: payments.length,
    };
  }, [payments]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment record from the history log?")) {
      return;
    }
    setDeletingId(id);
    playSound.pop();
    try {
      if (onDeletePayment) {
        await onDeletePayment(id);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateVal: string | Date) => {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* ── 1. SUMMARY TELEMETRY STRIP ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        {/* Total Capital Paid */}
        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
            padding: "12px 14px",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 900,
              color: "#666666",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <DollarSign size={11} /> TOTAL DEBT CAPITAL PAID
          </div>
          <div
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "20px",
              fontWeight: 900,
              color: "#166534",
            }}
          >
            {formatCurrency(metrics.totalPaid, 2, currency)}
          </div>
        </div>

        {/* Total Interest Destroyed */}
        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
            padding: "12px 14px",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 900,
              color: "#92400E",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <TrendingDown size={11} /> INTEREST DEFUSED
          </div>
          <div
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "20px",
              fontWeight: 900,
              color: "#B45309",
            }}
          >
            {formatCurrency(metrics.totalInterest, 2, currency)}
          </div>
        </div>

        {/* Total Principal Extinguished */}
        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
            padding: "12px 14px",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 900,
              color: "#1E3A8A",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <CheckCircle size={11} /> PRINCIPAL EXTINGUISHED
          </div>
          <div
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "20px",
              fontWeight: 900,
              color: "#2563EB",
            }}
          >
            {formatCurrency(metrics.totalPrincipal, 2, currency)}
          </div>
        </div>

        {/* Payments Count */}
        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
            padding: "12px 14px",
            borderRadius: "3px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 900,
              color: "#666666",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Receipt size={11} /> RECORDED PAYMENTS
          </div>
          <div
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "20px",
              fontWeight: 900,
              color: "#0A0A0A",
            }}
          >
            {metrics.count} <span style={{ fontSize: "12px", fontWeight: 700, color: "#666666" }}>TRANS</span>
          </div>
        </div>
      </div>

      {/* ── 2. FILTER & ACTION BAR ── */}
      <div
        style={{
          background: "#FAFAFA",
          border: "2px solid var(--ink, #0A0A0A)",
          boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
          padding: "10px 14px",
          borderRadius: "3px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10px",
              fontWeight: 900,
              color: "#666666",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Filter size={11} /> FILTER BY ACCOUNT:
          </span>

          <select
            value={selectedDebtId}
            onChange={(e) => {
              playSound.click();
              setSelectedDebtId(e.target.value);
            }}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              fontWeight: 800,
              padding: "4px 8px",
              border: "1.5px solid var(--ink, #0A0A0A)",
              borderRadius: "2px",
              background: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Debt Accounts ({payments.length})</option>
            {debts.map((d) => {
              const count = payments.filter((p) => p.debtId === d.id).length;
              return (
                <option key={d.id} value={d.id}>
                  {d.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {onSwitchToAccounts && (
          <button
            type="button"
            onClick={onSwitchToAccounts}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 800,
              padding: "4px 10px",
              background: "#FFFFFF",
              border: "1.5px solid var(--ink, #0A0A0A)",
              borderRadius: "2px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Layers size={11} /> View Accounts &amp; Simulator →
          </button>
        )}
      </div>

      {/* ── 3. MINIMAL LEDGER LIST ── */}
      {filteredPayments.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF",
            border: "2px dashed var(--ink, #0A0A0A)",
            padding: "36px 20px",
            textAlign: "center",
            borderRadius: "3px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "28px" }}>🧾</div>
          <div
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "16px",
              fontWeight: 900,
            }}
          >
            NO DEBT PAYMENTS RECORDED YET
          </div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
              color: "#666666",
              maxWidth: "400px",
            }}
          >
            When you click &quot;MAKE PAYMENT&quot; on any debt account card, every transaction will be logged and preserved right here.
          </div>
          {onSwitchToAccounts && (
            <button
              type="button"
              onClick={onSwitchToAccounts}
              style={{
                marginTop: "8px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "11px",
                fontWeight: 900,
                padding: "6px 14px",
                background: "#0A0A0A",
                color: "#FFE600",
                border: "2px solid #0A0A0A",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            >
              GO TO DEBT ACCOUNTS →
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {filteredPayments.map((payment) => {
            const isDeleting = deletingId === payment.id;
            return (
              <div
                key={payment.id}
                style={{
                  background: "#FFFFFF",
                  border: "1.5px solid var(--ink, #0A0A0A)",
                  borderLeft: payment.remainingBalance <= 0 ? "5px solid #16A34A" : "5px solid var(--ink, #0A0A0A)",
                  boxShadow: "2.5px 2.5px 0 var(--ink, #0A0A0A)",
                  padding: "10px 14px",
                  borderRadius: "3px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  transition: "all 0.15s ease",
                  opacity: isDeleting ? 0.4 : 1,
                }}
              >
                {/* Left: Date, Debt Name & Label */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  {/* Date badge */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: "85px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "11px",
                        fontWeight: 900,
                        color: "#0A0A0A",
                      }}
                    >
                      {formatDate(payment.paymentDate)}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        color: "#777777",
                      }}
                    >
                      {formatTime(payment.paymentDate)}
                    </span>
                  </div>

                  {/* Account Name */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--display, sans-serif)",
                        fontSize: "13px",
                        fontWeight: 900,
                        color: "#0A0A0A",
                      }}
                    >
                      {payment.debtName}
                    </span>

                    {payment.label && (
                      <span
                        style={{
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "9px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          background: payment.label.toLowerCase().includes("full")
                            ? "#F3E8FF"
                            : "#F3F4F6",
                          color: payment.label.toLowerCase().includes("full")
                            ? "#7E22CE"
                            : "#4B5563",
                          border: `1px solid ${
                            payment.label.toLowerCase().includes("full")
                              ? "#C084FC"
                              : "#D1D5DB"
                          }`,
                          padding: "1px 5px",
                          borderRadius: "2px",
                        }}
                      >
                        {payment.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Center / Right: Split chips + Remaining balance + Amount + Delete */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  {/* Split Telemetry Chip */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "2px",
                      padding: "2px 6px",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9.5px",
                      fontWeight: 800,
                      gap: "6px",
                    }}
                  >
                    <span style={{ color: "#B45309" }}>
                      Int: {formatCurrency(payment.interestPortion, 2, currency)}
                    </span>
                    <span style={{ color: "#CBD5E1" }}>•</span>
                    <span style={{ color: "#166534" }}>
                      Prin: {formatCurrency(payment.principalPortion, 2, currency)}
                    </span>
                  </div>

                  {/* Remaining Balance */}
                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10px",
                      color: payment.remainingBalance <= 0 ? "#166534" : "#666666",
                      fontWeight: 800,
                    }}
                  >
                    {payment.remainingBalance <= 0 ? (
                      <span
                        style={{
                          background: "#DCFCE7",
                          color: "#166534",
                          padding: "1px 5px",
                          borderRadius: "2px",
                          border: "1px solid #86EFAC",
                        }}
                      >
                        🏆 PAID OFF
                      </span>
                    ) : (
                      `Bal: ${formatCurrency(payment.remainingBalance, 2, currency)}`
                    )}
                  </div>

                  {/* Payment Amount */}
                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "14px",
                      fontWeight: 900,
                      color: "#166534",
                      minWidth: "80px",
                      textAlign: "right",
                    }}
                  >
                    +{formatCurrency(payment.amount, 2, currency)}
                  </div>

                  {/* Delete Button */}
                  {onDeletePayment && (
                    <button
                      type="button"
                      title="Delete payment record"
                      disabled={isDeleting}
                      onClick={() => handleDelete(payment.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#999999",
                        cursor: isDeleting ? "not-allowed" : "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "2px",
                        transition: "color 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#999999")}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
