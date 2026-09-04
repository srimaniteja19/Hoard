"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { TilHeaderNav, TilViewMode } from "@/components/til/TilHeaderNav";
import { TilComposer } from "@/components/til/TilComposer";
import { TilFeed } from "@/components/til/TilFeed";
import { TilItem } from "@/components/til/TilFeedItem";
import { TilHeaderSummary } from "@/components/til/TilHeaderSummary";
import { TilStreakBar } from "@/components/til/TilStreakBar";
import { TilHeatmap } from "@/components/til/TilHeatmap";
import { TilOnThisDay } from "@/components/til/TilOnThisDay";
import { TilCodexView, CodexTopicSummary, CodexTopicDetail } from "@/components/til/TilCodexView";
import { TilRecallView } from "@/components/til/TilRecallView";
import { TilPressView } from "@/components/til/TilPressView";
import { TilWallView } from "@/components/til/TilWallView";
import { TilConstellationView } from "@/components/til/TilConstellationView";
import { TilArchiveView } from "@/components/til/TilArchiveView";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";
import { ChromeSlot } from "@/components/chrome/slots";
import { TilType } from "@/db/schema";
import { StreakData, HeatmapData } from "@/lib/dal/til";
import { useRouter, useSearchParams } from "next/navigation";
import type { ClipTilDraft } from "@/lib/til/clipImport";

function TilPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active View Mode & Topic
  const viewMode = (searchParams.get("view") as TilViewMode) || "stream";
  const topicParam = searchParams.get("topic") || null;

  // STREAM State
  const [items, setItems] = useState<TilItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // CODEX State
  const [codexIndex, setCodexIndex] = useState<CodexTopicSummary[]>([]);
  const [codexActiveTopic, setCodexActiveTopic] = useState<CodexTopicDetail | null>(null);
  const [codexLoading, setCodexLoading] = useState(false);

  // RECALL State
  const [recallDeck, setRecallDeck] = useState<TilItem[]>([]);
  const [recallNextReviewAt, setRecallNextReviewAt] = useState<string | null>(null);
  const [recallNextReviewInDays, setRecallNextReviewInDays] = useState<number | null>(null);
  const [recallLoading, setRecallLoading] = useState(false);

  // PRESS State
  const now = new Date();
  const currentMonthDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [pressMonth, setPressMonth] = useState<string>(currentMonthDefault);
  const [pressEntries, setPressEntries] = useState<TilItem[]>([]);
  const [pressEntryCount, setPressEntryCount] = useState(0);
  const [pressTopicCount, setPressTopicCount] = useState(0);
  const [pressIssueNumber, setPressIssueNumber] = useState(1);
  const [pressIncludeSuperseded, setPressIncludeSuperseded] = useState(false);
  const [pressLoading, setPressLoading] = useState(false);

  // Stats State
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    streakAtRisk: false,
    skipsUsedThisMonth: 0,
  });
  const [heatmap, setHeatmap] = useState<HeatmapData>({});
  const [onThisDay, setOnThisDay] = useState<{ entry: TilItem; daysAgo: number } | null>(null);

  // Filters derived from URL query parameters
  const selectedHash = searchParams.get("hash") || null;
  const selectedTag = searchParams.get("tag") || null;
  const selectedType = (searchParams.get("type") as TilType) || null;
  const selectedDay = searchParams.get("day") || null;

  const validHashes = useMemo(() => {
    return new Set(items.map((i) => i.shortHash.toLowerCase()));
  }, [items]);

  const updateUrlFilters = (
    tag: string | null,
    type: TilType | null,
    day: string | null,
    hash: string | null = selectedHash
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tag) params.set("tag", tag); else params.delete("tag");
    if (type) params.set("type", type); else params.delete("type");
    if (day) params.set("day", day); else params.delete("day");
    if (hash) params.set("hash", hash); else params.delete("hash");
    const queryStr = params.toString();
    router.push(queryStr ? `/til?${queryStr}` : "/til");
  };

  const navigateToCodexTopic = (tag: string) => {
    router.push(`/til?view=codex&topic=${encodeURIComponent(tag)}`);
  };

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      const [streakRes, heatmapRes, onThisDayRes] = await Promise.all([
        fetch("/api/til/streak", { credentials: "include" }),
        fetch("/api/til/heatmap", { credentials: "include" }),
        fetch("/api/til/on-this-day", { credentials: "include" }),
      ]);

      if (streakRes.ok) setStreak(await streakRes.json());
      if (heatmapRes.ok) setHeatmap(await heatmapRes.json());
      if (onThisDayRes.ok) setOnThisDay(await onThisDayRes.json());
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
        if (selectedHash) params.set("hash", selectedHash);
        if (selectedTag) params.set("tag", selectedTag);
        if (selectedType) params.set("type", selectedType);
        if (selectedDay) params.set("day", selectedDay);
        if (viewMode === "archive") {
          params.set("limit", "100");
          params.set("includeSuperseded", "true");
        }

        const res = await fetch(`/api/til?${params.toString()}`, { credentials: "include" });

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
    [selectedHash, selectedTag, selectedType, selectedDay]
  );

  const fetchCodex = useCallback(async () => {
    try {
      setCodexLoading(true);
      const params = new URLSearchParams();
      if (topicParam) params.set("topic", topicParam);

      const res = await fetch(`/api/til/codex?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCodexIndex(data.index || []);
        setCodexActiveTopic(data.activeTopic || null);
      }
    } catch (e) {
      console.error("Failed to load CODEX data", e);
    } finally {
      setCodexLoading(false);
    }
  }, [topicParam]);

  const fetchRecall = useCallback(async () => {
    try {
      setRecallLoading(true);
      const res = await fetch("/api/til/recall", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRecallDeck(data.deck || []);
        setRecallNextReviewAt(data.nextReviewAt || null);
        setRecallNextReviewInDays(data.nextReviewInDays || null);
      }
    } catch (e) {
      console.error("Failed to load RECALL deck", e);
    } finally {
      setRecallLoading(false);
    }
  }, []);

  const fetchPress = useCallback(async () => {
    try {
      setPressLoading(true);
      const targetMonth = pressMonth || currentMonthDefault;
      const res = await fetch(
        `/api/til/press?month=${targetMonth}&includeSuperseded=${pressIncludeSuperseded}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setPressEntries(data.entries || []);
        setPressEntryCount(data.entryCount || 0);
        setPressTopicCount(data.topicCount || 0);
        setPressIssueNumber(data.issueNumber || 1);
      }
    } catch (e) {
      console.error("Failed to load PRESS zine data", e);
    } finally {
      setPressLoading(false);
    }
  }, [pressMonth, pressIncludeSuperseded, currentMonthDefault]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (viewMode === "codex") {
      fetchCodex();
    } else if (viewMode === "recall") {
      fetchRecall();
    } else if (viewMode === "press") {
      fetchPress();
    } else if (viewMode === "wall" || viewMode === "constellation") {
      // Self-contained views fetch their own data internally (Phase 4 / Phase 8).
    } else {
      fetchFeed();
    }
    if (viewMode !== "wall" && viewMode !== "constellation") {
      fetchAuxiliaryData();
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [viewMode, fetchFeed, fetchCodex, fetchRecall, fetchPress, fetchAuxiliaryData]);

  const handleCommit = async (newEntry: {
    type: TilType;
    body: string;
    code?: string;
    codeLang?: string;
    linkUrl?: string;
    linkDensity?: "inline" | "card" | "quote" | "full";
    tags: string[];
    saveToHoardQueue: boolean;
    replacesEntryId?: string;
  }) => {
    const res = await fetch("/api/til", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to save TIL entry");
    }

    const createdItem = await res.json();
    setItems((prev) => [createdItem, ...prev]);
    if (viewMode === "codex") fetchCodex();
    else if (viewMode === "recall") fetchRecall();
    else if (viewMode === "press") fetchPress();
    else fetchFeed();
    fetchAuxiliaryData();
  };

  const handleCommitBatch = async (entries: ClipTilDraft[]): Promise<{ failed: ClipTilDraft[] }> => {
    const failed: ClipTilDraft[] = [];
    let createdCount = 0;

    for (const entry of entries) {
      try {
        const res = await fetch("/api/til", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
        if (!res.ok) {
          failed.push(entry);
        } else {
          createdCount += 1;
        }
      } catch {
        failed.push(entry);
      }
    }

    if (createdCount > 0) {
      if (viewMode === "codex") fetchCodex();
      else if (viewMode === "recall") fetchRecall();
      else if (viewMode === "press") fetchPress();
      else fetchFeed();
      fetchAuxiliaryData();
    }

    return { failed };
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
      if (viewMode === "codex") fetchCodex();
      else if (viewMode === "press") fetchPress();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/til/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (viewMode === "codex") fetchCodex();
      else if (viewMode === "recall") fetchRecall();
      else if (viewMode === "press") fetchPress();
      fetchAuxiliaryData();
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchFeed(nextCursor, true);
    }
  };

  const wide =
    viewMode === "codex" || viewMode === "press" || viewMode === "wall" || viewMode === "constellation";

  return (
    <AppPage width={wide ? "wide" : "md"}>
      <ChromeSlot name="toolbar">
        <TilHeaderNav />
      </ChromeSlot>
        {/* CODEX VIEW MODE */}
        {viewMode === "codex" ? (
          <div>
            {codexLoading ? (
              <div
                style={{
                  padding: "48px 16px",
                  textAlign: "center",
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                LOADING CODEX ARCHIVE...
              </div>
            ) : (
              <TilCodexView
                index={codexIndex}
                activeTopic={codexActiveTopic}
                selectedTopic={topicParam}
                onSelectTopic={navigateToCodexTopic}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                validHashes={validHashes}
              />
            )}
          </div>
        ) : viewMode === "recall" ? (
          /* RECALL VIEW MODE */
          <div>
            {recallLoading ? (
              <div
                style={{
                  padding: "48px 16px",
                  textAlign: "center",
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                LOADING RECALL DECK...
              </div>
            ) : (
              <TilRecallView
                deck={recallDeck}
                nextReviewAt={recallNextReviewAt}
                nextReviewInDays={recallNextReviewInDays}
                onRefreshDeck={fetchRecall}
                validHashes={validHashes}
              />
            )}
          </div>
        ) : viewMode === "press" ? (
          /* PRESS VIEW MODE */
          <div>
            {pressLoading ? (
              <div
                style={{
                  padding: "48px 16px",
                  textAlign: "center",
                  fontFamily: "var(--mono)",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                LOADING PRESS ZINE...
              </div>
            ) : (
              <TilPressView
                month={pressMonth}
                entries={pressEntries}
                entryCount={pressEntryCount}
                topicCount={pressTopicCount}
                issueNumber={pressIssueNumber}
                includeSuperseded={pressIncludeSuperseded}
                onMonthChange={(m) => setPressMonth(m)}
                onToggleSuperseded={(inc) => setPressIncludeSuperseded(inc)}
                validHashes={validHashes}
              />
            )}
          </div>
        ) : viewMode === "archive" ? (
          /* ARCHIVE VAULT VIEW MODE */
          <TilArchiveView
            items={items}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onSelectTag={navigateToCodexTopic}
            onSelectType={(type) => updateUrlFilters(selectedTag, type, selectedDay)}
          />
        ) : viewMode === "wall" ? (
          /* WALL VIEW MODE */
          <TilWallView />
        ) : viewMode === "constellation" ? (
          /* CONSTELLATION VIEW MODE */
          <TilConstellationView />
        ) : (
          /* STREAM VIEW MODE (Default) */
          <div>
            {/* Consolidated Header: Stats & 26-Week Dense Strip */}
            <TilHeaderSummary
              streak={streak}
              heatmap={heatmap}
              totalCount={items.length}
              selectedDay={selectedDay}
              onSelectDay={(day) => updateUrlFilters(selectedTag, selectedType, day)}
            />

            {/* On This Day Resurfacing Card */}
            <TilOnThisDay data={onThisDay} />

            {/* Hero Morphing Composer Surface */}
            <TilComposer onCommit={handleCommit} onCommitBatch={handleCommitBatch} />

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
                selectedHash={selectedHash}
                onClearTagFilter={() => updateUrlFilters(null, selectedType, selectedDay)}
                onClearTypeFilter={() => updateUrlFilters(selectedTag, null, selectedDay)}
                onClearDayFilter={() => updateUrlFilters(selectedTag, selectedType, null)}
                onClearHashFilter={() => updateUrlFilters(selectedTag, selectedType, selectedDay, null)}
                onSelectTag={navigateToCodexTopic}
                onSelectType={(type) => updateUrlFilters(selectedTag, type, selectedDay)}
              />
            )}
          </div>
        )}
    </AppPage>
  );
}

export default function TilPage() {
  return (
    <Suspense
      fallback={<AppLoading label="LOADING TIL PAGE..." />}
    >
      <TilPageContent />
    </Suspense>
  );
}
