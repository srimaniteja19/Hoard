"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Search,
  Pin,
  PinOff,
  Plus,
  Check,
  Flame,
  Star,
  ExternalLink,
} from "lucide-react";

interface LiveMarketOracleModalProps {
  isOpen: boolean;
  onClose: () => void;
  investments?: FinancialInvestmentRow[];
  inrRate?: number;
  onAddAsAsset?: (name: string, price: number, currency: string, category: string) => void;
  onAddAsInvestment?: (name: string, amount: number, currency: string, assetType: string) => void;
  onPinnedChange?: (pinnedIds: string[]) => void;
}

type OracleTab = "ALL" | "PINNED" | "METALS" | "CRYPTO" | "FUNDS_STOCKS";
type CurrencyDisplayMode = "DUAL" | "INR" | "USD";

const PINNED_STORAGE_KEY = "hoard_ledger_pinned_bulletin_items";

export const LiveMarketOracleModal: React.FC<LiveMarketOracleModalProps> = ({
  isOpen,
  onClose,
  investments = [],
  inrRate = 86.85,
  onAddAsAsset,
  onAddAsInvestment,
  onPinnedChange,
}) => {
  const [data, setData] = useState<LiveMarketPricesPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<OracleTab>("ALL");
  const [displayMode, setDisplayMode] = useState<CurrencyDisplayMode>("DUAL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingRemote, setSearchingRemote] = useState(false);
  const [remoteSearchResults, setRemoteSearchResults] = useState<{ funds: LiveFundQuote[]; stocks: LiveStockQuote[] }>({ funds: [], stocks: [] });
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>(["GOLD_24K", "SILVER_999", "bitcoin", "ethereum"]);

  // Load pinned items from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPinnedIds(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const togglePin = (id: string) => {
    playSound.click();
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (onPinnedChange) {
        onPinnedChange(next);
      }
      return next;
    });
  };

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

  // Debounced search for on-the-fly Indian Mutual Funds or US Stock tickers
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setRemoteSearchResults({ funds: [], stocks: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingRemote(true);
        const res = await fetch(`/api/financial/market-search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const results = await res.json();
          setRemoteSearchResults(results);
        }
      } catch {
        // ignore
      } finally {
        setSearchingRemote(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen && !data) {
      fetchLivePrices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentRate = data?.fxRate || inrRate;
  const metals = data?.metals || [];
  const crypto = data?.crypto || [];
  const funds = [...(data?.investedFunds || []), ...(remoteSearchResults.funds || [])];
  const stocks = [...(data?.stocks || []), ...(remoteSearchResults.stocks || [])];

  // De-duplicate funds by schemeCode
  const uniqueFunds = Array.from(new Map(funds.map((f) => [f.schemeCode, f])).values());
  // De-duplicate stocks by symbol
  const uniqueStocks = Array.from(new Map(stocks.map((s) => [s.symbol, s])).values());

  // Filter items by search query
  const query = searchQuery.trim().toLowerCase();

  const filteredMetals = metals.filter(
    (m) =>
      m.name.toLowerCase().includes(query) ||
      m.purity.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query)
  );

  const filteredCrypto = crypto.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.symbol.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query)
  );

  const filteredFunds = uniqueFunds.filter(
    (f) =>
      f.schemeName.toLowerCase().includes(query) ||
      f.fundHouse.toLowerCase().includes(query) ||
      String(f.schemeCode).includes(query)
  );

  const filteredStocks = uniqueStocks.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.symbol.toLowerCase().includes(query)
  );

  // User's physical gold calculation
  const goldInvestment = investments.find((i) => i.assetType === "GOLD_PRECIOUS_METALS" || i.name.toLowerCase().includes("gold"));
  const gold24k = metals.find((m) => m.id === "GOLD_24K");
  const userGoldValuationInr = goldInvestment?.currentValuation || 0;
  const userEstimatedGoldGrams = gold24k?.pricePerGramInr
    ? Math.round((userGoldValuationInr / gold24k.pricePerGramInr) * 100) / 100
    : 0;

  const totalResultsCount = filteredMetals.length + filteredCrypto.length + filteredFunds.length + filteredStocks.length;

  return (
    <div className="ledger-modal-overlay" onClick={onClose}>
      <div
        className="ledger-modal-box"
        style={{
          maxWidth: "960px",
          width: "96vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          overflow: "hidden",
          background: "#080808",
          border: "2px solid #FFE600",
          boxShadow: "6px 6px 0 #000000, 0 0 30px rgba(255, 230, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: "16px 24px",
            background: "linear-gradient(180deg, #141414 0%, #0A0A0A 100%)",
            color: "#FFFFFF",
            borderBottom: "2px solid #222222",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-block",
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: "#00F0FF",
                boxShadow: "0 0 12px #00F0FF",
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ color: "#FFFFFF", margin: 0, fontSize: "17px", letterSpacing: "0.06em", fontFamily: "var(--display)" }}>
                  LIVE REAL-TIME MARKET ORACLE &amp; BULLETIN
                </h2>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "9.5px",
                    fontWeight: 900,
                    background: "#FFE600",
                    color: "#0A0A0A",
                    padding: "2px 6px",
                    borderRadius: "2px",
                  }}
                >
                  INSTITUTIONAL SPOT
                </span>
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#A3A3A3", marginTop: "2px" }}>
                Live FX: <b>1 USD = ₹{currentRate.toFixed(2)} INR</b> · Real-time feeds from CoinGecko, MFAPI.in, &amp; Yahoo Finance
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              disabled={loading}
              className="btn-card-action"
              onClick={fetchLivePrices}
              style={{
                background: "#1C1C1C",
                color: "#FFE600",
                borderColor: "#333333",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
              }}
              title="Sync latest live quotes"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "SYNCING..." : "⚡ REFRESH"}
            </button>
            <button
              type="button"
              className="btn-card-action"
              onClick={onClose}
              style={{
                background: "#1C1C1C",
                color: "#FFFFFF",
                borderColor: "#333333",
                padding: "6px 10px",
                fontSize: "13px",
              }}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── SEARCH & FILTER TOOLBAR ── */}
        <div
          style={{
            padding: "14px 24px",
            background: "#111111",
            borderBottom: "1.5px solid #222222",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Real-Time Search Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
            <div
              style={{
                flex: 1,
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                size={16}
                color="#FFE600"
                style={{ position: "absolute", left: "14px", pointerEvents: "none" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Gold, Silver, BTC, Solana, mutual fund schemes (e.g. Axis, Quant, Parag Parikh), or stock ticker (NVDA, TSLA)..."
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 40px",
                  background: "#181818",
                  color: "#FFFFFF",
                  border: "1.5px solid #333333",
                  borderRadius: "4px",
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  outline: "none",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    background: "none",
                    border: "none",
                    color: "#A3A3A3",
                    cursor: "pointer",
                    fontFamily: "var(--mono)",
                    fontSize: "12px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Currency Mode Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {[
                { id: "DUAL", label: "🪙 DUAL (USD+INR)" },
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
                    padding: "6px 10px",
                    background: displayMode === m.id ? "#00F0FF" : "#1C1C1C",
                    color: displayMode === m.id ? "#0A0A0A" : "#FFFFFF",
                    border: `1px solid ${displayMode === m.id ? "#00F0FF" : "#333333"}`,
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Tabs & Pinned Counter */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { id: "ALL", label: `🌐 ALL (${totalResultsCount})` },
                { id: "PINNED", label: `⭐ BULLETIN WATCHLIST (${pinnedIds.length})` },
                { id: "METALS", label: `🪙 PRECIOUS METALS (${filteredMetals.length})` },
                { id: "CRYPTO", label: `⚡ TOP 5 CRYPTO (${filteredCrypto.length})` },
                { id: "FUNDS_STOCKS", label: `📊 FUNDS & STOCKS (${filteredFunds.length + filteredStocks.length})` },
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
                    background: activeTab === tab.id ? "#FFE600" : "#181818",
                    color: activeTab === tab.id ? "#0A0A0A" : "#A3A3A3",
                    border: `1.5px solid ${activeTab === tab.id ? "#FFE600" : "#2E2E2E"}`,
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {searchingRemote && (
              <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#FFE600", display: "flex", alignItems: "center", gap: "4px" }}>
                <RefreshCw size={10} className="animate-spin" /> Searching global registries...
              </span>
            )}
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "22px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* ── PHYSICAL GOLD & METALS VAULT HERO (if user holds gold) ── */}
          {userEstimatedGoldGrams > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #1C1917 0%, #292524 100%)",
                border: "2px solid #D97706",
                boxShadow: "0 0 20px rgba(217, 119, 6, 0.2)",
                padding: "18px 22px",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 900, color: "#FBBF24", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  👑 YOUR PHYSICAL VAULT ACCUMULATION
                </div>
                <div style={{ fontFamily: "var(--display)", fontSize: "26px", fontWeight: 900, color: "#FFE600" }}>
                  {userEstimatedGoldGrams} Grams of 24K Pure Gold
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "11.5px", color: "#E7E5E4", marginTop: "2px" }}>
                  Holdings in <b>{goldInvestment?.name}</b> · Live Valuation: <b style={{ color: "#4ADE80" }}>₹{userGoldValuationInr.toLocaleString()} INR (~${Math.round(userGoldValuationInr / currentRate).toLocaleString()} USD)</b>
                </div>
              </div>

              <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: "11px" }}>
                <div style={{ color: "#FBBF24", fontWeight: 800 }}>LIVE 24K SPOT RATE:</div>
                <b style={{ fontSize: "18px", color: "#FFFFFF" }}>₹{gold24k?.pricePerGramInr.toLocaleString()} / gram</b>
                <div style={{ color: "#A8A29E", fontSize: "10px" }}>${gold24k?.pricePerOzUsd.toLocaleString()}/troy oz</div>
              </div>
            </div>
          )}

          {/* ── SECTION 1: PRECIOUS METALS VAULT ── */}
          {(activeTab === "ALL" || activeTab === "METALS" || activeTab === "PINNED") && filteredMetals.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", color: "#FFE600", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Coins size={15} color="#FFE600" />
                  PRECIOUS METALS MINTED VAULT (24/7 SPOT)
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#888888" }}>
                  Troy Ounce (31.1g) · Gram (g) · 10g
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "14px" }}>
                {filteredMetals
                  .filter((m) => activeTab !== "PINNED" || pinnedIds.includes(m.id))
                  .map((metal) => {
                    const isPinned = pinnedIds.includes(metal.id);

                    return (
                      <div
                        key={metal.id}
                        style={{
                          background: "#141414",
                          border: `1.5px solid ${isPinned ? "#FFE600" : "#282828"}`,
                          boxShadow: isPinned ? "0 0 15px rgba(255, 230, 0, 0.15)" : "none",
                          padding: "16px",
                          borderRadius: "4px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "10px",
                          position: "relative",
                        }}
                      >
                        {/* Top Meta */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "22px" }}>{metal.icon}</span>
                            <div>
                              <b style={{ fontFamily: "var(--display)", fontSize: "16px", color: "#FFFFFF" }}>{metal.name}</b>
                              <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#888888" }}>{metal.purity}</div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <button
                              type="button"
                              onClick={() => togglePin(metal.id)}
                              style={{
                                background: isPinned ? "#FFE600" : "#222222",
                                color: isPinned ? "#0A0A0A" : "#888888",
                                border: "none",
                                borderRadius: "2px",
                                padding: "3px 6px",
                                cursor: "pointer",
                                fontSize: "10px",
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                              title={isPinned ? "Unpin from Bulletin Ticker" : "Pin to Bulletin Ticker"}
                            >
                              <Pin size={10} />
                              {isPinned ? "PINNED" : "PIN"}
                            </button>
                          </div>
                        </div>

                        {/* Price Details */}
                        <div style={{ borderTop: "1px solid #222222", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "5px", fontFamily: "var(--mono)", fontSize: "11.5px" }}>
                          {(displayMode === "DUAL" || displayMode === "INR") && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#888888" }}>Per Gram:</span>
                              <b style={{ color: "#FFE600", fontSize: "13px" }}>₹{metal.pricePerGramInr.toLocaleString()}</b>
                            </div>
                          )}
                          {(displayMode === "DUAL" || displayMode === "USD") && (
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#CCCCCC" }}>
                              <span>Per Gram (USD):</span>
                              <b>${metal.pricePerGramUsd.toFixed(2)}</b>
                            </div>
                          )}
                          {(displayMode === "DUAL" || displayMode === "INR") && (
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#4ADE80" }}>
                              <span>Per 10 Grams:</span>
                              <b>₹{metal.pricePer10gInr.toLocaleString()}</b>
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dotted #282828", paddingTop: "5px", marginTop: "2px", color: "#00F0FF" }}>
                            <span>Per Troy Oz:</span>
                            <b>${metal.pricePerOzUsd.toLocaleString()}</b>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── SECTION 2: TOP 5 CRYPTO POWERHOUSE ── */}
          {(activeTab === "ALL" || activeTab === "CRYPTO" || activeTab === "PINNED") && filteredCrypto.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", color: "#00F0FF", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Zap size={15} color="#00F0FF" />
                  TOP 5 CRYPTO POWERHOUSE (COINGECKO SPOT)
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#888888" }}>
                  Live USD &amp; INR Exchange Rates
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "12px" }}>
                {filteredCrypto
                  .filter((c) => activeTab !== "PINNED" || pinnedIds.includes(c.id))
                  .map((c) => {
                    const isPinned = pinnedIds.includes(c.id);

                    return (
                      <div
                        key={c.id}
                        style={{
                          background: "#141414",
                          border: `1.5px solid ${isPinned ? "#00F0FF" : "#282828"}`,
                          boxShadow: isPinned ? "0 0 15px rgba(0, 240, 255, 0.15)" : "none",
                          padding: "14px 16px",
                          borderRadius: "4px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "18px" }}>{c.icon}</span>
                            <div>
                              <b style={{ fontFamily: "var(--display)", fontSize: "15px", color: "#FFFFFF" }}>{c.symbol}</b>
                              <div style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "#888888" }}>#{c.rank} {c.name}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => togglePin(c.id)}
                            style={{
                              background: isPinned ? "#00F0FF" : "#222222",
                              color: isPinned ? "#0A0A0A" : "#888888",
                              border: "none",
                              borderRadius: "2px",
                              padding: "2px 5px",
                              cursor: "pointer",
                              fontSize: "9.5px",
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                            title={isPinned ? "Unpin from Bulletin Ticker" : "Pin to Bulletin Ticker"}
                          >
                            <Pin size={9} />
                            {isPinned ? "PINNED" : "PIN"}
                          </button>
                        </div>

                        <div style={{ fontFamily: "var(--mono)", marginTop: "4px" }}>
                          {(displayMode === "DUAL" || displayMode === "USD") && (
                            <div style={{ fontSize: "16px", fontWeight: 900, color: "#FFFFFF" }}>
                              ${c.priceUsd.toLocaleString(undefined, { minimumFractionDigits: c.priceUsd < 10 ? 2 : 0 })}
                            </div>
                          )}
                          {(displayMode === "DUAL" || displayMode === "INR") && (
                            <div style={{ fontSize: "11.5px", color: "#4ADE80", fontWeight: 700, marginTop: "2px" }}>
                              ₹{Math.round(c.priceInr).toLocaleString()} INR
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #222222", paddingTop: "6px" }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#888888" }}>24h Delta:</span>
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "10px",
                              fontWeight: 900,
                              color: c.change24hUsd >= 0 ? "#4ADE80" : "#F87171",
                              background: c.change24hUsd >= 0 ? "rgba(74, 222, 128, 0.15)" : "rgba(248, 113, 113, 0.15)",
                              padding: "1px 6px",
                              borderRadius: "2px",
                            }}
                          >
                            {c.change24hUsd >= 0 ? "+" : ""}{c.change24hUsd}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── SECTION 3: INVESTED INDIAN MUTUAL FUNDS & US STOCKS ── */}
          {(activeTab === "ALL" || activeTab === "FUNDS_STOCKS" || activeTab === "PINNED") && (filteredFunds.length > 0 || filteredStocks.length > 0) && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", color: "#C084FC", display: "flex", alignItems: "center", gap: "6px" }}>
                  <TrendingUp size={15} color="#C084FC" />
                  INVESTED MUTUAL FUNDS &amp; US STOCKS RADAR
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10.5px", color: "#888888" }}>
                  MFAPI.in Live NAVs &amp; Yahoo Finance
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                {/* Indian Mutual Funds */}
                {filteredFunds
                  .filter((f) => activeTab !== "PINNED" || pinnedIds.includes(`mf-${f.schemeCode}`))
                  .map((f) => {
                    const isPinned = pinnedIds.includes(`mf-${f.schemeCode}`);

                    return (
                      <div
                        key={f.schemeCode}
                        style={{
                          background: "#141414",
                          border: `1.5px solid ${isPinned ? "#C084FC" : "#282828"}`,
                          boxShadow: isPinned ? "0 0 15px rgba(192, 132, 252, 0.15)" : "none",
                          padding: "16px",
                          borderRadius: "4px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span style={{ fontFamily: "var(--mono)", fontSize: "9px", fontWeight: 900, background: "#3B0764", color: "#E9D5FF", padding: "2px 6px", borderRadius: "2px" }}>
                              MUTUAL FUND SIP
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePin(`mf-${f.schemeCode}`)}
                              style={{
                                background: isPinned ? "#C084FC" : "#222222",
                                color: isPinned ? "#0A0A0A" : "#888888",
                                border: "none",
                                borderRadius: "2px",
                                padding: "2px 5px",
                                cursor: "pointer",
                                fontSize: "9.5px",
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                              title={isPinned ? "Unpin from Bulletin Ticker" : "Pin to Bulletin Ticker"}
                            >
                              <Pin size={9} />
                              {isPinned ? "PINNED" : "PIN"}
                            </button>
                          </div>

                          <b style={{ display: "block", fontFamily: "var(--display)", fontSize: "15px", color: "#FFFFFF", marginTop: "6px" }}>
                            {f.schemeName}
                          </b>
                          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", color: "#888888" }}>
                            {f.fundHouse} · Scheme #{f.schemeCode}
                          </div>
                        </div>

                        <div style={{ borderTop: "1px solid #222222", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#888888" }}>LATEST NAV ({f.navDate}):</div>
                            <div style={{ fontFamily: "var(--display)", fontSize: "20px", fontWeight: 900, color: "#4ADE80" }}>
                              ₹{f.navInr.toFixed(2)}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: "11px", color: "#A3A3A3" }}>
                            <div>USD Equiv: <b>${f.navUsd.toFixed(2)}</b></div>
                            <div style={{ color: "#4ADE80", fontWeight: 800 }}>+{f.change24hPct}% (1D)</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* US Stocks (Rivian / VOO) */}
                {filteredStocks
                  .filter((s) => activeTab !== "PINNED" || pinnedIds.includes(`stock-${s.symbol}`))
                  .map((s) => {
                    const isPinned = pinnedIds.includes(`stock-${s.symbol}`);

                    return (
                      <div
                        key={s.symbol}
                        style={{
                          background: "#141414",
                          border: `1.5px solid ${isPinned ? "#FFE600" : "#282828"}`,
                          boxShadow: isPinned ? "0 0 15px rgba(255, 230, 0, 0.15)" : "none",
                          padding: "16px",
                          borderRadius: "4px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span style={{ fontFamily: "var(--mono)", fontSize: "9px", fontWeight: 900, background: "#713F12", color: "#FEF08A", padding: "2px 6px", borderRadius: "2px" }}>
                              US EQUITIES
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePin(`stock-${s.symbol}`)}
                              style={{
                                background: isPinned ? "#FFE600" : "#222222",
                                color: isPinned ? "#0A0A0A" : "#888888",
                                border: "none",
                                borderRadius: "2px",
                                padding: "2px 5px",
                                cursor: "pointer",
                                fontSize: "9.5px",
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                              title={isPinned ? "Unpin from Bulletin Ticker" : "Pin to Bulletin Ticker"}
                            >
                              <Pin size={9} />
                              {isPinned ? "PINNED" : "PIN"}
                            </button>
                          </div>

                          <b style={{ display: "block", fontFamily: "var(--display)", fontSize: "16px", color: "#FFFFFF", marginTop: "6px" }}>
                            {s.symbol} · {s.name}
                          </b>
                        </div>

                        <div style={{ borderTop: "1px solid #222222", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: "9.5px", color: "#888888" }}>MARKET PRICE:</div>
                            <div style={{ fontFamily: "var(--display)", fontSize: "20px", fontWeight: 900, color: "#FFFFFF" }}>
                              ${s.priceUsd.toFixed(2)} USD
                            </div>
                          </div>
                          <div style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: "11px" }}>
                            <div style={{ color: "#4ADE80", fontWeight: 800 }}>₹{Math.round(s.priceInr).toLocaleString()} INR</div>
                            <div style={{ color: s.change24hPct >= 0 ? "#4ADE80" : "#F87171", fontWeight: 800 }}>
                              {s.change24hPct >= 0 ? "+" : ""}{s.change24hPct}% (1D)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* No results message */}
          {totalResultsCount === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#888888", fontFamily: "var(--mono)" }}>
              <Search size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <div style={{ fontSize: "14px", color: "#FFFFFF", fontWeight: 800 }}>No matching assets or funds found</div>
              <div style={{ fontSize: "11px", marginTop: "4px" }}>
                Try searching for a mutual fund name (e.g. &quot;Axis&quot;, &quot;Quant&quot;, &quot;HDFC&quot;) or stock ticker (&quot;TSLA&quot;, &quot;NVDA&quot;).
              </div>
            </div>
          )}

        </div>

        {/* ── MODAL FOOTER ── */}
        <div
          style={{
            padding: "14px 24px",
            background: "#0F0F0F",
            borderTop: "1.5px solid #222222",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#888888" }}>
            ⭐ <b>{pinnedIds.length}</b> Items Pinned to Bulletin · Refreshed: <b>{lastRefreshedTime || data?.formattedDate || "Live"}</b>
          </div>
          <button
            type="button"
            className="btn-ledger btn-ledger-primary"
            onClick={onClose}
            style={{ fontSize: "11px", background: "#FFE600", color: "#0A0A0A", border: "1.5px solid #000000" }}
          >
            CLOSE ORACLE TERMINAL
          </button>
        </div>
      </div>
    </div>
  );
};
