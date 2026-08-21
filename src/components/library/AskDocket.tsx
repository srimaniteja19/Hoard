"use client";

import Link from "next/link";
import { formatFolioWhen, type AskThreadListItem } from "@/lib/library/askThread";

export function AskDocket({
  threads,
  activeId,
  open,
  onFresh,
  onOpen,
  onDrop,
  onClose,
}: {
  threads: AskThreadListItem[];
  activeId: string | null;
  open: boolean;
  onFresh: () => void;
  onOpen: (id: string) => void;
  onDrop: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className={open ? "ask-docket-scrim is-on" : "ask-docket-scrim"}
        aria-label="Close docket"
        onClick={onClose}
      />
      <aside id="ask-docket" className={open ? "ask-docket is-open" : "ask-docket"} aria-label="Saved chats">
        <div className="ask-docket-head">
          <p className="ask-docket-kicker">FILE CABINET</p>
          <h2 className="ask-docket-title">
            THE
            <br />
            DOCKET
          </h2>
          <span className="ask-docket-count">{String(threads.length).padStart(2, "0")} FOLIOS</span>
        </div>

        <button type="button" className="ask-fresh" onClick={onFresh}>
          <span className="ask-fresh-plus" aria-hidden="true">
            +
          </span>
          <span className="ask-fresh-copy">
            <b>FRESH SHEET</b>
            <i>tear one off the pad</i>
          </span>
        </button>

        <div className="ask-docket-scroll">
          {threads.length === 0 ? (
            <p className="ask-docket-empty">
              Nothing on file.
              <br />
              Ask something — it lands here as a folio.
            </p>
          ) : (
            <ul className="ask-folios">
              {threads.map((thread, index) => {
                const n = String(threads.length - index).padStart(2, "0");
                const active = thread.id === activeId;
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      className={active ? "ask-folio is-live" : "ask-folio"}
                      onClick={() => onOpen(thread.id)}
                    >
                      <span className="ask-folio-meta">
                        <span className="ask-folio-n">#{n}</span>
                        <span className="ask-folio-when">{formatFolioWhen(thread.updatedAt)}</span>
                      </span>
                      <span className="ask-folio-title">{thread.title || "Untitled folio"}</span>
                      {thread.preview ? <span className="ask-folio-preview">{thread.preview}</span> : null}
                    </button>
                    <button
                      type="button"
                      className="ask-folio-drop"
                      aria-label={`Drop ${thread.title || "folio"}`}
                      onClick={() => onDrop(thread.id)}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Link href="/ask/saved" prefetch={false} className="ask-docket-kept">
          KEPT STAMPS →
        </Link>
      </aside>
    </>
  );
}
