"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { standfirst } from "@/lib/home/standfirst";
import { formatMinutes } from "@/lib/home/format";
import type { HomeEdition } from "@/lib/home/types";
import type { KindType } from "@/types";
import { HomeDischarge } from "@/components/home/HomeDischarge";
import { HomeCapture } from "@/components/home/HomeCapture";
import { HomeDial } from "@/components/home/HomeDial";
import { HomeDayStrip } from "@/components/home/HomeDayStrip";
import { HomeVerso } from "@/components/home/HomeVerso";
import { AppPage } from "@/components/chrome/AppPage";
import { AppLoading } from "@/components/chrome/AppLoading";
import { useHomeLead } from "@/hooks/useHomeLead";
import { leadHref } from "@/lib/home/lead";
import type { LeadCandidate } from "@/lib/home/types";

const KIND_MARK: Record<KindType, string> = {
  ART: "ARTICLE",
  VID: "VIDEO",
  PLY: "PLAYLIST",
  GIT: "REPO",
  APP: "APP",
  PPR: "PAPER",
  DOC: "DOC",
};

function HomeCommandContent({ edition }: { edition: HomeEdition }) {
  const { filters, lead, packed, dept, folio, dayAriaLabel, nowPercent, acting, banners, actions } =
    useHomeLead(edition);
  const { time, ctx } = filters;
  const { actualPrompt, receipt, discharge } = banners;

  return (
    <AppPage width="xl">
      <div className="home-edition">
        {folio ? <div className="home-folio">{folio}</div> : <div className="home-folio">—</div>}
        <div className="home-keys">d done · p push · n skip · ↵ open · j/k stack · 1–3 verso</div>

        <HomeCapture onFiled={actions.onFiled} />

        {actualPrompt ? (
          <div className="home-receipt" data-dest="agenda">
            <p>
              Done. How long did {actualPrompt.title} take? Est. {actualPrompt.estimatedMinutes}m.
            </p>
            <div className="home-lead-actions">
              <button
                type="button"
                className="home-receipt-cta"
                onClick={() => void actions.submitActual(Math.max(1, Math.round(actualPrompt.estimatedMinutes / 2)))}
              >
                HALF
              </button>
              <button
                type="button"
                className="home-receipt-cta"
                onClick={() => void actions.submitActual(actualPrompt.estimatedMinutes)}
              >
                SPOT ON
              </button>
              <button
                type="button"
                className="home-receipt-cta"
                onClick={() => void actions.submitActual(actualPrompt.estimatedMinutes * 2)}
              >
                DOUBLE
              </button>
              <button type="button" className="home-receipt-dismiss" onClick={actions.dismissActualPrompt}>
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
              <button type="button" className="home-receipt-dismiss" onClick={actions.dismissReceipt}>
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
                      onCancel={actions.cancelDischarge}
                      onSubmit={actions.submitDischarge}
                    />
                  ) : (
                  <div className="home-lead-actions">
                    {lead.source === "todo" ? (
                      <>
                        <button
                          type="button"
                          className="home-btn"
                          disabled={acting}
                          onClick={() => void actions.completeTodo(lead.id)}
                        >
                          DONE
                        </button>
                        <button
                          type="button"
                          className="home-btn-ghost"
                          disabled={acting}
                          onClick={() => void actions.pushTodo(lead.id)}
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
                          onClick={() => void actions.dropBookmark(lead.id)}
                        >
                          DROP
                        </button>
                      </>
                    )}
                    <button type="button" className="home-btn-ghost" onClick={actions.skipLead}>
                      NOT TODAY →
                    </button>
                  </div>
                  )}
                </>
              ) : (
                <h1 className="home-headline">Nothing fits this window.</h1>
              )}
            </div>

            <HomeDial time={time} ctx={ctx} onChange={actions.updateFilters} />

            <div className="home-stack-wrap">
              <div className="home-kicker">THE STACK</div>
              {packed.stack.length ? (
                <ol className="home-stack">
                  {packed.stack.map((candidate) => (
                    <li key={`${candidate.source}-${candidate.id}`}>
                      <button
                        type="button"
                        className="home-stack-promote"
                        onClick={() => actions.promote(candidate.id)}
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
