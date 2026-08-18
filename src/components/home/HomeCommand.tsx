"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { routeCapture } from "@/lib/home/routeCapture";
import { filterCandidates, rankCandidates } from "@/lib/home/score";
import { standfirst } from "@/lib/home/standfirst";
import type { HomeEdition, LeadCandidate } from "@/lib/home/types";
import type { ContextType } from "@/types";

const CONTEXTS: ContextType[] = ["all", "desk", "commute", "wind"];

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function leadHref(lead: LeadCandidate): string {
  return lead.source === "todo" ? "/todos" : `/session?id=${lead.id}`;
}

function normalizeTimeParam(value: string | null): number {
  if (value === null || value.trim() === "") return 180;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 180;
  const clamped = Math.min(180, Math.max(5, parsed));
  return Math.round(clamped / 5) * 5;
}

function HomeCommandContent({ edition }: { edition: HomeEdition }) {
  const searchParams = useSearchParams();
  const [time, setTime] = useState(() => normalizeTimeParam(searchParams.get("time")));
  const [ctx, setCtx] = useState<ContextType>(() => {
    const ctxParam = searchParams.get("ctx");
    return ctxParam && (CONTEXTS as string[]).includes(ctxParam)
      ? (ctxParam as ContextType)
      : "all";
  });
  const [lastLedId, setLastLedId] = useState<string | null>(null);
  const [lastLedIdLoaded, setLastLedIdLoaded] = useState(false);
  const [localDate, setLocalDate] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(
    () =>
      routeCapture(
        input,
        new Date(),
        Intl.DateTimeFormat().resolvedOptions().timeZone
      ),
    [input]
  );

  useEffect(() => {
    let storedLastLedId: string | null = null;
    try {
      storedLastLedId = localStorage.getItem("hoard:lastLeadId");
    } catch {
      // Unreadable storage means no variety penalty.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastLedId(storedLastLedId);
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
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (
        event.key === "/" &&
        activeTag !== "INPUT" &&
        activeTag !== "TEXTAREA"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function commit() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const previewNow = routeCapture(input, new Date(), tz);
    if (!previewNow.destination || submitting) return;
    const snapshot = input;
    setInput("");
    setSubmitting(true);
    try {
      let res: Response;
      if (previewNow.destination === "queue") {
        res = await fetch("/api/bookmarks", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: previewNow.url,
            ty: previewNow.kind,
            src: "Home capture",
          }),
        });
      } else if (previewNow.destination === "record") {
        res = await fetch("/api/til", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "FACT", body: previewNow.body }),
        });
      } else {
        res = await fetch("/api/todos", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: previewNow.text }),
        });
      }
      if (!res.ok) setInput(snapshot);
    } catch {
      setInput(snapshot);
    } finally {
      setSubmitting(false);
    }
  }

  const updateFilters = useCallback(
    (nextTime: number, nextCtx: ContextType) => {
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
    []
  );

  const filtered = filterCandidates(edition.candidates, ctx);
  const ranked = rankCandidates(filtered, time, lastLedId);
  const lead = ranked[0] ?? null;
  const upNext = ranked.slice(1, 4);
  const busyLabel = edition.day.blocks.length
    ? edition.day.blocks.map((block) => `${block.title} ${block.start} to ${block.end}`).join(", ")
    : "none";
  const dayAriaLabel = `Free ${edition.day.freeMinutes} minutes. Busy: ${busyLabel}.`;

  useEffect(() => {
    if (!lead || !lastLedIdLoaded) return;
    try {
      localStorage.setItem("hoard:lastLeadId", lead.id);
    } catch {
      // Unwritable storage does not affect the current ranking.
    }
  }, [lead, lastLedIdLoaded]);

  const skipLead = () => {
    if (!lead) return;
    try {
      localStorage.setItem("hoard:lastLeadId", lead.id);
    } catch {
      // The in-memory skip still works when storage is unavailable.
    }
    setLastLedId(lead.id);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cream, var(--paper))",
        color: "var(--ink)",
        fontFamily: "var(--sans, var(--grot))",
      }}
    >
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 24px 40px" }}>
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "16px",
            paddingBottom: "16px",
            borderBottom: "2px solid var(--ink)",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--grot)", fontSize: "30px", fontWeight: 900 }}>HOARD</div>
            <div style={{ marginTop: "3px", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800 }}>
              {localDate ?? "—"}
            </div>
          </div>
          <nav aria-label="Primary" style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
            {[
              ["Library", "/library"],
              ["Todos", "/todos"],
              ["TIL", "/til"],
              ["Stats", "/stats"],
            ].map(([label, href]) => (
              <Link key={href} href={href} style={navLinkStyle}>
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <section style={{ margin: "24px 0" }}>
          <label
            htmlFor="home-capture"
            style={{ display: "block", marginBottom: "6px", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 900 }}
          >
            CAPTURE
          </label>
          <input
            ref={inputRef}
            id="home-capture"
            type="text"
            aria-label="Capture a link, learning, or task"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
            placeholder="https://…  or  til …  or  call the vet tomorrow ~10m"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 16px",
              fontFamily: "var(--mono)",
              fontSize: "16px",
              color: "var(--ink)",
              background: "var(--yel)",
              border: "var(--bd)",
              boxShadow: "var(--sh)",
              outline: "none",
            }}
          />
          <div
            style={{
              minHeight: "28px",
              marginTop: "8px",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              alignItems: "center",
            }}
          >
            {preview.chips.map((chip, index) => (
              <Chip key={`${chip.label}-${index}`} label={chip.label} />
            ))}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
            padding: "24px",
            background: "var(--surface)",
            border: "2px solid var(--ink)",
          }}
        >
          <div>
            {lead ? (
              <>
                <div style={eyebrowStyle}>{lead.source === "todo" ? "THE AGENDA" : "THE QUEUE"}</div>
                <h1 style={{ margin: "8px 0 12px", fontSize: "clamp(30px, 5vw, 54px)", lineHeight: 0.98 }}>
                  {lead.title}
                </h1>
                <p style={{ margin: "0 0 20px", maxWidth: "62ch", fontSize: "16px", lineHeight: 1.45 }}>
                  {standfirst(lead, time)}
                </p>
                <Link href={leadHref(lead)} style={primaryLinkStyle}>
                  {lead.source === "todo" ? "OPEN TODOS →" : "START SESSION →"}
                </Link>
              </>
            ) : (
              <h1 style={{ margin: 0, fontSize: "clamp(30px, 5vw, 54px)", lineHeight: 1 }}>
                Nothing fits this window.
              </h1>
            )}
          </div>

          <div>
            <div style={{ ...controlBoxStyle, marginBottom: "14px" }}>
              <label htmlFor="home-time" style={eyebrowStyle}>
                I HAVE
              </label>
              <input
                id="home-time"
                type="range"
                min={5}
                max={180}
                step={5}
                value={time}
                onChange={(event) => updateFilters(Number(event.target.value), ctx)}
                style={{ width: "100%", margin: "10px 0 4px" }}
              />
              <b style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>
                {time === 180 ? "ANY TIME" : formatMinutes(time)}
              </b>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "14px" }}>
                {CONTEXTS.map((context) => (
                  <button
                    key={context}
                    type="button"
                    onClick={() => updateFilters(time, context)}
                    style={{
                      padding: "5px 9px",
                      fontFamily: "var(--mono)",
                      fontSize: "10px",
                      fontWeight: 900,
                      color: context === ctx ? "var(--paper)" : "var(--ink)",
                      background: context === ctx ? "var(--ink)" : "var(--surface)",
                      border: "2px solid var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    {context.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={controlBoxStyle}>
              <div style={eyebrowStyle}>UP NEXT</div>
              {upNext.length ? (
                <ol style={{ margin: "10px 0 14px", paddingLeft: "20px" }}>
                  {upNext.map((candidate) => (
                    <li key={`${candidate.source}-${candidate.id}`} style={{ marginBottom: "7px" }}>
                      <span style={{ fontWeight: 800 }}>{candidate.title}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.65 }}>
                        {" "}
                        · {candidate.estimatedMinutes} min
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p style={{ margin: "10px 0 14px", fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.65 }}>
                  Nothing else queued.
                </p>
              )}
              {lead && (
                <button type="button" onClick={skipLead} style={textButtonStyle}>
                  NOT THIS →
                </button>
              )}
            </div>
          </div>
        </section>

        <section
          aria-label="Hoard overview"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            borderTop: "2px solid var(--ink)",
            borderLeft: "2px solid var(--ink)",
            marginTop: "24px",
          }}
        >
          <Rail
            title="THE QUEUE"
            numeral={edition.queue.unread}
            sub={`${edition.queue.owedMinutes} min owed`}
            entries={edition.queue.entries}
            empty="Queue is clear."
            href="/library"
          />
          <Rail
            title="THE AGENDA"
            numeral={edition.agenda.open}
            sub={`${edition.agenda.workMinutes} min open`}
            entries={edition.agenda.entries}
            empty="Nothing open."
            href="/todos"
          />
          <Rail
            title="THE RECORD"
            numeral={edition.record.streak}
            sub={`${edition.record.monthCount} this month`}
            entries={edition.record.entries}
            empty="No entries yet."
            href="/til"
          >
            <div
              aria-label={`Activity over the last 14 days: ${edition.record.last14.join(", ")}`}
              style={{ display: "flex", alignItems: "end", gap: "4px", height: "30px", marginTop: "14px" }}
            >
              {edition.record.last14.map((count, index) => (
                <span
                  key={index}
                  style={{
                    flex: 1,
                    height: `${Math.min(28, Math.max(4, 4 + count * 6))}px`,
                    background: "var(--ink)",
                  }}
                />
              ))}
            </div>
            {edition.recall && (
              <p style={{ margin: "14px 0 0", paddingTop: "10px", borderTop: "1px solid var(--ink)", fontSize: "13px" }}>
                {edition.recall.text}
              </p>
            )}
          </Rail>
        </section>

        <Link
          href="/todos"
          aria-label={dayAriaLabel}
          style={{
            display: "block",
            marginTop: "24px",
            padding: "16px",
            color: "var(--ink)",
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            textDecoration: "none",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px" }}>
            <b style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>
              TODAY · {formatMinutes(edition.day.freeMinutes)} FREE
            </b>
            <span style={{ fontFamily: "var(--mono)", fontSize: "11px", opacity: 0.7 }}>
              {edition.day.blocks.length
                ? `Busy: ${edition.day.blocks.map((block) => `${block.title} (${block.start}–${block.end})`).join(", ")}`
                : "Busy: none"}
            </span>
          </div>
          {edition.day.unfittedCount > 0 && (
            <div style={{ marginTop: "8px", fontWeight: 800 }}>
              {edition.day.unfittedCount} task{edition.day.unfittedCount === 1 ? "" : "s"} (
              {formatMinutes(edition.day.unfittedMinutes)}) won&apos;t fit today. Move them now rather than at midnight.
            </div>
          )}
        </Link>
      </main>
    </div>
  );
}

export function HomeCommand({ edition }: { edition: HomeEdition }) {
  return (
    <Suspense
      fallback={<div style={{ padding: "48px", textAlign: "center", fontFamily: "var(--mono)" }}>LOADING HOME…</div>}
    >
      <HomeCommandContent edition={edition} />
    </Suspense>
  );
}

function Rail({
  title,
  numeral,
  sub,
  entries,
  empty,
  href,
  children,
}: {
  title: string;
  numeral: number;
  sub: string;
  entries: HomeEdition["queue"]["entries"];
  empty: string;
  href: string;
  children?: ReactNode;
}) {
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "300px",
        padding: "18px",
        background: "var(--surface)",
        borderRight: "2px solid var(--ink)",
        borderBottom: "2px solid var(--ink)",
      }}
    >
      <div style={eyebrowStyle}>{title}</div>
      <div style={{ marginTop: "10px", fontFamily: "var(--grot)", fontSize: "64px", fontWeight: 900, lineHeight: 0.9 }}>
        {numeral}
      </div>
      <div style={{ marginTop: "6px", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 800 }}>{sub}</div>
      <div style={{ marginTop: "18px", flex: 1 }}>
        {entries.length ? (
          entries.slice(0, 3).map((entry) => (
            <div key={entry.id} style={{ padding: "9px 0", borderTop: "1px solid var(--ink)" }}>
              <div style={{ fontWeight: 800 }}>{entry.title}</div>
              <div style={{ marginTop: "2px", fontFamily: "var(--mono)", fontSize: "10px", opacity: 0.65 }}>
                {entry.meta}
              </div>
            </div>
          ))
        ) : (
          <p style={{ margin: 0, fontFamily: "var(--mono)", fontSize: "12px", opacity: 0.65 }}>{empty}</p>
        )}
        {children}
      </div>
      <Link href={href} style={{ ...navLinkStyle, marginTop: "18px" }}>
        see all →
      </Link>
    </article>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--mono)",
        fontSize: "11px",
        fontWeight: 800,
        padding: "3px 8px",
        border: "2px solid var(--ink)",
        background: "var(--surface)",
        color: "var(--ink)",
      }}
    >
      {label}
    </span>
  );
}

const eyebrowStyle: CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const navLinkStyle: CSSProperties = {
  color: "var(--ink)",
  fontFamily: "var(--mono)",
  fontSize: "12px",
  fontWeight: 900,
  textDecoration: "none",
};

const primaryLinkStyle: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  color: "var(--paper)",
  background: "var(--ink)",
  border: "2px solid var(--ink)",
  fontFamily: "var(--mono)",
  fontSize: "12px",
  fontWeight: 900,
  textDecoration: "none",
};

const controlBoxStyle: CSSProperties = {
  padding: "14px",
  background: "var(--paper)",
  border: "2px solid var(--ink)",
};

const textButtonStyle: CSSProperties = {
  padding: 0,
  color: "var(--ink)",
  background: "transparent",
  border: 0,
  fontFamily: "var(--mono)",
  fontSize: "11px",
  fontWeight: 900,
  cursor: "pointer",
};
