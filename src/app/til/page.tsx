"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { TilHeaderNav } from "@/components/til/TilHeaderNav";
import { TilComposer } from "@/components/til/TilComposer";
import { TilFeed } from "@/components/til/TilFeed";
import { TilItem } from "@/components/til/TilFeedItem";
import { TilStreakBar } from "@/components/til/TilStreakBar";
import { TilHeatmap } from "@/components/til/TilHeatmap";
import { TilOnThisDay } from "@/components/til/TilOnThisDay";
import { TilType } from "@/db/schema";
import { StreakData, HeatmapData } from "@/lib/dal/til";
import { useRouter, useSearchParams } from "next/navigation";

function TilPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<TilItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Phase 3 stats state
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    streakAtRisk: false,
    skipsUsedThisMonth: 0,
  });
  const [heatmap, setHeatmap] = useState<HeatmapData>({});
  const [onThisDay, setOnThisDay] = useState<{ entry: TilItem; daysAgo: number } | null>(null);

  // Filters derived from URL query parameters
  const selectedTag = searchParams.get("tag") || null;
  const selectedType = (searchParams.get("type") as TilType) || null;
  const selectedDay = searchParams.get("day") || null;

  const updateUrlFilters = (tag: string | null, type: TilType | null, day: string | null) => {
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (type) params.set("type", type);
    if (day) params.set("day", day);
    const queryStr = params.toString();
    router.push(queryStr ? `/til?${queryStr}` : "/til");
  };

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const [streakRes, heatmapRes, onThisDayRes] = await Promise.all([
        fetch("/api/til/streak", { credentials: "include" }),
        fetch("/api/til/heatmap", { credentials: "include" }),
        fetch("/api/til/on-this-day", { credentials: "include" }),
      ]);

      if (streakRes.ok) {
        const streakData = await streakRes.json();
        setStreak(streakData);
      }

      if (heatmapRes.ok) {
        const heatmapData = await heatmapRes.json();
        setHeatmap(heatmapData);
      }

      if (onThisDayRes.ok) {
        const onThisDayData = await onThisDayRes.json();
        setOnThisDay(onThisDayData);
      }
    } catch (e) {
      console.error("Failed to load TIL auxiliary data", e);
    }
  }, []);

  const fetchFeed = useCallback(
    async (cursor?: string, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const params = new URLSearchParams();
        if (cursor) params.set("cursor", cursor);
        if (selectedTag) params.set("tag", selectedTag);
        if (selectedType) params.set("type", selectedType);
        if (selectedDay) params.set("day", selectedDay);

        const res = await fetch(`/api/til?${params.toString()}`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (append) {
            setItems((prev) => [...prev, ...data.items]);
          } else {
            setItems(data.items);
          }
          setNextCursor(data.nextCursor);
        }
      } catch (err) {
        console.error("Failed to load TIL feed", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedTag, selectedType, selectedDay]
  );

  useEffect(() => {
    fetchFeed();
    fetchAuxiliaryData();
  }, [fetchFeed, fetchAuxiliaryData]);

  const handleCommit = async (newEntry: {
    type: TilType;
    body: string;
    code?: string;
    codeLang?: string;
    linkUrl?: string;
    linkDensity?: "inline" | "card" | "quote" | "full";
    tags: string[];
    saveToHoardQueue: boolean;
  }) => {
    const res = await fetch("/api/til", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry),
    });

    if (!res.ok) {
      throw new Error("Failed to save TIL entry");
    }

    const createdItem = await res.json();
    setItems((prev) => [createdItem, ...prev]);
    // Refresh streak and heatmap after commit
    fetchAuxiliaryData();
  };

  const handleUpdate = async (id: string, updated: Partial<TilItem>) => {
    const res = await fetch(`/api/til/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    if (res.ok) {
      const updatedItem = await res.json();
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updatedItem } : item)));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/til/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      fetchAuxiliaryData();
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchFeed(nextCursor, true);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #FFFDF8)", color: "var(--ink)" }}>
      <TilHeaderNav />

      <main style={{ maxWidth: "840px", margin: "0 auto", padding: "24px 16px" }}>
        {/* Streak & Risk Banner */}
        <TilStreakBar
          currentStreak={streak.currentStreak}
          longestStreak={streak.longestStreak}
          streakAtRisk={streak.streakAtRisk}
          skipsUsedThisMonth={streak.skipsUsedThisMonth}
        />

        {/* 26-Week Heatmap */}
        <TilHeatmap
          heatmap={heatmap}
          selectedDay={selectedDay}
          onSelectDay={(day) => updateUrlFilters(selectedTag, selectedType, day)}
        />

        {/* On This Day Resurfacing Card */}
        <TilOnThisDay data={onThisDay} />

        {/* Hero Composer Surface */}
        <TilComposer onCommit={handleCommit} />

        {/* Timeline Feed Container */}
        {loading ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            LOADING TIL ARCHIVE...
          </div>
        ) : (
          <TilFeed
            items={items}
            nextCursor={nextCursor}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            selectedTag={selectedTag}
            selectedType={selectedType}
            selectedDay={selectedDay}
            onClearTagFilter={() => updateUrlFilters(null, selectedType, selectedDay)}
            onClearTypeFilter={() => updateUrlFilters(selectedTag, null, selectedDay)}
            onClearDayFilter={() => updateUrlFilters(selectedTag, selectedType, null)}
            onSelectTag={(tag) => updateUrlFilters(tag, selectedType, selectedDay)}
            onSelectType={(type) => updateUrlFilters(selectedTag, type, selectedDay)}
          />
        )}
      </main>
    </div>
  );
}

export default function TilPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "48px", textAlign: "center", fontFamily: "var(--mono)" }}>
          LOADING TIL PAGE...
        </div>
      }
    >
      <TilPageContent />
    </Suspense>
  );
}
