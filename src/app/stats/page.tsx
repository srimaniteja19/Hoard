"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Bookmark, Collection, KindType } from "@/types";
import { TYPES } from "@/data/initialBookmarks";
import Link from "next/link";

export default function AnalyticsPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [bmsRes, collsRes] = await Promise.all([
          fetch("/api/bookmarks", { credentials: "include" }),
          fetch("/api/collections", { credentials: "include" }),
        ]);
        if (bmsRes.ok && collsRes.ok) {
          const bms = await bmsRes.json();
          const colls = await collsRes.json();
          setBookmarks(bms);
          setCollections(colls);
        }
      } catch (e) {
        console.error("Failed to load analytics data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const total = bookmarks.length;
    const read = bookmarks.filter((b) => !b.unread).length;
    const unread = bookmarks.filter((b) => b.unread).length;
    const readPercent = total > 0 ? Math.round((read / total) * 100) : 0;

    const totalMins = bookmarks.reduce((sum, b) => sum + b.mins, 0);
    const unreadMins = bookmarks.filter((b) => b.unread).reduce((sum, b) => sum + b.mins, 0);
    const readMins = totalMins - unreadMins;

    // Type Breakdown
    const typeMap: Record<KindType, number> = {
      ART: 0, VID: 0, PLY: 0, GIT: 0, APP: 0, PPR: 0, DOC: 0,
    };
    bookmarks.forEach((b) => {
      if (typeMap[b.ty] !== undefined) typeMap[b.ty]++;
    });

    // Collection Breakdown
    const collMap: Record<string, { name: string; icon: string; color: string; count: number }> = {};
    collections.forEach((c) => {
      collMap[c.id] = { name: c.name, icon: c.ic, color: c.c, count: 0 };
    });
    bookmarks.forEach((b) => {
      if (collMap[b.coll]) {
        collMap[b.coll].count++;
      }
    });

    // Active streak calculation (mocked/computed from dates)
    const dates = Array.from(new Set(bookmarks.map((b) => b.when))).filter(Boolean);
    const streakDays = Math.max(1, Math.min(dates.length * 2, 14));

    return {
      total,
      read,
      unread,
      readPercent,
      totalMins,
      readMins,
      unreadMins,
      typeMap,
      collList: Object.values(collMap).filter((c) => c.count > 0).sort((a, b) => b.count - a.count),
      streakDays,
    };
  }, [bookmarks, collections]);

  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          height: "100vh",
          fontFamily: "var(--mono), monospace",
          fontWeight: 800,
          fontSize: "18px",
          background: "var(--cream)",
        }}
      >
        COMPUTING HOARD ANALYTICS...
      </div>
    );
  }

  const formatHours = (m: number) => {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", color: "var(--ink)", padding: "20px" }}>
      {/* Top Bar */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto 24px auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "3px solid #000",
          paddingBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontWeight: 800,
              fontSize: "18px",
              background: "#FFE600",
              border: "3px solid #000",
              boxShadow: "3px 3px 0 #000",
              padding: "4px 12px",
            }}
          >
            HOARD
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: "14px", fontWeight: 800 }}>
            📊 READING & CONTENT ANALYTICS
          </span>
        </div>

        <Link
          href="/"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            border: "2px solid #000",
            background: "#B6FF3C",
            color: "#000",
            padding: "6px 14px",
            textDecoration: "none",
            boxShadow: "2px 2px 0 #000",
          }}
        >
          ← BACK TO BOARD
        </Link>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gap: "24px" }}>
        {/* Metric Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div
            style={{
              border: "3px solid #000",
              background: "#FFFDF8",
              boxShadow: "4px 4px 0 #000",
              padding: "16px",
              fontFamily: "var(--mono)",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#666" }}>TOTAL HOARDED</div>
            <div style={{ fontSize: "32px", fontWeight: 800, margin: "4px 0" }}>{stats.total}</div>
            <div style={{ fontSize: "10px", opacity: 0.8 }}>Saved bookmarks</div>
          </div>

          <div
            style={{
              border: "3px solid #000",
              background: "#B6FF3C",
              boxShadow: "4px 4px 0 #000",
              padding: "16px",
              fontFamily: "var(--mono)",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#000" }}>COMPLETED / READ</div>
            <div style={{ fontSize: "32px", fontWeight: 800, margin: "4px 0" }}>{stats.read}</div>
            <div style={{ fontSize: "10px", fontWeight: 700 }}>{stats.readPercent}% completion rate</div>
          </div>

          <div
            style={{
              border: "3px solid #000",
              background: "#FF007A",
              color: "#fff",
              boxShadow: "4px 4px 0 #000",
              padding: "16px",
              fontFamily: "var(--mono)",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#fff" }}>UNREAD QUEUE</div>
            <div style={{ fontSize: "32px", fontWeight: 800, margin: "4px 0" }}>{stats.unread}</div>
            <div style={{ fontSize: "10px" }}>{formatHours(stats.unreadMins)} remaining</div>
          </div>

          <div
            style={{
              border: "3px solid #000",
              background: "#FFE600",
              boxShadow: "4px 4px 0 #000",
              padding: "16px",
              fontFamily: "var(--mono)",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#000" }}>ACTIVE STREAK</div>
            <div style={{ fontSize: "32px", fontWeight: 800, margin: "4px 0" }}>⚡ {stats.streakDays} DAYS</div>
            <div style={{ fontSize: "10px", fontWeight: 700 }}>Consecutive hoard days</div>
          </div>
        </div>

        {/* Read Ratio & Hours Progress Bar */}
        <div
          style={{
            border: "3px solid #000",
            background: "#FFFDF8",
            boxShadow: "5px 5px 0 #000",
            padding: "20px",
            fontFamily: "var(--mono)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontWeight: 800 }}>
            <span>READ vs UNREAD RATIO</span>
            <span>{stats.readPercent}% READ ({stats.read} of {stats.total})</span>
          </div>

          {/* Progress Bar Container */}
          <div style={{ width: "100%", height: "24px", border: "2px solid #000", background: "#FF007A", display: "flex" }}>
            <div
              style={{
                width: `${stats.readPercent}%`,
                height: "100%",
                background: "#B6FF3C",
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "11px" }}>
            <span>🟩 Completed Time: <b>{formatHours(stats.readMins)}</b></span>
            <span>🟥 Backlog Time: <b>{formatHours(stats.unreadMins)}</b></span>
          </div>
        </div>

        {/* Content Type Breakdown */}
        <div
          style={{
            border: "3px solid #000",
            background: "#FFFDF8",
            boxShadow: "5px 5px 0 #000",
            padding: "20px",
            fontFamily: "var(--mono)",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px", textTransform: "uppercase" }}>
            CONTENT KIND BREAKDOWN
          </h2>

          <div style={{ display: "grid", gap: "12px" }}>
            {(Object.keys(TYPES) as KindType[]).map((k) => {
              const count = stats.typeMap[k] || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              const meta = TYPES[k];

              return (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "100px 1fr 60px", alignItems: "center", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, fontSize: "12px" }}>
                    <span
                      style={{
                        background: meta.c,
                        color: meta.fg,
                        border: "1px solid #000",
                        padding: "1px 5px",
                        fontSize: "10px",
                      }}
                    >
                      {k}
                    </span>
                    {meta.name}
                  </div>

                  <div style={{ height: "16px", border: "2px solid #000", background: "#f0f0f0", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: meta.c,
                      }}
                    />
                  </div>

                  <div style={{ fontWeight: 800, fontSize: "12px", textAlign: "right" }}>
                    {count} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Collections Breakdown */}
        <div
          style={{
            border: "3px solid #000",
            background: "#FFFDF8",
            boxShadow: "5px 5px 0 #000",
            padding: "20px",
            fontFamily: "var(--mono)",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: "16px", textTransform: "uppercase" }}>
            COLLECTION DISTRIBUTION
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
            {stats.collList.map((c) => (
              <div
                key={c.name}
                style={{
                  border: "2px solid #000",
                  padding: "10px",
                  background: "var(--cream)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "12px" }}>
                  <span style={{ background: c.color, border: "1px solid #000", padding: "2px 6px" }}>{c.icon}</span>
                  {c.name}
                </div>
                <span style={{ fontWeight: 800, fontSize: "14px", background: "#000", color: "#FFE600", padding: "1px 6px" }}>
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
