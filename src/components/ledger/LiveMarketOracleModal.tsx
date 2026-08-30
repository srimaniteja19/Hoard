"use client";

import React, { useState, useEffect } from "react";
import {
  LiveMarketPricesPayload,
  LiveCryptoQuote,
  LiveMetalsQuote,
  LiveFundQuote,
  LiveStockQuote,
} from "@/lib/ledger/marketTypes";
import { FinancialInvestmentRow } from "@/lib/ledger/types";
import { formatCurrency, formatSignedCurrency } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Coins,
  ShieldCheck,
  Zap,
  Globe,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface LiveMarketOracleModalProps {
  isOpen: boolean;
  onClose: () => void;
  investments?: FinancialInvestmentRow[];
  inrRate?: number;
}

type OracleTab = "ALL" | "METALS" | "CRYPTO" | "FUNDS_STOCKS";
type CurrencyDisplayMode = "DUAL" | "INR" | "USD";

export const LiveMarketOracleModal: React.FC<LiveMarketOracleModalProps> = ({
  isOpen,
  onClose,
  investments = [],
  inrRate = 86.85,
}) => {
  const [data, setData] = useState<LiveMarketPricesPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<OracleTab>("ALL");
  const [displayMode, setDisplayMode] = useState<CurrencyDisplayMode>("DUAL");
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string | null>(null);

  const fetchLivePrices = async () => {
    try {
      setLoading(true);
      playSound.click();
      const res = await fetch("/api/financial/market-prices");
      if (res.ok) {
        const json: LiveMarketPricesPayload = await res.json();
        setData(json);
        setLastRefreshedTime(new Date().toLocaleTimeString());
        playSound.fileIt();
      }
    } catch (err) {
      console.error("Failed to fetch live market prices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !data) {
      fetchLivePrices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentRate = data?.fxRate || inrRate;
  const metals = data?.metals || [];
  const crypto = data?.crypto || [];
  const funds = data?.investedFunds || [];
  const stocks = data?.stocks || [];

  // Calculate physical gold & silver gram vault totals based on user's active investments
  const goldInvestment = investments.find((i) => i.assetType === "GOLD_PRECIOUS_METALS" || i.name.toLowerCase().includes("gold"));
  const gold24k = metals.find((m) => m.id === "GOLD_24K");
  const userGoldValuationInr = goldInvestment?.currentValuation || 0;
  const userEstimatedGoldGrams = gold24k?.pricePerGramInr
    ? Math.round((userGoldValuationInr / gold24k.pricePerGramInr) * 100) / 100
    : 0;

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div
        className="ledger-modal-box"
        style={{
          maxWidth: "920px",
          width: "95vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div
          className="ledger-modal-header"
          style={{
            padding: "16px 22px",
            background: "#0A0A0A",
            color: "#FFFFFF",
            borderBottom: "2px solid #000000",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#16A34A",
                boxShadow: "0 0 8px #22C55E",
              }}
            />
            <h2 style={{ color: "#FFFFFF", margin: 0, fontSize: "17px", letterSpacing: "0.04em" }}>
              LIVE REAL-TIME MARKET ORACLE &amp; SPOT TERMINAL
            </h2>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                fontWeight: 900,
                background: "#FFE600",
                color: "#0A0A0A",
                padding: "2px 6px",
                borderRadius: "2px",
              }}
            >
              1 USD = ₹{currentRate.toFixed(2)} INR
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              disabled={loading}
              className="btn-card-action"
              onClick={fetchLivePrices}
              style={{
                background: "#222222",
                color: "#FFFFFF",
                borderColor: "#444444",
                fontSize: "10.5px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Fetch latest spot rates from CoinGecko, MFAPI.in, and Yahoo Finance"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              {loading ? "SYNCING..." : "⚡ REFRESH"}
            </button>
            <button
              type="button"
              className="btn-card-action"
              onClick={onClose}
              style={{
                background: "#222222",
                color: "#FFFFFF",
                borderColor: "#444444",
                padding: "4px 8px",
              }}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── TOOLBAR / CONTROLS ── */}
        <div
          style={{
            padding: "12px 22px",
            background: "#F8FAFC",
            borderBottom: "1.5px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { id: "ALL", label: "🌐 ALL MARKETS" },
              { id: "METALS", label: "🪙 PRECIOUS METALS" },
              { id: "CRYPTO", label: "⚡ TOP 5 CRYPTO" },
              { id: "FUNDS_STOCKS", label: "📊 FUNDS & STOCKS" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as OracleTab);
                  playSound.click();
                }}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10.5px",
                  fontWeight: 900,
                  padding: "4px 10px",
                  background: activeTab === tab.id ? "#0A0A0A" : "#FFFFFF",
                  color: activeTab === tab.id ? "#FFE600" : "#444444",
                  border: "1.5px solid #0A0A0A",
                  borderRadius: "2px",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Currency Display Mode */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 800, color: "#666" }}>
              CURRENCY:
            </span>
            {[
              { id: "DUAL", label: "DUAL (USD + INR)" },
              { id: "INR", label: "₹ INR" },
              { id: "USD", label: "$ USD" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setDisplayMode(m.id as CurrencyDisplayMode);
                  playSound.click();
                }}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "10px",
                  fontWeight: 900,
                  padding: "3px 7px",
                  background: displayMode === m.id ? "#00F0FF" : "#FFFFFF",
                  color: "#0A0A0A",
                  border: "1px solid #0A0A0A",
                  borderRadius: "2px",
                  cursor: "pointer",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── SCROLLABLE ORACLE BODY ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: "22px" }}>
          
          {/* ── PHYSICAL GOLD & METALS VAULT HERO (if user holds gold) ── */}
          {userEstimatedGoldGrams > 0 && (
            <div
              style={{
                background: "#FEFCE8",
                border: "2px solid #CA8A04",
                boxShadow: "3.5px 3.5px 0 #CA8A04",
                padding: "16px 20px",
                borderRadius: "3px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, color: "#854D0E", textTransform: "uppercase" }}>
                  🏆 YOUR PHYSICAL BULLION ACCUMULATION
                </div>
                <div style={{ fontFamily: "var(--display)", fontSize: "24px", fontWeight: 900, color: "#A16207" }}>
                  {userEstimatedGoldGrams} Grams of 24K Pure Gold
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#713F12", marginTop: "2px" }}>
                  Accumulated via <b>{goldInvestment?.name}</b> · Valuation: <b>₹{userGoldValuationInr.toLocaleString()} INR (~${Math.round(userGoldValuationInr / currentRate).toLocaleString()} USD)</b>
                </div>
              </div>

              <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: "11px" }}>
                <div style={{ color: "#854D0E", fontWeight: 800 }}>LIVE 24K GRAM SPOT:</div>
                <b style={{ fontSize: "16px", color: "#0A0A0A" }}>₹{gold24k?.pricePerGramInr.toLocaleString()} / gram</b>
              </div>
            </div>
          )}

          {/* ── SECTION 1: PRECIOUS METALS VAULT ── */}
          {(activeTab === "ALL" || activeTab === "METALS") && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11.5px", fontWeight: 900, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Coins size={14} color="#CA8A04" />
                  PRECIOUS METALS SPOT VAULT (LIVE 24/7 SPOT)
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "#666" }}>
                  Units: Grams (g) · 10g · Troy Ounce (oz)
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                {metals.map((metal) => (
                  <div
                    key={metal.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1.5px solid #0A0A0A",
                      boxShadow: "2.5px 2.5px 0 #0A0A0A",
                      padding: "14px 16px",
                      borderRadius: "3px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "18px" }}>{metal.icon}</span>
                        <div>
                          <b style={{ fontFamily: "var(--display)", fontSize: "15px" }}>{metal.name}</b>
                          <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#666" }}>{metal.purity}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "9.5px",
                          fontWeight: 900,
                          color: metal.change24hPct >= 0 ? "#16A34A" : "#DC2626",
                        }}
                      >
                        {metal.change24hPct >= 0 ? "+" : ""}{metal.change24hPct}%
                      </span>
                    </div>

                    <div style={{ borderTop: "1px dotted #E2E8F0", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "4px", fontFamily: "var(--mono)", fontSize: "11px" }}>
                      {/* Price Per Gram */}
                      {(displayMode === "DUAL" || displayMode === "INR") && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#666" }}>Per Gram:</span>
                          <b style={{ color: "#0A0A0A" }}>₹{metal.pricePerGramInr.toLocaleString()}</b>
                        </div>
                      )}
                      {(displayMode === "DUAL" || displayMode === "USD") && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#555" }}>
                          <span>Per Gram (USD):</span>
                          <b>${metal.pricePerGramUsd.toFixed(2)}</b>
                        </div>
                      )}

                      {/* Price Per 10g in INR */}
                      {(displayMode === "DUAL" || displayMode === "INR") && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#166534" }}>
                          <span>Per 10 Grams:</span>
                          <b>₹{metal.pricePer10gInr.toLocaleString()}</b>
                        </div>
                      )}

                      {/* Price Per Troy Ounce */}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dotted #E2E8F0", paddingTop: "4px", marginTop: "2px" }}>
                        <span style={{ color: "#666" }}>Per Troy Oz:</span>
                        <b style={{ color: "#2563EB" }}>${metal.pricePerOzUsd.toLocaleString()}</b>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 2: TOP 5 CRYPTO POWERHOUSE ── */}
          {(activeTab === "ALL" || activeTab === "CRYPTO") && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11.5px", fontWeight: 900, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap size={14} color="#7C3AED" />
                  TOP 5 CRYPTOCURRENCIES (LIVE COINGECKO SPOT)
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "#666" }}>
                  Real-time USD &amp; INR conversions
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "10px" }}>
                {crypto.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1.5px solid #0A0A0A",
                      boxShadow: "2.5px 2.5px 0 #0A0A0A",
                      padding: "12px 14px",
                      borderRadius: "3px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "16px" }}>{c.icon}</span>
                        <div>
                          <b style={{ fontFamily: "var(--display)", fontSize: "14px" }}>{c.symbol}</b>
                          <div style={{ fontFamily: "var(--mono)", fontSize: "8.5px", color: "#777" }}>#{c.rank} {c.name}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "9.5px",
                          fontWeight: 900,
                          color: c.change24hUsd >= 0 ? "#16A34A" : "#DC2626",
                          background: c.change24hUsd >= 0 ? "#DCFCE7" : "#FEE2E2",
                          padding: "1px 5px",
                          borderRadius: "2px",
                        }}
                      >
                        {c.change24hUsd >= 0 ? "+" : ""}{c.change24hUsd}%
                      </span>
                    </div>

                    <div style={{ fontFamily: "var(--mono)", fontSize: "11px", marginTop: "4px" }}>
                      {(displayMode === "DUAL" || displayMode === "USD") && (
                        <div style={{ fontSize: "15px", fontWeight: 900, color: "#0A0A0A" }}>
                          ${c.priceUsd.toLocaleString(undefined, { minimumFractionDigits: c.priceUsd < 10 ? 2 : 0 })}
                        </div>
                      )}
                      {(displayMode === "DUAL" || displayMode === "INR") && (
                        <div style={{ fontSize: "11px", color: "#166534", fontWeight: 700 }}>
                          ₹{Math.round(c.priceInr).toLocaleString()} INR
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 3: INVESTED INDIAN MUTUAL FUNDS & US STOCKS ── */}
          {(activeTab === "ALL" || activeTab === "FUNDS_STOCKS") && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11.5px", fontWeight: 900, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                  <TrendingUp size={14} color="#2563EB" />
                  INVESTED MUTUAL FUNDS &amp; US STOCKS RADAR
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "#666" }}>
                  MFAPI.in &amp; Yahoo Finance Daily NAV Feeds
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                {/* Indian Mutual Funds */}
                {funds.map((f) => (
                  <div
                    key={f.schemeCode}
                    style={{
                      background: "#FFFFFF",
                      border: "1.5px solid #0A0A0A",
                      boxShadow: "2.5px 2.5px 0 #0A0A0A",
                      padding: "14px 16px",
                      borderRadius: "3px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "8.5px", fontWeight: 900, background: "#E0F2FE", color: "#0369A1", padding: "1px 5px", borderRadius: "2px" }}>
                          MUTUAL FUND SIP
                        </span>
                        <b style={{ display: "block", fontFamily: "var(--display)", fontSize: "14px", marginTop: "3px" }}>
                          {f.schemeName}
                        </b>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#666" }}>
                          {f.fundHouse} · Scheme #{f.schemeCode}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px dotted #E2E8F0", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#666" }}>LATEST NAV ({f.navDate}):</div>
                        <div style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 900, color: "#15803D" }}>
                          ₹{f.navInr.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: "10.5px", color: "#555" }}>
                        <div>USD Equiv: <b>${f.navUsd.toFixed(2)}</b></div>
                        <div style={{ color: "#16A34A", fontWeight: 800 }}>+{f.change24hPct}% (1D)</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* US Stocks (Rivian / VOO) */}
                {stocks.map((s) => (
                  <div
                    key={s.symbol}
                    style={{
                      background: "#FFFFFF",
                      border: "1.5px solid #0A0A0A",
                      boxShadow: "2.5px 2.5px 0 #0A0A0A",
                      padding: "14px 16px",
                      borderRadius: "3px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "8.5px", fontWeight: 900, background: "#FEF3C7", color: "#92400E", padding: "1px 5px", borderRadius: "2px" }}>
                          US EQUITIES
                        </span>
                        <b style={{ display: "block", fontFamily: "var(--display)", fontSize: "15px", marginTop: "3px" }}>
                          {s.symbol} · {s.name}
                        </b>
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "10px",
                          fontWeight: 900,
                          color: s.change24hPct >= 0 ? "#16A34A" : "#DC2626",
                        }}
                      >
                        {s.change24hPct >= 0 ? "+" : ""}{s.change24hPct}%
                      </span>
                    </div>

                    <div style={{ borderTop: "1px dotted #E2E8F0", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#666" }}>MARKET PRICE:</div>
                        <div style={{ fontFamily: "var(--display)", fontSize: "18px", fontWeight: 900, color: "#0A0A0A" }}>
                          ${s.priceUsd.toFixed(2)} USD
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: "10.5px" }}>
                        <div style={{ color: "#166534", fontWeight: 800 }}>₹{Math.round(s.priceInr).toLocaleString()} INR</div>
                        <div style={{ color: "#666", fontSize: "9.5px" }}>52W: ${s.fiftyTwoWeekLow.toFixed(0)} - ${s.fiftyTwoWeekHigh.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── MODAL FOOTER ── */}
        <div
          className="ledger-modal-footer"
          style={{
            padding: "12px 22px",
            background: "#FAFAFA",
            borderTop: "1.5px solid #0A0A0A",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#666" }}>
            Feed: <b>CoinGecko + MFAPI.in + Yahoo Finance</b> · Last Refreshed: <b>{lastRefreshedTime || data?.formattedDate || "Live"}</b>
          </div>
          <button
            type="button"
            className="btn-ledger btn-ledger-primary"
            onClick={onClose}
            style={{ fontSize: "11px" }}
          >
            CLOSE ORACLE
          </button>
        </div>
      </div>
    </div>
  );
};
