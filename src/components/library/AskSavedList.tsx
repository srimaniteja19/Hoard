"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AskAnswer } from "@/components/library/AskMarkdown";
import { AskShelf } from "@/components/library/AskShelf";
import {
  groupKeptByDay,
  needsKeptTitle,
  type AskSaveCitation,
} from "@/lib/library/askSave";
import {
  composeAskTicket,
  ticketSearchHay,
  type AskTicketGlyph,
  type AskTicketView,
} from "@/lib/library/askTicket";

type SavedItem = {
  id: string;
  title: string;
  question: string;
  answer: string;
  summary: string;
  citations: AskSaveCitation[];
  model: string;
  createdAt: string;
};

type KindFilter = "all" | "answers" | "cards";
type OpenMode = "pull" | "peek" | null;

type Filed = {
  item: SavedItem;
  ticket: AskTicketView;
};

function Glyph({ glyph }: { glyph: AskTicketGlyph }) {
  if (glyph.kind === "deck") {
    const n = Math.min(glyph.count ?? 3, 7);
    return (
      <span className="ask-glyph ask-glyph-deck" aria-hidden="true">
        {Array.from({ length: n }, (_, index) => (
          <i key={index} />
        ))}
      </span>
    );
  }
  return <span className={`ask-glyph ask-glyph-${glyph.kind}`} aria-hidden="true" />;
}

function Ticket({
  filed,
  open,
  dropping,
  copied,
  onOpen,
  onCopy,
  onDrop,
}: {
  filed: Filed;
  open: OpenMode;
  dropping: boolean;
  copied: boolean;
  onOpen: (mode: Exclude<OpenMode, null>) => void;
  onCopy: () => void;
  onDrop: () => void;
}) {
  const { item, ticket } = filed;
  const labels = ticket.glyphs.filter((glyph) => glyph.kind !== "weight").map((glyph) => glyph.label);
  return (
    <article className={`ask-ticket is-${ticket.spine}${open ? ` is-${open}` : ""}`}>
      <div className="ask-ticket-spine" aria-hidden="true" />
      <div className="ask-ticket-sheet">
        <span className="ask-ticket-stamp">
          <span className="ask-ticket-stamp-day">{ticket.stamp}</span>
          <span className="ask-ticket-cancel" aria-hidden="true" />
        </span>
        <p className="ask-ticket-asked">
          <span>ASKED</span> {ticket.asked}
        </p>
        <h2 className="ask-ticket-thesis">{ticket.thesis}</h2>
        <div className="ask-ticket-comp">
          <span className="ask-ticket-glyphs">
            {ticket.glyphs.map((glyph, index) => (
              <Glyph key={`${glyph.kind}-${index}`} glyph={glyph} />
            ))}
          </span>
          {labels.length > 0 ? <span className="ask-ticket-legend">{labels.join(" · ")}</span> : null}
        </div>
        <div className="ask-ticket-rail">
          <button type="button" className={open === "pull" ? "is-on is-pull" : "is-pull"} onClick={() => onOpen("pull")}>
            {open === "pull" ? "FILE" : "PULL →"}
          </button>
          <button type="button" className={open === "peek" ? "is-on" : undefined} onClick={() => onOpen("peek")}>
            PEEK
          </button>
          <button type="button" onClick={onCopy}>
            {copied ? "COPIED" : "COPY"}
          </button>
          <button type="button" onClick={onDrop} disabled={dropping}>
            {dropping ? "…" : "DROP"}
          </button>
        </div>
        {open === "peek" && ticket.peek.length > 0 ? (
          <ul className="ask-ticket-outline">
            {ticket.peek.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {open === "pull" ? (
          <div className="ask-ticket-full">
            <AskAnswer text={item.answer} prompt={item.question} />
            <AskShelf citations={item.citations} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function StubStack({
  filed,
  from,
}: {
  filed: Filed;
  from: string;
}) {
  const extra = Math.min(filed.ticket.cards.length - 1, 2);
  const top = filed.ticket.cards[0];
  if (!top) return null;
  return (
    <div className={extra > 0 ? "ask-stub-stack" : "ask-stub-stack is-single"}>
      {extra > 0 ? <span className="ask-stub-sheet" aria-hidden="true" /> : null}
      {extra > 1 ? <span className="ask-stub-sheet is-2" aria-hidden="true" /> : null}
      <article className="ask-stub">
        <header className="ask-stub-head">
          <span>CARD {top.n}</span>
          <span>{from}</span>
        </header>
        <h3>{top.title}</h3>
        {top.body ? <p>{top.body}</p> : null}
        <footer>PULLED FROM · {from}</footer>
      </article>
      {extra > 0 ? <span className="ask-stub-more">+{extra} FROM THE SAME ASK</span> : null}
    </div>
  );
}

export function AskSavedList() {
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [error, setError] = useState("");
  const [dropping, setDropping] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openMode, setOpenMode] = useState<OpenMode>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const naming = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/library/ask/saves", { credentials: "include" })
        .then(async (res) => {
          if (!res.ok) throw new Error("load failed");
          const data = (await res.json()) as { items: SavedItem[] };
          if (!cancelled) setItems(data.items);
        })
        .catch(() => {
          if (!cancelled) setError("Could not load saved answers.");
        });
    };
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(load)
        : window.setTimeout(load, 0);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    if (!items) return;
    const pending = items.filter((item) => needsKeptTitle(item.title, item.question) && !naming.current.has(item.id));
    if (pending.length === 0) return;
    void (async () => {
      for (const item of pending) {
        naming.current.add(item.id);
        try {
          const res = await fetch(`/api/library/ask/saves/${item.id}`, {
            method: "PATCH",
            credentials: "include",
          });
          if (!res.ok) {
            naming.current.delete(item.id);
            continue;
          }
          const data = (await res.json()) as { item: SavedItem };
          if (!data.item?.title) continue;
          setItems((current) =>
            current?.map((row) => (row.id === data.item.id ? { ...row, title: data.item.title } : row)) ?? null
          );
        } catch {
          naming.current.delete(item.id);
        }
      }
    })();
  }, [items]);

  const filed = useMemo<Filed[]>(
    () => (items ?? []).map((item) => ({ item, ticket: composeAskTicket(item) })),
    [items]
  );

  const found = useMemo(() => {
    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matched = !tokens.length
      ? filed
      : filed.filter((row) => {
          const hay = ticketSearchHay(row.item, row.ticket);
          return tokens.every((token) => hay.includes(token));
        });
    return matched.filter((row) => {
      if (kind === "answers") return true;
      if (kind === "cards") return row.ticket.cards.length > 0;
      return true;
    });
  }, [filed, kind, query]);

  const groups = useMemo(
    () =>
      groupKeptByDay(found.map((row) => row.item)).map((group) => ({
        ...group,
        filed: group.stamps
          .map((stamp) => found.find((row) => row.item.id === stamp.id))
          .filter((row): row is Filed => Boolean(row)),
      })),
    [found]
  );
  const stamped = String(items?.length ?? 0).padStart(2, "0");

  async function drop(id: string) {
    if (dropping) return;
    setDropping(id);
    try {
      const res = await fetch(`/api/library/ask/saves/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("drop failed");
      setItems((current) => current?.filter((item) => item.id !== id) ?? null);
      if (openId === id) {
        setOpenId(null);
        setOpenMode(null);
      }
    } catch {
      setError("Could not drop that save.");
    } finally {
      setDropping(null);
    }
  }

  async function copy(item: SavedItem) {
    try {
      await navigator.clipboard.writeText(item.answer.trim());
      setCopied(item.id);
      window.setTimeout(() => setCopied((current) => (current === item.id ? null : current)), 1600);
    } catch {
      setError("Could not copy that stamp.");
    }
  }

  function toggle(id: string, mode: Exclude<OpenMode, null>) {
    if (openId === id && openMode === mode) {
      setOpenId(null);
      setOpenMode(null);
      return;
    }
    setOpenId(id);
    setOpenMode(mode);
  }

  if (error && !items) return <div className="ask-error">{error}</div>;
  if (!items) return <p className="ask-saved-status">Pulling the file…</p>;
  if (items.length === 0) {
    return (
      <div className="ask-empty ask-empty-saved">
        <div className="ask-blotter">
          <div className="ask-blotter-meta">
            <p className="ask-hero-kicker">NOTHING FILED YET</p>
            <span className="ask-blotter-date">EMPTY DRAWER</span>
          </div>
          <div className="ask-blotter-desk">
            <div className="ask-folder" aria-hidden="true">
              <span className="ask-folder-tab">KEPT</span>
              <span className="ask-folder-body">closed</span>
            </div>
            <div className="ask-blotter-copy">
              <span className="ask-blotter-stamp">KEEP</span>
              <p className="ask-hero-dek">
                Stamp KEEP on an answer at the desk and it lands here as a ticket — thesis on the face, prompt in the
                margin.
              </p>
              <Link href="/ask" prefetch={false} className="ask-back">
                Ask something →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ask-saved-file">
      <header className="ask-drawer-head">
        <Link href="/ask" prefetch={false} className="ask-drawer-desk">
          <span className="ask-drawer-desk-mark" aria-hidden="true" />
          DESK
        </Link>
        <h1>The Drawer</h1>
        <span className="ask-drawer-stamped">
          STAMPED <b>{stamped}</b>
        </span>
      </header>
      <form className="ask-saved-find" onSubmit={(event) => event.preventDefault()}>
        <label className="ask-saved-find-kicker" htmlFor="ask-saved-q">
          FIND
        </label>
        <input
          id="ask-saved-q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="search saved answers and cards..."
          autoComplete="off"
          spellCheck={false}
        />
        <div className="ask-saved-kinds" role="radiogroup" aria-label="Kind">
          {(["all", "answers", "cards"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              className={kind === value ? "is-on" : undefined}
              onClick={() => setKind(value)}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </form>
      {error ? <div className="ask-error">{error}</div> : null}
      {copied ? <p className="ask-saved-copied">COPIED TO THE CLIP</p> : null}
      {groups.length === 0 ? (
        <p className="ask-saved-status">Nothing in the drawer matches.</p>
      ) : (
        <div className="ask-saved-drawers">
          {groups.map((group) => {
            const answers = group.filed;
            const stacks = group.filed.filter((row) => row.ticket.cards.length > 0);
            const showAnswers = kind !== "cards";
            const showCards = kind !== "answers";
            const answerCount = String(answers.length).padStart(2, "0");
            const cardCount = String(stacks.reduce((n, row) => n + row.ticket.cards.length, 0)).padStart(2, "0");
            return (
              <section key={group.key} className="ask-day">
                <div className="ask-day-head">
                  <span className="ask-day-tab">{group.label}</span>
                  <span className="ask-day-meta">
                    {answerCount} ANSWERS · {cardCount} CARDS
                  </span>
                </div>
                <div className={showCards && stacks.length > 0 && showAnswers ? "ask-day-board" : "ask-day-board is-solo"}>
                  {showAnswers ? (
                    <div className="ask-day-tickets">
                      {answers.map((row) => (
                        <Ticket
                          key={row.item.id}
                          filed={row}
                          open={openId === row.item.id ? openMode : null}
                          dropping={dropping === row.item.id}
                          copied={copied === row.item.id}
                          onOpen={(mode) => toggle(row.item.id, mode)}
                          onCopy={() => void copy(row.item)}
                          onDrop={() => void drop(row.item.id)}
                        />
                      ))}
                    </div>
                  ) : null}
                  {showCards && stacks.length > 0 ? (
                    <div className="ask-day-stubs">
                      {stacks.map((row) => (
                        <StubStack
                          key={`stub-${row.item.id}`}
                          filed={row}
                          from={(row.item.title || row.ticket.asked).toUpperCase()}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                {showCards && stacks.length === 0 && kind === "cards" ? (
                  <p className="ask-saved-status">No cards pulled from this day.</p>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
