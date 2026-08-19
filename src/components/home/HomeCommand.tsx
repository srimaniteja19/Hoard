"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { excludeIds, filterCandidates, rankCandidates } from "@/lib/home/score";
import { standfirst } from "@/lib/home/standfirst";
import { nextInStack, packWindow } from "@/lib/home/pack";
import { currentPocket } from "@/lib/home/pocket";
import { captureReceipt, type CaptureReceipt } from "@/lib/home/receipt";
import { formatMinutes } from "@/lib/home/format";
import { readSkippedIds, skipIdToday } from "@/lib/home/skipToday";
import type { HomeEdition, LeadCandidate } from "@/lib/home/types";
import type { ContextType, KindType } from "@/types";
import type { CapturePreview } from "@/lib/home/routeCapture";
import { preferDeepWork, suggestedContext } from "@/lib/home/energy";
import { dischargeBookmarkAction } from "@/app/actions/discharge";
import type { TilType } from "@/db/schema";
import { HomeDischarge } from "@/components/home/HomeDischarge";
import { HomeCapture } from "@/components/home/HomeCapture";
import { HomeDial } from "@/components/home/HomeDial";
import { HomeDayStrip } from "@/components/home/HomeDayStrip";
import { HomeVerso } from "@/components/home/HomeVerso";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";

const CONTEXTS: ContextType[] = ["all", "desk", "commute", "wind"];

const KIND_MARK: Record<KindType, string> = {
  ART: "ARTICLE",
  VID: "VIDEO",
  PLY: "PLAYLIST",
  GIT: "REPO",
  APP: "APP",
  PPR: "PAPER",
  DOC: "DOC",
};

function leadHref(lead: LeadCandidate): string {
  return lead.source === "todo" ? "/todos" : `/session?id=${lead.id}`;
}

function leadDept(lead: LeadCandidate | null): "queue" | "agenda" {
  return lead?.source === "todo" ? "agenda" : "queue";
}

function normalizeTimeParam(value: string | null): number {
  if (value === null || value.trim() === "") return 180;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 180;
  const clamped = Math.min(180, Math.max(5, parsed));
  return Math.round(clamped / 5) * 5;
}

function HomeCommandContent({ edition }: { edition: HomeEdition }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [time, setTime] = useState(() => normalizeTimeParam(searchParams.get("time")));
  const [ctx, setCtx] = useState<ContextType>(() => {
    const ctxParam = searchParams.get("ctx");
    return ctxParam && (CONTEXTS as string[]).includes(ctxParam)
      ? (ctxParam as ContextType)
      : "all";
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

  const updateFilters = useCallback((nextTime: number, nextCtx: ContextType) => {
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
  }, [ctx]);

  const blocked = useMemo(
    () => new Set([...skippedIds, ...dismissedIds]),
    [skippedIds, dismissedIds],
  );
  const filtered = excludeIds(filterCandidates(edition.candidates, ctx), blocked);
  const pocket = now
    ? currentPocket(edition.day.blocks, now, edition.day.freeMinutes)
    : null;
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

  const dismiss = useCallback((id: string) => {
    setPinnedLeadId(nextInStack(packed));
    setDismissedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }, [packed]);

  const completeTodo = useCallback(async (id: string) => {
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
          setActualPrompt({
            id: lead.id,
            title: lead.title,
            estimatedMinutes: lead.estimatedMinutes,
          });
        }
        dismiss(id);
        router.refresh();
      }
    } finally {
      setActing(false);
    }
  }, [acting, dismiss, lead, router]);

  const pushTodo = useCallback(async (id: string) => {
    if (acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/todos/${id}/push`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        dismiss(id);
        router.refresh();
      }
    } finally {
      setActing(false);
    }
  }, [acting, dismiss, router]);

  const dropBookmark = useCallback((id: string) => {
    if (!lead || lead.source !== "bookmark" || lead.id !== id) return;
    setDischarge({ id: lead.id, title: lead.title });
  }, [lead]);

  async function submitDischarge(type: TilType, body: string) {
    if (!discharge) return;
    await dischargeBookmarkAction({
      bookmarkId: Number(discharge.id),
      type,
      body,
      tags: [],
    });
    dismiss(discharge.id);
    setDischarge(null);
    router.refresh();
  }

  const cycleStack = useCallback(
    (delta: number) => {
      const order = lead ? [lead, ...packed.stack] : packed.stack;
      if (order.length < 2) return;
      const currentId = pinnedLeadId ?? lead?.id;
      const i = Math.max(0, order.findIndex((candidate) => candidate.id === currentId));
      const next = order[(i + delta + order.length) % order.length];
      setPinnedLeadId(next.id);
    },
    [lead, packed.stack, pinnedLeadId],
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

  async function submitActual(minutes: number) {
    if (!actualPrompt) return;
    const id = actualPrompt.id;
    setActualPrompt(null);
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualMinutes: minutes }),
    });
  }

  function onFiled(preview: CapturePreview) {
    if (!preview.destination) return;
    setReceipt(
      captureReceipt({
        destination: preview.destination,
        addedMinutes: preview.addedMinutes ?? 0,
        freeMinutes: edition.day.freeMinutes,
        unfittedCount: edition.day.unfittedCount,
        owedMinutes: edition.queue.owedMinutes,
        streak: edition.record.streak,
      }),
    );
  }

  const folio = [localDate, pocket?.line].filter(Boolean).join(" · ");
  const dept = leadDept(lead);

  return (
    <AppPage width="xl">
      <div className="home-edition">
        {folio ? <div className="home-folio">{folio}</div> : <div className="home-folio">—</div>}
        <div className="home-keys">d done · p push · n skip · ↵ open · j/k stack · 1–3 verso</div>

        <HomeCapture onFiled={onFiled} />

        {actualPrompt ? (
          <div className="home-receipt" data-dest="agenda">
            <p>
              Done. How long did {actualPrompt.title} take? Est. {actualPrompt.estimatedMinutes}m.
            </p>
            <div className="home-lead-actions">
              <button
                type="button"
                className="home-receipt-cta"
                onClick={() => void submitActual(Math.max(1, Math.round(actualPrompt.estimatedMinutes / 2)))}
              >
                HALF
              </button>
              <button
                type="button"
                className="home-receipt-cta"
                onClick={() => void submitActual(actualPrompt.estimatedMinutes)}
              >
                SPOT ON
              </button>
              <button
                type="button"
                className="home-receipt-cta"
                onClick={() => void submitActual(actualPrompt.estimatedMinutes * 2)}
              >
                DOUBLE
              </button>
              <button type="button" className="home-receipt-dismiss" onClick={() => setActualPrompt(null)}>
                SKIP
              </button>
            </div>
          </div>
        ) : receipt ? (
          <div className="home-receipt" data-dest={receipt.destination}>
            <p>{receipt.line}</p>
            <div className="home-lead-actions">
              <Link href={receipt.href} className="home-receipt-cta">
                {receipt.cta}
              </Link>
              <button type="button" className="home-receipt-dismiss" onClick={() => setReceipt(null)}>
                LEAVE IT
              </button>
            </div>
          </div>
        ) : null}

        <section className="home-lead">
          <LeadPlate lead={lead} />
          <div className="home-lead-copy">
            <div className="home-lead-story">
              {lead ? (
                <>
                  <div className="home-kicker" data-dept={dept}>
                    {dept === "agenda" ? "THE AGENDA" : "THE QUEUE"}
                    {lead.estimatedMinutes ? ` · ${lead.estimatedMinutes}M` : ""}
                  </div>
                  <h1 className="home-headline">{lead.title}</h1>
                  {!packed.fits ? (
                    <p className="home-misfit">
                      This does not fit {formatMinutes(time)}. Push it before you pretend.
                    </p>
                  ) : null}
                  <p className="home-standfirst">{standfirst(lead, time)}</p>
                  {discharge && discharge.id === lead.id ? (
                    <HomeDischarge
                      title={discharge.title}
                      onCancel={() => setDischarge(null)}
                      onSubmit={submitDischarge}
                    />
                  ) : (
                  <div className="home-lead-actions">
                    {lead.source === "todo" ? (
                      <>
                        <button
                          type="button"
                          className="home-btn"
                          disabled={acting}
                          onClick={() => void completeTodo(lead.id)}
                        >
                          DONE
                        </button>
                        <button
                          type="button"
                          className="home-btn-ghost"
                          disabled={acting}
                          onClick={() => void pushTodo(lead.id)}
                        >
                          PUSH TO TOMORROW →
                        </button>
                      </>
                    ) : (
                      <>
                        <Link href={leadHref(lead)} className="home-btn">
                          START SESSION →
                        </Link>
                        <button
                          type="button"
                          className="home-btn-ghost"
                          disabled={acting}
                          onClick={() => void dropBookmark(lead.id)}
                        >
                          DROP
                        </button>
                      </>
                    )}
                    <button type="button" className="home-btn-ghost" onClick={skipLead}>
                      NOT TODAY →
                    </button>
                  </div>
                  )}
                </>
              ) : (
                <h1 className="home-headline">Nothing fits this window.</h1>
              )}
            </div>

            <HomeDial time={time} ctx={ctx} onChange={updateFilters} />

            <div className="home-stack-wrap">
              <div className="home-kicker">THE STACK</div>
              {packed.stack.length ? (
                <ol className="home-stack">
                  {packed.stack.map((candidate) => (
                    <li key={`${candidate.source}-${candidate.id}`}>
                      <button
                        type="button"
                        className="home-stack-promote"
                        onClick={() => setPinnedLeadId(candidate.id)}
                      >
                        <span>{candidate.title}</span>
                        <span className="home-stack-mins">{candidate.estimatedMinutes}m</span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="home-leftover">Nothing else in this window.</p>
              )}
              {packed.leftoverMinutes !== null && packed.leftoverMinutes > 0 ? (
                <p className="home-leftover">{formatMinutes(packed.leftoverMinutes)} leftover.</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="home-rails" aria-label="Hoard overview">
          <Rail
            title="THE QUEUE"
            dept="queue"
            numeral={edition.queue.unread}
            sub={`${edition.queue.owedMinutes} min owed`}
            entries={edition.queue.entries}
            empty="Queue is clear."
            href="/library"
          />
          <Rail
            title="THE AGENDA"
            dept="agenda"
            numeral={edition.agenda.open}
            sub={`${edition.agenda.workMinutes} min open`}
            entries={edition.agenda.entries}
            empty="Nothing open."
            href="/todos"
          />
          <Rail
            title="THE RECORD"
            dept="record"
            numeral={edition.record.streak}
            sub={`${edition.record.monthCount} this month`}
            entries={edition.record.entries}
            empty="No entries yet."
            href="/til"
          >
            <div
              className="home-spark"
              aria-label={`Activity over the last 14 days: ${edition.record.last14.join(", ")}`}
            >
              {edition.record.last14.map((count, index) => (
                <span
                  key={index}
                  style={{ height: `${Math.min(28, Math.max(4, 4 + count * 6))}px` }}
                />
              ))}
            </div>
          </Rail>
        </section>

        <HomeVerso recall={edition.recall} />

        <HomeDayStrip
          blocks={edition.day.blocks}
          freeMinutes={edition.day.freeMinutes}
          unfittedCount={edition.day.unfittedCount}
          unfittedMinutes={edition.day.unfittedMinutes}
          nowPercent={nowPercent}
          ariaLabel={dayAriaLabel}
        />
      </div>
    </AppPage>
  );
}

function LeadPlate({ lead }: { lead: LeadCandidate | null }) {
  if (!lead) {
    return (
      <div className="home-plate home-plate-empty">
        <span className="home-plate-hatch" />
        <span className="home-plate-kicker">EMPTY</span>
        <span className="home-plate-mins">—</span>
      </div>
    );
  }

  const energyClass =
    lead.source === "todo" && lead.energy ? `home-plate-energy-${lead.energy}` : "";
  const kindClass =
    lead.source === "bookmark" && lead.kind ? `home-plate-kind-${lead.kind}` : "";
  const mark =
    lead.source === "todo"
      ? lead.energy ?? "TASK"
      : lead.kind
        ? KIND_MARK[lead.kind]
        : "QUEUE";

  return (
    <Link href={leadHref(lead)} className={`home-plate ${energyClass} ${kindClass}`.trim()}>
      <span className="home-plate-hatch" />
      <span className="home-plate-kicker">{mark}</span>
      <span className="home-plate-mins">{lead.estimatedMinutes}M</span>
    </Link>
  );
}

export function HomeCommand({ edition }: { edition: HomeEdition }) {
  return (
    <Suspense fallback={<AppLoading label="LOADING HOME…" />}>
      <HomeCommandContent edition={edition} />
    </Suspense>
  );
}

function Rail({
  title,
  dept,
  numeral,
  sub,
  entries,
  empty,
  href,
  children,
}: {
  title: string;
  dept: "queue" | "agenda" | "record";
  numeral: number;
  sub: string;
  entries: HomeEdition["queue"]["entries"];
  empty: string;
  href: string;
  children?: ReactNode;
}) {
  return (
    <article className={`home-rail home-rail-${dept}`}>
      <div className="home-kicker">{title}</div>
      <div className="home-rail-numeral">{numeral}</div>
      <div className="home-rail-sub">{sub}</div>
      <div className="home-rail-entries">
        {entries.length ? (
          entries.slice(0, 3).map((entry) => (
            <div key={entry.id} className="home-rail-entry">
              <div className="home-rail-entry-title">{entry.title}</div>
              <div className="home-rail-entry-meta">{entry.meta}</div>
            </div>
          ))
        ) : (
          <p className="home-rail-empty">{empty}</p>
        )}
        {children}
      </div>
      <Link href={href} className="home-rail-link">
        see all →
      </Link>
    </article>
  );
}
