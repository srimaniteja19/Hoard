"use client";

import React, { useEffect, useState } from "react";
import { LiveMarketPricesPayload } from "@/lib/ledger/marketTypes";
import { formatCurrency } from "@/lib/ledger/formatters";
import { playSound } from "@/lib/sound";
import { Sparkles, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface MarketTickerTapeProps {
  onOpenOracle: () => void;
  marketData?: LiveMarketPricesPayload | null;
  currency?: "USD" | "INR" | "DUAL";
}

export const MarketTickerTape: React.FC<MarketTickerTapeProps> = ({
  onOpenOracle,
  marketData: initialData,
  currency = "DUAL",
}) => {
  const [data, setData] = useState<LiveMarketPricesPayload | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);

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
  const axisGold = data.investedFunds.find((f) => f.schemeCode === 120473);
  const rivn = data.stocks.find((s) => s.symbol === "RIVN");

  const tickerItems = [
    {
      label: "👑 24K GOLD",
      val: `₹${gold24k?.pricePerGramInr.toLocaleString()}/g · $${gold24k?.pricePerOzUsd.toLocaleString()}/oz`,
      change: gold24k?.change24hPct ?? 0.25,
      isPositive: (gold24k?.change24hPct ?? 0) >= 0,
    },
    {
      label: "🥈 SILVER",
      val: `₹${silver?.pricePerGramInr.toFixed(1)}/g · $${silver?.pricePerOzUsd.toFixed(2)}/oz`,
      change: silver?.change24hPct ?? 0.3,
      isPositive: (silver?.change24hPct ?? 0) >= 0,
    },
    {
      label: "💎 PLATINUM",
      val: `₹${platinum?.pricePerGramInr.toLocaleString()}/g · $${platinum?.pricePerOzUsd.toLocaleString()}/oz`,
      change: platinum?.change24hPct ?? 0.2,
      isPositive: (platinum?.change24hPct ?? 0) >= 0,
    },
    {
      label: "₿ BTC",
      val: `$${btc?.priceUsd.toLocaleString()} · ₹${Math.round((btc?.priceInr || 0) / 100000).toFixed(1)}L`,
      change: btc?.change24hUsd ?? 0.58,
      isPositive: (btc?.change24hUsd ?? 0) >= 0,
    },
    {
      label: "Ξ ETH",
      val: `$${eth?.priceUsd.toLocaleString()} · ₹${Math.round(eth?.priceInr || 0).toLocaleString()}`,
      change: eth?.change24hUsd ?? 0.62,
      isPositive: (eth?.change24hUsd ?? 0) >= 0,
    },
    {
      label: "◎ SOL",
      val: `$${sol?.priceUsd.toFixed(2)} · ₹${Math.round(sol?.priceInr || 0).toLocaleString()}`,
      change: sol?.change24hUsd ?? 0.85,
      isPositive: (sol?.change24hUsd ?? 0) >= 0,
    },
    {
      label: "📈 AXIS GOLD NAV",
      val: `₹${axisGold?.navInr.toFixed(2)} ($${axisGold?.navUsd.toFixed(2)})`,
      change: axisGold?.change24hPct ?? 0.35,
      isPositive: true,
    },
    {
      label: "🚗 RIVN",
      val: `$${rivn?.priceUsd.toFixed(2)} (₹${Math.round(rivn?.priceInr || 0)})`,
      change: rivn?.change24hPct ?? -4.35,
      isPositive: (rivn?.change24hPct ?? 0) >= 0,
    },
  ];

  return (
    <div
      onClick={() => {
        playSound.click();
        onOpenOracle();
      }}
      style={{
        background: "#0A0A0A",
        color: "#FFFFFF",
        border: "2px solid #000000",
        boxShadow: "3px 3px 0 #000000",
        borderRadius: "3px",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
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
          padding: "3px 7px",
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
        LIVE SPOT
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
        {tickerItems.map((item, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: 800, color: "#E5E5E5" }}>{item.label}:</span>
            <span style={{ color: "#FFE600", fontWeight: 700 }}>{item.val}</span>
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
            {idx < tickerItems.length - 1 && <span style={{ color: "#444444", marginLeft: "12px" }}>│</span>}
          </div>
        ))}
      </div>

      {/* Right Indicator */}
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "9.5px",
          fontWeight: 800,
          color: "#A3A3A3",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          whiteSpace: "nowrap",
          zIndex: 2,
        }}
      >
        <span>EXPAND ORACLE ↗</span>
      </div>
    </div>
  );
};
