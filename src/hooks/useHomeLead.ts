"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { excludeIds, filterCandidates, rankCandidates } from "@/lib/home/score";
import { nextInStack, packWindow } from "@/lib/home/pack";
import { currentPocket } from "@/lib/home/pocket";
import { captureReceipt, type CaptureReceipt } from "@/lib/home/receipt";
import { readSkippedIds, skipIdToday } from "@/lib/home/skipToday";
import { leadHref, leadDept, normalizeTimeParam } from "@/lib/home/lead";
import { preferDeepWork, suggestedContext } from "@/lib/home/energy";
import { dischargeBookmarkAction } from "@/app/actions/discharge";
import type { HomeEdition } from "@/lib/home/types";
import type { ContextType } from "@/types";
import type { CapturePreview } from "@/lib/home/routeCapture";
import type { TilType } from "@/db/schema";

const CONTEXTS: ContextType[] = ["all", "desk", "commute", "wind"];

/**
 * The lead story: what's up next, what filters shaped it, and every action
 * that can change it (complete/push/drop/skip/dismiss, stack cycling, the
 * "d/p/n/enter/j/k" keyboard shortcuts, capture receipts, the actual-time
 * prompt). Everything in here composes already-tested pure functions from
 * lib/home/* — score.ts, pack.ts, pocket.ts, etc. — so this hook itself
 * stays untested (matching this codebase's convention: pure logic gets
 * Node-testable lib functions, orchestration is thin glue on top). What it
 * fixes is that *how* those pieces get wired together — the derivation
 * order, the keymap, three separate localStorage effects — previously had
 * no seam of its own.
 */
export function useHomeLead(edition: HomeEdition) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [time, setTime] = useState(() => normalizeTimeParam(searchParams.get("time")));
  const [ctx, setCtx] = useState<ContextType>(() => {
    const ctxParam = searchParams.get("ctx");
    return ctxParam && (CONTEXTS as string[]).includes(ctxParam) ? (ctxParam as ContextType) : "all";
  });
  const [ctxTouched, setCtxTouched] = useState(() => Boolean(searchParams.get("ctx")));
  const [lastLedId, setLastLedId] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [lastLedIdLoaded, setLastLedIdLoaded] = useState(false);
  const [localDate, setLocalDate] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [receipt, setReceipt] = useState<CaptureReceipt | null>(null);
  const [acting, setActing] = useState(false);
  const [pinnedLeadId, setPinnedLeadId] = useState<string | null>(null);
  const [actualPrompt, setActualPrompt] = useState<{
    id: string;
    title: string;
    estimatedMinutes: number;
  } | null>(null);
  const [discharge, setDischarge] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    let storedLastLedId: string | null = null;
    let storedSkipped: string[] = [];
    try {
      storedLastLedId = localStorage.getItem("hoard:lastLeadId");
      storedSkipped = readSkippedIds(localStorage);
    } catch {
      // Unreadable storage means no variety penalty and no skips.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastLedId(storedLastLedId);
    setSkippedIds(storedSkipped);
    setLastLedIdLoaded(true);
  }, []);

  useEffect(() => {
    const formatted = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalDate(formatted);
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const updateFilters = useCallback(
    (nextTime: number, nextCtx: ContextType) => {
      if (nextCtx !== ctx) setCtxTouched(true);
      setPinnedLeadId(null);
      setTime(nextTime);
      setCtx(nextCtx);
      const url = new URL(window.location.href);
      const params = url.searchParams;
      if (nextTime === 180) params.delete("time");
      else params.set("time", String(nextTime));
      if (nextCtx === "all") params.delete("ctx");
      else params.set("ctx", nextCtx);
      window.history.replaceState(window.history.state, "", url);
    },
    [ctx]
  );

  const blocked = useMemo(() => new Set([...skippedIds, ...dismissedIds]), [skippedIds, dismissedIds]);
  const filtered = excludeIds(filterCandidates(edition.candidates, ctx), blocked);
  const pocket = now ? currentPocket(edition.day.blocks, now, edition.day.freeMinutes) : null;
  const ranked = rankCandidates(filtered, time, lastLedId, {
    context: ctx,
    preferDeep: now && pocket ? preferDeepWork(now, pocket) : false,
  });
  const packed = packWindow(ranked, time, pinnedLeadId);
  const lead = packed.lead;
  const nowPercent = pocket?.nowPercent ?? edition.day.nowPercent;
  const busyLabel = edition.day.blocks.length
    ? edition.day.blocks.map((block) => `${block.title} ${block.start} to ${block.end}`).join(", ")
    : "none";
  const dayAriaLabel = `Free ${edition.day.freeMinutes} minutes. Busy: ${busyLabel}. Now at ${nowPercent} percent of the day.`;
  const folio = [localDate, pocket?.line].filter(Boolean).join(" · ");
  const dept = leadDept(lead);

  useEffect(() => {
    if (ctxTouched || !now || !pocket) return;
    const suggested = suggestedContext(now, pocket);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (suggested !== ctx) setCtx(suggested);
  }, [ctxTouched, now, pocket, ctx]);

  useEffect(() => {
    if (!lead || !lastLedIdLoaded) return;
    try {
      localStorage.setItem("hoard:lastLeadId", lead.id);
    } catch {
      // Unwritable storage does not affect the current ranking.
    }
  }, [lead, lastLedIdLoaded]);

  const skipLead = useCallback(() => {
    if (!lead) return;
    const nextId = nextInStack(packed);
    let next = skippedIds;
    try {
      next = skipIdToday(localStorage, lead.id);
    } catch {
      next = [...skippedIds, lead.id];
    }
    setSkippedIds(next);
    setLastLedId(lead.id);
    setPinnedLeadId(nextId);
  }, [lead, packed, skippedIds]);

  const dismiss = useCallback(
    (id: string) => {
      setPinnedLeadId(nextInStack(packed));
      setDismissedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    },
    [packed]
  );

  const completeTodo = useCallback(
    async (id: string) => {
      if (acting) return;
      setActing(true);
      try {
        const res = await fetch(`/api/todos/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "DONE" }),
        });
        if (res.ok) {
          if (lead && lead.id === id) {
            setActualPrompt({ id: lead.id, title: lead.title, estimatedMinutes: lead.estimatedMinutes });
          }
          dismiss(id);
          router.refresh();
        }
      } finally {
        setActing(false);
      }
    },
    [acting, dismiss, lead, router]
  );

  const pushTodo = useCallback(
    async (id: string) => {
      if (acting) return;
      setActing(true);
      try {
        const res = await fetch(`/api/todos/${id}/push`, { method: "POST", credentials: "include" });
        if (res.ok) {
          dismiss(id);
          router.refresh();
        }
      } finally {
        setActing(false);
      }
    },
    [acting, dismiss, router]
  );

  const dropBookmark = useCallback(
    (id: string) => {
      if (!lead || lead.source !== "bookmark" || lead.id !== id) return;
      setDischarge({ id: lead.id, title: lead.title });
    },
    [lead]
  );

  const cancelDischarge = useCallback(() => setDischarge(null), []);

  const submitDischarge = useCallback(
    async (type: TilType, body: string) => {
      if (!discharge) return;
      await dischargeBookmarkAction({ bookmarkId: Number(discharge.id), type, body, tags: [] });
      dismiss(discharge.id);
      setDischarge(null);
      router.refresh();
    },
    [discharge, dismiss, router]
  );

  const cycleStack = useCallback(
    (delta: number) => {
      const order = lead ? [lead, ...packed.stack] : packed.stack;
      if (order.length < 2) return;
      const currentId = pinnedLeadId ?? lead?.id;
      const i = Math.max(0, order.findIndex((candidate) => candidate.id === currentId));
      const next = order[(i + delta + order.length) % order.length];
      setPinnedLeadId(next.id);
    },
    [lead, packed.stack, pinnedLeadId]
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!lead) return;
      const key = event.key.toLowerCase();
      if (key === "d") {
        event.preventDefault();
        if (lead.source === "todo") void completeTodo(lead.id);
        else void dropBookmark(lead.id);
        return;
      }
      if (key === "p") {
        event.preventDefault();
        if (lead.source === "todo") void pushTodo(lead.id);
        return;
      }
      if (key === "n") {
        event.preventDefault();
        skipLead();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        router.push(leadHref(lead));
        return;
      }
      if (key === "j") {
        event.preventDefault();
        cycleStack(1);
        return;
      }
      if (key === "k") {
        event.preventDefault();
        cycleStack(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, cycleStack, router, skipLead, completeTodo, dropBookmark, pushTodo]);

  const submitActual = useCallback(async (minutes: number) => {
    if (!actualPrompt) return;
    const id = actualPrompt.id;
    setActualPrompt(null);
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualMinutes: minutes }),
    });
  }, [actualPrompt]);

  const dismissActualPrompt = useCallback(() => setActualPrompt(null), []);

  const onFiled = useCallback(
    (preview: CapturePreview) => {
      if (!preview.destination) return;
      setReceipt(
        captureReceipt({
          destination: preview.destination,
          addedMinutes: preview.addedMinutes ?? 0,
          freeMinutes: edition.day.freeMinutes,
          unfittedCount: edition.day.unfittedCount,
          owedMinutes: edition.queue.owedMinutes,
          streak: edition.record.streak,
        })
      );
    },
    [edition]
  );

  const dismissReceipt = useCallback(() => setReceipt(null), []);

  const promote = useCallback((id: string) => setPinnedLeadId(id), []);

  return {
    filters: { time, ctx },
    lead,
    packed,
    dept,
    folio,
    dayAriaLabel,
    nowPercent,
    acting,
    banners: { actualPrompt, receipt, discharge },
    actions: {
      updateFilters,
      skipLead,
      dismiss,
      completeTodo,
      pushTodo,
      dropBookmark,
      cancelDischarge,
      submitDischarge,
      cycleStack,
      submitActual,
      dismissActualPrompt,
      onFiled,
      dismissReceipt,
      promote,
    },
  };
}
