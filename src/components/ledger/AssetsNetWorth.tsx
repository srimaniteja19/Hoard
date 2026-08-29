"use client";

import React, { useMemo } from "react";
import {
  FinancialAssetRow,
  NetWorthSummary,
  AssetCategory,
} from "@/lib/ledger/types";
import { playSound } from "@/lib/sound";

import { NetWorthCompositionChart } from "./charts/NetWorthCompositionChart";

const ASSET_THEMES: Record<AssetCategory, { icon: string; label: string }> = {
  CASH_CHECKING: { icon: "💳", label: "CASH / CHECKING" },
  HYSA: { icon: "📈", label: "HIGH YIELD SAVINGS" },
  INVESTMENT: { icon: "📊", label: "BROKERAGE / STOCKS" },
  RETIREMENT: { icon: "🏛️", label: "401(K) / RETIREMENT" },
  REAL_ESTATE: { icon: "🏡", label: "REAL ESTATE" },
  CRYPTO: { icon: "🪙", label: "CRYPTO ASSETS" },
  OTHER: { icon: "📦", label: "OTHER HOLDING" },
};

interface AssetsNetWorthProps {
  assets: FinancialAssetRow[];
  netWorth: NetWorthSummary;
  onAddAsset: () => void;
  onUpdateAsset: (asset: FinancialAssetRow) => void;
  onDeleteAsset: (id: string) => void;
}

export const AssetsNetWorth: React.FC<AssetsNetWorthProps> = ({
  assets,
  netWorth,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── VISUAL ASSET COMPOSITION & DIVERSIFICATION CHART ── */}
      <NetWorthCompositionChart
        netWorth={netWorth}
        assets={assets}
      />
      {/* ── NET WORTH BANNER ── */}
      <div
        style={{
          background: "var(--card, #FFFFFF)",
          border: "1.5px solid var(--ink, #0A0A0A)",
          boxShadow: "3.5px 3.5px 0 var(--ink, #0A0A0A)",
          padding: "24px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          borderRadius: "3px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "10.5px",
              fontWeight: 800,
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
            ${netWorth.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "11px", fontWeight: 700, color: "#666666", marginTop: "4px" }}>
            Total Assets: <b>${netWorth.totalAssets.toLocaleString()}</b> | Total Debt Liabilities: <b>${netWorth.totalLiabilities.toLocaleString()}</b>
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
            border: "1.5px solid var(--ink, #0A0A0A)",
            boxShadow: "3px 3px 0 var(--ink, #0A0A0A)",
            padding: "18px 20px",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 800, marginBottom: "10px", textTransform: "uppercase" }}>
            ASSET ALLOCATION BREAKDOWN
          </div>

          <div
            style={{
              display: "flex",
              height: "18px",
              border: "1.5px solid var(--ink, #0A0A0A)",
              overflow: "hidden",
              borderRadius: "2px",
              marginBottom: "12px",
            }}
          >
            {netWorth.totalLiquidCash > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalLiquidCash / netWorth.totalAssets) * 100}%`,
                  background: "#00F0FF",
                  borderRight: "1px solid #000000",
                }}
                title={`Liquid Cash: $${netWorth.totalLiquidCash.toLocaleString()}`}
              />
            )}
            {netWorth.totalInvestments > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalInvestments / netWorth.totalAssets) * 100}%`,
                  background: "#FFE600",
                  borderRight: "1px solid #000000",
                }}
                title={`Investments: $${netWorth.totalInvestments.toLocaleString()}`}
              />
            )}
            {netWorth.totalRetirement > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalRetirement / netWorth.totalAssets) * 100}%`,
                  background: "#C084FC",
                  borderRight: "1px solid #000000",
                }}
                title={`Retirement: $${netWorth.totalRetirement.toLocaleString()}`}
              />
            )}
            {netWorth.totalRealEstate > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalRealEstate / netWorth.totalAssets) * 100}%`,
                  background: "#34D399",
                  borderRight: "1px solid #000000",
                }}
                title={`Real Estate: $${netWorth.totalRealEstate.toLocaleString()}`}
              />
            )}
            {netWorth.totalCrypto > 0 && (
              <div
                style={{
                  width: `${(netWorth.totalCrypto / netWorth.totalAssets) * 100}%`,
                  background: "#FF2E93",
                }}
                title={`Crypto: $${netWorth.totalCrypto.toLocaleString()}`}
              />
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontFamily: "var(--mono, monospace)", fontSize: "10.5px", fontWeight: 700 }}>
            <span>🔵 Liquid Cash: ${netWorth.totalLiquidCash.toLocaleString()} ({pct(netWorth.totalLiquidCash, netWorth.totalAssets)}%)</span>
            <span>🟡 Investments: ${netWorth.totalInvestments.toLocaleString()} ({pct(netWorth.totalInvestments, netWorth.totalAssets)}%)</span>
            <span>🟣 Retirement: ${netWorth.totalRetirement.toLocaleString()} ({pct(netWorth.totalRetirement, netWorth.totalAssets)}%)</span>
            <span>🟢 Real Estate: ${netWorth.totalRealEstate.toLocaleString()} ({pct(netWorth.totalRealEstate, netWorth.totalAssets)}%)</span>
            <span>🔴 Crypto: ${netWorth.totalCrypto.toLocaleString()} ({pct(netWorth.totalCrypto, netWorth.totalAssets)}%)</span>
          </div>
        </div>
      )}

      {/* ── ASSETS REGISTER ── */}
      {assets.length === 0 ? (
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            border: "1.5px dashed var(--ink, #0A0A0A)",
            padding: "40px 20px",
            textAlign: "center",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontFamily: "var(--display, sans-serif)", fontSize: "18px", fontWeight: 900, marginBottom: "6px" }}>
            NO ASSETS RECORDED
          </div>
          <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "12px", color: "#666666", marginBottom: "16px" }}>
            Record savings accounts, brokerage holdings, 401(k), or home equity to calculate net worth.
          </div>
          <button type="button" className="btn-ledger btn-ledger-primary" onClick={onAddAsset}>
            + ADD FIRST ASSET
          </button>
        </div>
      ) : (
        <div className="sub-grid">
          {assets.map((asset) => {
            const cat = (asset.category as AssetCategory) || "OTHER";
            const theme = ASSET_THEMES[cat] || ASSET_THEMES.OTHER;

            return (
              <div key={asset.id} className="sub-card-editorial">
                {/* Header */}
                <div className="sub-card-header">
                  <span
                    className="sub-card-category"
                    style={{
                      background: "var(--ink, #0A0A0A)",
                      color: "#FFFFFF",
                    }}
                  >
                    <span>{theme.icon}</span>
                    <span>{theme.label}</span>
                  </span>

                  {asset.expectedYield && (
                    <span
                      className="sub-card-status"
                      style={{
                        background: "#DCFCE7",
                        color: "#166534",
                        borderColor: "#16A34A",
                      }}
                    >
                      {asset.expectedYield}% APY
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="sub-card-body">
                  <div className="sub-card-title-row">
                    <h3 className="sub-card-title">{asset.name}</h3>
                    <span className="sub-card-price">
                      ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {asset.institution && (
                    <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "10.5px", color: "#555555" }}>
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
