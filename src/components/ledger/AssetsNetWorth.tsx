"use client";

import React from "react";
import {
  FinancialAssetRow,
  NetWorthSummary,
  AssetCategory,
} from "@/lib/ledger/types";
import { formatCurrency, getCurrencySymbol } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";

import { NetWorthCompositionChart } from "./charts/NetWorthCompositionChart";

const ASSET_THEMES: Record<
  AssetCategory,
  { icon: string; label: string; headerBg: string }
> = {
  CASH_CHECKING: { icon: "💳", label: "CASH / CHECKING", headerBg: "#00F0FF" },
  HYSA: { icon: "📈", label: "HIGH YIELD SAVINGS", headerBg: "#00FF9D" },
  INVESTMENT: { icon: "📊", label: "BROKERAGE / STOCKS", headerBg: "#FFE600" },
  RETIREMENT: { icon: "🏛️", label: "401(K) / RETIREMENT", headerBg: "#C084FC" },
  REAL_ESTATE: { icon: "🏡", label: "REAL ESTATE", headerBg: "#34D399" },
  CRYPTO: { icon: "🪙", label: "CRYPTO ASSETS", headerBg: "#FF2E93" },
  OTHER: { icon: "📦", label: "OTHER HOLDING", headerBg: "#E4E4E7" },
};

interface AssetsNetWorthProps {
  assets: FinancialAssetRow[];
  netWorth: NetWorthSummary;
  onAddAsset: () => void;
  onEditAsset: (asset: FinancialAssetRow) => void;
  onUpdateAsset: (asset: FinancialAssetRow) => void;
  onDeleteAsset: (id: string) => void;
  currency?: string;
}

export const AssetsNetWorth: React.FC<AssetsNetWorthProps> = ({
  assets,
  netWorth,
  onAddAsset,
  onEditAsset,
  onUpdateAsset,
  onDeleteAsset,
  currency = "INR",
}) => {
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this asset?")) return;
    playSound.bury();
    try {
      const res = await fetch(`/api/financial/assets/${id}`, { method: "DELETE" });
      if (res.ok) onDeleteAsset(id);
    } catch {
      // ignore
    }
  };

  const sym = getCurrencySymbol(currency);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── VISUAL ASSET COMPOSITION & DIVERSIFICATION CHART ── */}
      <NetWorthCompositionChart
        netWorth={netWorth}
        assets={assets}
        currency={currency}
      />

      {/* ── TOTAL NET WORTH SUMMARY HERO BANNER ── */}
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "2px solid var(--ink, #0A0A0A)",
          boxShadow: "4px 4px 0 var(--ink, #0A0A0A)",
          padding: "24px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "18px",
          borderRadius: "3px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 900,
              letterSpacing: "0.08em",
              color: "#666666",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            TOTAL NET WORTH (ASSETS − LIABILITIES)
          </div>
          <div
            style={{
              fontFamily: "var(--display, sans-serif)",
              fontSize: "38px",
              fontWeight: 900,
              color: netWorth.netWorth >= 0 ? "var(--ink, #0A0A0A)" : "#DC2626",
            }}
          >
            {formatCurrency(netWorth.netWorth, 2, currency)}
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 700, color: "#666666", marginTop: "4px" }}>
            Total Assets: <b>{formatCurrency(netWorth.totalAssets, 0, currency)}</b> | Total Debt Liabilities: <b>{formatCurrency(netWorth.totalLiabilities, 0, currency)}</b>
          </div>
        </div>

        <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddAsset}>
          + ADD ASSET / HOLDING
        </button>
      </div>

      {/* ── ASSET ALLOCATION BAR ── */}
      {netWorth.totalAssets > 0 && (
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            border: "2px solid var(--ink, #0A0A0A)",
            boxShadow: "3.5px 3.5px 0 var(--ink, #0A0A0A)",
            padding: "18px 20px",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 900, marginBottom: "10px", textTransform: "uppercase" }}>
            ASSET ALLOCATION BREAKDOWN
          </div>

          <div
            style={{
              display: "flex",
              height: "20px",
              border: "2px solid var(--ink, #0A0A0A)",
              borderRadius: "2px",
              overflow: "hidden",
              marginBottom: "12px",
            }}
          >
            {netWorth.totalLiquidCash > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalLiquidCash / netWorth.totalAssets) * 100}%`,
                  background: "#00F0FF",
                }}
                title={`Liquid Cash: ${formatCurrency(netWorth.totalLiquidCash, 0, currency)}`}
              />
            )}
            {netWorth.totalInvestments > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalInvestments / netWorth.totalAssets) * 100}%`,
                  background: "#FFE600",
                }}
                title={`Investments: ${formatCurrency(netWorth.totalInvestments, 0, currency)}`}
              />
            )}
            {netWorth.totalRetirement > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalRetirement / netWorth.totalAssets) * 100}%`,
                  background: "#C084FC",
                }}
                title={`Retirement: ${formatCurrency(netWorth.totalRetirement, 0, currency)}`}
              />
            )}
            {netWorth.totalRealEstate > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalRealEstate / netWorth.totalAssets) * 100}%`,
                  background: "#34D399",
                }}
                title={`Real Estate: ${formatCurrency(netWorth.totalRealEstate, 0, currency)}`}
              />
            )}
            {netWorth.totalCrypto > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalCrypto / netWorth.totalAssets) * 100}%`,
                  background: "#FF2E93",
                }}
                title={`Crypto: ${formatCurrency(netWorth.totalCrypto, 0, currency)}`}
              />
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "11px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "10px", height: "10px", background: "#00F0FF", border: "1px solid #000" }} />
              Liquid Cash: {pct(netWorth.totalLiquidCash, netWorth.totalAssets)}%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "10px", height: "10px", background: "#FFE600", border: "1px solid #000" }} />
              Investments: {pct(netWorth.totalInvestments, netWorth.totalAssets)}%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "10px", height: "10px", background: "#C084FC", border: "1px solid #000" }} />
              Retirement: {pct(netWorth.totalRetirement, netWorth.totalAssets)}%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "10px", height: "10px", background: "#34D399", border: "1px solid #000" }} />
              Real Estate: {pct(netWorth.totalRealEstate, netWorth.totalAssets)}%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "10px", height: "10px", background: "#FF2E93", border: "1px solid #000" }} />
              Crypto: {pct(netWorth.totalCrypto, netWorth.totalAssets)}%
            </span>
          </div>
        </div>
      )}

      {/* ── ASSETS LIST ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
        <h3 style={{ fontFamily: "var(--display, sans-serif)", fontSize: "20px", fontWeight: 900, margin: 0 }}>
          PORTFOLIO HOLDINGS &amp; ASSETS ({assets.length})
        </h3>
        <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddAsset}>
          + ADD ASSET
        </button>
      </div>

      {assets.length === 0 ? (
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            border: "2px dashed var(--ink, #0A0A0A)",
            boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
            padding: "40px 24px",
            textAlign: "center",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "18px", fontWeight: 900, marginBottom: "6px" }}>
            ZERO ASSETS RECORDED
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#666666", marginBottom: "16px" }}>
            Track checking accounts, HYSA balances, brokerage investments, real estate equity, and crypto portfolios.
          </div>
          <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddAsset}>
            + ADD YOUR FIRST ASSET
          </button>
        </div>
      ) : (
        <div className="sub-grid">
          {assets.map((asset, index) => {
            const cat = (asset.category as AssetCategory) || "OTHER";
            const theme = ASSET_THEMES[cat] || ASSET_THEMES.OTHER;
            const assetCurrency = (asset as any).currency || currency;

            return (
              <div
                key={asset.id}
                className="sub-card-editorial"
                style={
                  {
                    "--cat-header-bg": theme.headerBg,
                    "--sub-index": index,
                  } as React.CSSProperties
                }
              >
                {/* Header */}
                <div className="sub-card-header">
                  <span className="sub-card-category">
                    <span className="sub-card-category-icon">{theme.icon}</span>
                    <span>{theme.label}</span>
                  </span>

                  {asset.expectedYield ? (
                    <span
                      className="sub-card-status"
                      style={{
                        background: "#DCFCE7",
                        color: "#166534",
                        borderColor: "#000000",
                      }}
                    >
                      {asset.expectedYield}% APY
                    </span>
                  ) : (
                    <span
                      className="sub-card-status"
                      style={{
                        background: "#FFFFFF",
                        color: "#000000",
                        borderColor: "#000000",
                      }}
                    >
                      HOLDING
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="sub-card-body">
                  <div className="sub-card-title-row">
                    <h3 className="sub-card-title">{asset.name}</h3>
                    <div className="sub-card-price-box">
                      <span className="sub-card-price">
                        {formatCurrency(asset.value, 2, assetCurrency)}
                      </span>
                    </div>
                  </div>

                  {asset.institution && (
                    <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", color: "#444444" }}>
                      Institution: <b>{asset.institution}</b>
                    </div>
                  )}

                  {asset.notes && (
                    <div className="sub-card-notes">
                      “{asset.notes}”
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="sub-card-footer">
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => {
                      playSound.click();
                      onEditAsset(asset);
                    }}
                  >
                    ✎ EDIT
                  </button>
                  <button
                    type="button"
                    className="btn-card-action btn-card-delete"
                    onClick={() => handleDelete(asset.id)}
                  >
                    ✕ REMOVE
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
