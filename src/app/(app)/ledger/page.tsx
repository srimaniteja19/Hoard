"use client";

import React, { useState, useEffect, Suspense } from "react";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";
import {
  Sparkles,
  Plus,
  LayoutDashboard,
  Repeat,
  CreditCard,
  TrendingUp,
  Landmark,
} from "lucide-react";
import {
  FinancialOverviewPayload,
  FinancialSubscriptionRow,
  FinancialDebtRow,
  FinancialAssetRow,
  FinancialIncomeRow,
  FinancialAuditRow,
} from "@/lib/ledger/types";
import { LedgerOverview } from "@/components/ledger/LedgerOverview";
import { SubscriptionTracker } from "@/components/ledger/SubscriptionTracker";
import { DebtPayoffTracker } from "@/components/ledger/DebtPayoffTracker";
import { CashFlowPlanner } from "@/components/ledger/CashFlowPlanner";
import { AssetsNetWorth } from "@/components/ledger/AssetsNetWorth";
import { AddSubscriptionModal } from "@/components/ledger/AddSubscriptionModal";
import { AddDebtModal } from "@/components/ledger/AddDebtModal";
import { AddAssetModal } from "@/components/ledger/AddAssetModal";
import { AddIncomeModal } from "@/components/ledger/AddIncomeModal";
import { LedgerAuditModal } from "@/components/ledger/LedgerAuditModal";
import { calculateSubscriptionMetrics } from "@/lib/ledger/subscriptionMetrics";
import { calculateCashFlow } from "@/lib/ledger/cashFlow";
import { calculateDebtPayoff } from "@/lib/ledger/debtPayoff";
import { playSound } from "@/lib/sound";

type LedgerTab = "OVERVIEW" | "SUBSCRIPTIONS" | "DEBTS" | "CASHFLOW" | "NETWORTH";

function LedgerContent() {
  const [overview, setOverview] = useState<FinancialOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LedgerTab>("OVERVIEW");

  // Modals & Editing State
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<FinancialSubscriptionRow | null>(null);

  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<FinancialDebtRow | null>(null);

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FinancialAssetRow | null>(null);

  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<FinancialIncomeRow | null>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/financial/overview");
      if (res.ok) {
        const data: FinancialOverviewPayload = await res.json();
        setOverview(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  // Helper to re-derive metrics when local data changes
  const recomputeOverview = (
    subs: FinancialSubscriptionRow[],
    debts: FinancialDebtRow[],
    assets: FinancialAssetRow[],
    incomes: FinancialIncomeRow[],
    latestAudit: FinancialAuditRow | null
  ): FinancialOverviewPayload => {
    const subscriptionMetrics = calculateSubscriptionMetrics(subs);
    const { cashFlow, netWorth } = calculateCashFlow(incomes, subs, debts, assets);
    const avalanchePayoff = calculateDebtPayoff(debts, "AVALANCHE", 100);
    const snowballPayoff = calculateDebtPayoff(debts, "SNOWBALL", 100);

    return {
      subscriptions: subs,
      debts,
      assets,
      incomes,
      metrics: {
        subscriptionMetrics,
        cashFlow,
        netWorth,
        avalanchePayoff,
        snowballPayoff,
      },
      latestAudit,
    };
  };

  // Handlers for Subscriptions
  const handleSubscriptionCreated = (sub: FinancialSubscriptionRow) => {
    if (!overview) return;
    const newSubs = [sub, ...overview.subscriptions];
    setOverview(
      recomputeOverview(newSubs, overview.debts, overview.assets, overview.incomes, overview.latestAudit)
    );
  };

  const handleSubscriptionUpdated = (updated: FinancialSubscriptionRow) => {
    if (!overview) return;
    const newSubs = overview.subscriptions.map((s) => (s.id === updated.id ? updated : s));
    setOverview(
      recomputeOverview(newSubs, overview.debts, overview.assets, overview.incomes, overview.latestAudit)
    );
  };

  const handleSubscriptionDeleted = (id: string) => {
    if (!overview) return;
    const newSubs = overview.subscriptions.filter((s) => s.id !== id);
    setOverview(
      recomputeOverview(newSubs, overview.debts, overview.assets, overview.incomes, overview.latestAudit)
    );
  };

  // Handlers for Debts
  const handleDebtCreated = (debt: FinancialDebtRow) => {
    if (!overview) return;
    const newDebts = [debt, ...overview.debts];
    setOverview(
      recomputeOverview(overview.subscriptions, newDebts, overview.assets, overview.incomes, overview.latestAudit)
    );
  };

  const handleDebtUpdated = (updated: FinancialDebtRow) => {
    if (!overview) return;
    const newDebts = overview.debts.map((d) => (d.id === updated.id ? updated : d));
    setOverview(
      recomputeOverview(overview.subscriptions, newDebts, overview.assets, overview.incomes, overview.latestAudit)
    );
  };

  const handleDebtDeleted = (id: string) => {
    if (!overview) return;
    const newDebts = overview.debts.filter((d) => d.id !== id);
    setOverview(
      recomputeOverview(overview.subscriptions, newDebts, overview.assets, overview.incomes, overview.latestAudit)
    );
  };

  // Handlers for Assets
  const handleAssetCreated = (asset: FinancialAssetRow) => {
    if (!overview) return;
    const newAssets = [asset, ...overview.assets];
    setOverview(
      recomputeOverview(overview.subscriptions, overview.debts, newAssets, overview.incomes, overview.latestAudit)
    );
  };

  const handleAssetUpdated = (updated: FinancialAssetRow) => {
    if (!overview) return;
    const newAssets = overview.assets.map((a) => (a.id === updated.id ? updated : a));
    setOverview(
      recomputeOverview(overview.subscriptions, overview.debts, newAssets, overview.incomes, overview.latestAudit)
    );
  };

  const handleAssetDeleted = (id: string) => {
    if (!overview) return;
    const newAssets = overview.assets.filter((a) => a.id !== id);
    setOverview(
      recomputeOverview(overview.subscriptions, overview.debts, newAssets, overview.incomes, overview.latestAudit)
    );
  };

  // Handlers for Incomes
  const handleIncomeCreated = (income: FinancialIncomeRow) => {
    if (!overview) return;
    const newIncomes = [income, ...overview.incomes];
    setOverview(
      recomputeOverview(overview.subscriptions, overview.debts, overview.assets, newIncomes, overview.latestAudit)
    );
  };

  const handleIncomeUpdated = (updated: FinancialIncomeRow) => {
    if (!overview) return;
    const newIncomes = overview.incomes.map((i) => (i.id === updated.id ? updated : i));
    setOverview(
      recomputeOverview(overview.subscriptions, overview.debts, overview.assets, newIncomes, overview.latestAudit)
    );
  };

  const handleIncomeDeleted = (id: string) => {
    if (!overview) return;
    const newIncomes = overview.incomes.filter((i) => i.id !== id);
    setOverview(
      recomputeOverview(overview.subscriptions, overview.debts, overview.assets, newIncomes, overview.latestAudit)
    );
  };

  // Audit
  const handleAuditGenerated = (audit: FinancialAuditRow) => {
    if (!overview) return;
    setOverview({ ...overview, latestAudit: audit });
  };

  return (
    <div className="ledger-container">
      {/* ── HEADER MASTHEAD ── */}
      <header className="ledger-masthead">
        <div className="ledger-title-group">
          <div className="ledger-title-row">
            <h1>THE HOARD FINANCIAL LEDGER</h1>
            <span className="ledger-tagline-badge">PERSONAL FISCAL DESK</span>
          </div>
          <p className="ledger-subtitle">
            Autonomous ledger for recurring commitments, aggressive debt payoff, and liquid net worth tracking.
          </p>
        </div>

        <div className="ledger-actions">
          <button
            type="button"
            className="btn-ledger btn-ledger-ai"
            onClick={() => {
              playSound.click();
              setIsAuditModalOpen(true);
            }}
          >
            <Sparkles size={13} aria-hidden="true" />
            AI AUDITOR
          </button>
          <button
            type="button"
            className="btn-ledger btn-ledger-primary"
            onClick={() => {
              playSound.click();
              if (activeTab === "SUBSCRIPTIONS") {
                setEditingSub(null);
                setIsAddSubOpen(true);
              } else if (activeTab === "DEBTS") {
                setEditingDebt(null);
                setIsAddDebtOpen(true);
              } else if (activeTab === "NETWORTH") {
                setEditingAsset(null);
                setIsAddAssetOpen(true);
              } else {
                setEditingIncome(null);
                setIsAddIncomeOpen(true);
              }
            }}
          >
            <Plus size={13} aria-hidden="true" />
            ADD ENTRY
          </button>
        </div>
      </header>

      {/* ── SEGMENTED NAVIGATION TABS ── */}
      <nav className="ledger-nav-bar" aria-label="Ledger Sections">
        <div className="ledger-nav-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "OVERVIEW"}
            className={`ledger-nav-tab ${activeTab === "OVERVIEW" ? "active" : ""}`}
            onClick={() => {
              playSound.click();
              setActiveTab("OVERVIEW");
            }}
          >
            <LayoutDashboard size={13} aria-hidden="true" />
            OVERVIEW
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "SUBSCRIPTIONS"}
            className={`ledger-nav-tab ${activeTab === "SUBSCRIPTIONS" ? "active" : ""}`}
            onClick={() => {
              playSound.click();
              setActiveTab("SUBSCRIPTIONS");
            }}
          >
            <Repeat size={13} aria-hidden="true" />
            SUBSCRIPTIONS ({overview?.subscriptions.length || 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "DEBTS"}
            className={`ledger-nav-tab ${activeTab === "DEBTS" ? "active" : ""}`}
            onClick={() => {
              playSound.click();
              setActiveTab("DEBTS");
            }}
          >
            <CreditCard size={13} aria-hidden="true" />
            DEBT PAYOFF ({overview?.debts.length || 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "CASHFLOW"}
            className={`ledger-nav-tab ${activeTab === "CASHFLOW" ? "active" : ""}`}
            onClick={() => {
              playSound.click();
              setActiveTab("CASHFLOW");
            }}
          >
            <TrendingUp size={13} aria-hidden="true" />
            CASH FLOW ({overview?.incomes.length || 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "NETWORTH"}
            className={`ledger-nav-tab ${activeTab === "NETWORTH" ? "active" : ""}`}
            onClick={() => {
              playSound.click();
              setActiveTab("NETWORTH");
            }}
          >
            <Landmark size={13} aria-hidden="true" />
            NET WORTH ({overview?.assets.length || 0})
          </button>
        </div>
      </nav>

      {/* ── TAB CONTENT ── */}
      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 800 }}>
            ANALYZING FINANCIAL GRAPH & COMPILED LEDGER...
          </div>
        </div>
      ) : !overview ? (
        <div style={{ padding: "40px", textAlign: "center" }}>
          Failed to load ledger records. Please refresh.
        </div>
      ) : (
        <>
          {activeTab === "OVERVIEW" && (
            <LedgerOverview
              overview={overview}
              onNavigateTab={(tab) => {
                playSound.click();
                setActiveTab(tab);
              }}
              onAddSubscription={() => {
                setEditingSub(null);
                setIsAddSubOpen(true);
              }}
              onAddDebt={() => {
                setEditingDebt(null);
                setIsAddDebtOpen(true);
              }}
              onAddAsset={() => {
                setEditingAsset(null);
                setIsAddAssetOpen(true);
              }}
              onOpenAudit={() => setIsAuditModalOpen(true)}
            />
          )}

          {activeTab === "SUBSCRIPTIONS" && (
            <SubscriptionTracker
              subscriptions={overview.subscriptions}
              onAddSubscription={() => {
                setEditingSub(null);
                setIsAddSubOpen(true);
              }}
              onEditSubscription={(sub) => {
                setEditingSub(sub);
                setIsAddSubOpen(true);
              }}
              onUpdateSubscription={handleSubscriptionUpdated}
              onDeleteSubscription={handleSubscriptionDeleted}
            />
          )}

          {activeTab === "DEBTS" && (
            <DebtPayoffTracker
              debts={overview.debts}
              onAddDebt={() => {
                setEditingDebt(null);
                setIsAddDebtOpen(true);
              }}
              onEditDebt={(debt) => {
                setEditingDebt(debt);
                setIsAddDebtOpen(true);
              }}
              onUpdateDebt={handleDebtUpdated}
              onDeleteDebt={handleDebtDeleted}
            />
          )}

          {activeTab === "CASHFLOW" && (
            <CashFlowPlanner
              incomes={overview.incomes}
              cashFlow={overview.metrics.cashFlow}
              onAddIncome={() => {
                setEditingIncome(null);
                setIsAddIncomeOpen(true);
              }}
              onEditIncome={(income) => {
                setEditingIncome(income);
                setIsAddIncomeOpen(true);
              }}
              onUpdateIncome={handleIncomeUpdated}
              onDeleteIncome={handleIncomeDeleted}
            />
          )}

          {activeTab === "NETWORTH" && (
            <AssetsNetWorth
              assets={overview.assets}
              netWorth={overview.metrics.netWorth}
              onAddAsset={() => {
                setEditingAsset(null);
                setIsAddAssetOpen(true);
              }}
              onEditAsset={(asset) => {
                setEditingAsset(asset);
                setIsAddAssetOpen(true);
              }}
              onUpdateAsset={handleAssetUpdated}
              onDeleteAsset={handleAssetDeleted}
            />
          )}
        </>
      )}

      {/* ── MODALS ── */}
      <AddSubscriptionModal
        isOpen={isAddSubOpen}
        onClose={() => {
          setIsAddSubOpen(false);
          setEditingSub(null);
        }}
        onCreated={handleSubscriptionCreated}
        onUpdated={handleSubscriptionUpdated}
        subscriptionToEdit={editingSub}
      />

      <AddDebtModal
        isOpen={isAddDebtOpen}
        onClose={() => {
          setIsAddDebtOpen(false);
          setEditingDebt(null);
        }}
        onCreated={handleDebtCreated}
        onUpdated={handleDebtUpdated}
        debtToEdit={editingDebt}
      />

      <AddAssetModal
        isOpen={isAddAssetOpen}
        onClose={() => {
          setIsAddAssetOpen(false);
          setEditingAsset(null);
        }}
        onCreated={handleAssetCreated}
        onUpdated={handleAssetUpdated}
        assetToEdit={editingAsset}
      />

      <AddIncomeModal
        isOpen={isAddIncomeOpen}
        onClose={() => {
          setIsAddIncomeOpen(false);
          setEditingIncome(null);
        }}
        onCreated={handleIncomeCreated}
        onUpdated={handleIncomeUpdated}
        incomeToEdit={editingIncome}
      />

      <LedgerAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        latestAudit={overview?.latestAudit || null}
        onAuditGenerated={handleAuditGenerated}
      />
    </div>
  );
}

export default function LedgerPage() {
  return (
    <AppPage variant="flush">
      <Suspense fallback={<AppLoading label="OPENING FINANCIAL LEDGER..." />}>
        <div className="ledger-scroll-view">
          <LedgerContent />
        </div>
      </Suspense>
    </AppPage>
  );
}
