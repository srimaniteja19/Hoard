"use client";

import React, { useEffect, useState } from "react";
import { LiveMarketPricesPayload } from "@/lib/ledger/marketTypes";
import { playSound } from "@/lib/sound";
import { Sparkles, Pin, Star } from "lucide-react";

interface MarketTickerTapeProps {
  onOpenOracle: () => void;
  marketData?: LiveMarketPricesPayload | null;
  pinnedIds?: string[];
}

const PINNED_STORAGE_KEY = "hoard_ledger_pinned_bulletin_items";

export const MarketTickerTape: React.FC<MarketTickerTapeProps> = ({
  onOpenOracle,
  marketData: initialData,
  pinnedIds: externalPinnedIds,
}) => {
  const [data, setData] = useState<LiveMarketPricesPayload | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [localPinnedIds, setLocalPinnedIds] = useState<string[]>(["GOLD_24K", "SILVER_999", "bitcoin", "ethereum"]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalPinnedIds(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const pinnedIds = externalPinnedIds || localPinnedIds;

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      return;
    }

    const fetchMarketData = async () => {
      try {
        const res = await fetch("/api/financial/market-prices");
        if (res.ok) {
          const json: LiveMarketPricesPayload = await res.json();
          setData(json);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [initialData]);

  if (!data) return null;

  const gold24k = data.metals.find((m) => m.id === "GOLD_24K");
  const silver = data.metals.find((m) => m.id === "SILVER_999");
  const platinum = data.metals.find((m) => m.id === "PLATINUM");
  const btc = data.crypto.find((c) => c.symbol === "BTC");
  const eth = data.crypto.find((c) => c.symbol === "ETH");
  const sol = data.crypto.find((c) => c.symbol === "SOL");
  const bnb = data.crypto.find((c) => c.symbol === "BNB");
  const xrp = data.crypto.find((c) => c.symbol === "XRP");
  const axisGold = data.investedFunds.find((f) => f.schemeCode === 120473);
  const quantSmallCap = data.investedFunds.find((f) => f.schemeCode === 120828);
  const rivn = data.stocks.find((s) => s.symbol === "RIVN");

  const allTickerItems = [
    {
      id: "GOLD_24K",
      label: "👑 24K GOLD",
      val: `₹${gold24k?.pricePerGramInr.toLocaleString()}/g · $${gold24k?.pricePerOzUsd.toLocaleString()}/oz`,
      change: gold24k?.change24hPct ?? 0.25,
      isPositive: (gold24k?.change24hPct ?? 0) >= 0,
    },
    {
      id: "SILVER_999",
      label: "🥈 SILVER 999",
      val: `₹${silver?.pricePerGramInr.toFixed(1)}/g · $${silver?.pricePerOzUsd.toFixed(2)}/oz`,
      change: silver?.change24hPct ?? 0.3,
      isPositive: (silver?.change24hPct ?? 0) >= 0,
    },
    {
      id: "PLATINUM",
      label: "💎 PLATINUM",
      val: `₹${platinum?.pricePerGramInr.toLocaleString()}/g · $${platinum?.pricePerOzUsd.toLocaleString()}/oz`,
      change: platinum?.change24hPct ?? 0.2,
      isPositive: (platinum?.change24hPct ?? 0) >= 0,
    },
    {
      id: "bitcoin",
      label: "₿ BTC",
      val: `$${btc?.priceUsd.toLocaleString()} · ₹${Math.round((btc?.priceInr || 0) / 100000).toFixed(1)}L`,
      change: btc?.change24hUsd ?? 0.58,
      isPositive: (btc?.change24hUsd ?? 0) >= 0,
    },
    {
      id: "ethereum",
      label: "Ξ ETH",
      val: `$${eth?.priceUsd.toLocaleString()} · ₹${Math.round(eth?.priceInr || 0).toLocaleString()}`,
      change: eth?.change24hUsd ?? 0.62,
      isPositive: (eth?.change24hUsd ?? 0) >= 0,
    },
    {
      id: "solana",
      label: "◎ SOL",
      val: `$${sol?.priceUsd.toFixed(2)} · ₹${Math.round(sol?.priceInr || 0).toLocaleString()}`,
      change: sol?.change24hUsd ?? 0.85,
      isPositive: (sol?.change24hUsd ?? 0) >= 0,
    },
    {
      id: "binancecoin",
      label: "🔶 BNB",
      val: `$${bnb?.priceUsd.toFixed(1)} · ₹${Math.round(bnb?.priceInr || 0).toLocaleString()}`,
      change: bnb?.change24hUsd ?? 0.49,
      isPositive: (bnb?.change24hUsd ?? 0) >= 0,
    },
    {
      id: "ripple",
      label: "✕ XRP",
      val: `$${xrp?.priceUsd.toFixed(2)} · ₹${xrp?.priceInr.toFixed(1)}`,
      change: xrp?.change24hUsd ?? 0.42,
      isPositive: (xrp?.change24hUsd ?? 0) >= 0,
    },
    {
      id: "mf-120473",
      label: "📈 AXIS GOLD NAV",
      val: `₹${axisGold?.navInr.toFixed(2)} ($${axisGold?.navUsd.toFixed(2)})`,
      change: axisGold?.change24hPct ?? 0.35,
      isPositive: true,
    },
    {
      id: "mf-120828",
      label: "📊 QUANT SMALL CAP",
      val: `₹${quantSmallCap?.navInr.toFixed(2)}`,
      change: quantSmallCap?.change24hPct ?? 1.15,
      isPositive: true,
    },
    {
      id: "stock-RIVN",
      label: "🚗 RIVN",
      val: `$${rivn?.priceUsd.toFixed(2)} (₹${Math.round(rivn?.priceInr || 0)})`,
      change: rivn?.change24hPct ?? -4.35,
      isPositive: (rivn?.change24hPct ?? 0) >= 0,
    },
  ];

  // Prioritize pinned items first
  const sortedTickerItems = [...allTickerItems].sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <div
      onClick={() => {
        playSound.click();
        onOpenOracle();
      }}
      style={{
        background: "#080808",
        color: "#FFFFFF",
        border: "2px solid #222222",
        boxShadow: "4px 4px 0 #000000",
        borderRadius: "4px",
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        transition: "border-color 0.15s ease",
      }}
      title="Click to launch Real-Time Live Market Oracle (Crypto · Metals · Funds)"
    >
      {/* Live Pulsating Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "var(--mono)",
          fontSize: "10px",
          fontWeight: 900,
          background: "#FFE600",
          color: "#0A0A0A",
          padding: "3px 8px",
          borderRadius: "2px",
          whiteSpace: "nowrap",
          zIndex: 2,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#16A34A",
            boxShadow: "0 0 6px #22C55E",
          }}
        />
        BULLETIN ORACLE
      </div>

      {/* Marquee Ticker Container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          whiteSpace: "nowrap",
          flex: 1,
          fontFamily: "var(--mono)",
          fontSize: "11px",
        }}
      >
        {sortedTickerItems.map((item, idx) => {
          const isPinned = pinnedIds.includes(item.id);

          return (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {isPinned && <span style={{ color: "#FFE600", fontSize: "10px" }}>★</span>}
              <span style={{ fontWeight: 800, color: isPinned ? "#FFE600" : "#E5E5E5" }}>{item.label}:</span>
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{item.val}</span>
              <span
                style={{
                  fontSize: "9.5px",
                  fontWeight: 900,
                  color: item.isPositive ? "#4ADE80" : "#F87171",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {item.isPositive ? "+" : ""}
                {item.change}%
              </span>
              {idx < sortedTickerItems.length - 1 && <span style={{ color: "#333333", marginLeft: "14px" }}>│</span>}
            </div>
          );
        })}
      </div>

      {/* Right Indicator */}
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "9.5px",
          fontWeight: 800,
          color: "#FFE600",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          whiteSpace: "nowrap",
          zIndex: 2,
        }}
      >
        <span>SEARCH &amp; PIN ↗</span>
      </div>
    </div>
  );
};
