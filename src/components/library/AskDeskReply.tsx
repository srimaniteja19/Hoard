"use client";

import { useState } from "react";
import Link from "next/link";
import { ASK_MODELS, type AskModelId } from "@/lib/ai/askModels";
import type { AskShelfItem, AskUIMessage } from "@/lib/library/askLibrary";
import {
  nextCardsFromShelf,
  notesFromShelf,
  shelfFromAskMessage,
} from "@/lib/library/askDesk";
import { wireFromAskMessage } from "@/lib/library/askWire";
import {
  buildAskSave,
  citationsFromAskMessage,
  questionForAssistantTurn,
  textFromAskMessage,
} from "@/lib/library/askSave";
import { streamAskOnce } from "@/lib/library/streamAskOnce";
import { AskAnswer } from "@/components/library/AskMarkdown";
import { AskShelf, AskWire } from "@/components/library/AskShelf";

function recordBookmarkUse(ownerId: string) {
  const id = Number(ownerId);
  if (!Number.isFinite(id)) return;
  fetch(`/api/bookmarks/${id}/use`, { method: "POST", credentials: "include" }).catch(() => {});
}

const PULLING = ["PULLING THE CARD…", "READING THE MARGIN…", "CROSS-REFERENCING…", "INKING THE ANSWER…"];
const PULLING_WIRE = ["CUTTING THE WIRE…", "READING THE FEED…", "CROSS-REFERENCING…", "INKING THE ANSWER…"];

function Searching({ web }: { web?: boolean }) {
  const lines = web ? PULLING_WIRE : PULLING;
  return (
    <div className="ask-searching">
      <div className="ask-searching-deck" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <div className="ask-searching-kicker">{web ? "THE WIRE" : "THE CATALOG"}</div>
        <div className="ask-searching-msg">
          <div className="ask-searching-reel">
            {lines.map((line, index) => (
              <span key={`${index}-${line}`}>{line}</span>
            ))}
            <span>{lines[0]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AskPull({ shelf }: { shelf: AskShelfItem[] }) {
  return (
    <div className="ask-pull">
      <div className="ask-pull-kicker">THE PULL · {String(shelf.length).padStart(2, "0")} CARDS</div>
      <ul className="ask-pull-deck">
        {shelf.map((hit, index) => (
          <li key={`${hit.ownerType}:${hit.ownerId}`} style={{ ["--i" as string]: index }}>
            <span className="ask-cite-num">{String(index + 1).padStart(2, "0")}</span>
            <span className="ask-cite-kind">{hit.ownerType === "til" ? "TIL" : hit.kind || "BM"}</span>
            <span className="ask-cite-title">{hit.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AskMargins({ shelf }: { shelf: AskShelfItem[] }) {
  const notes = notesFromShelf(shelf);
  if (notes.length === 0) return null;
  return (
    <div className="ask-margins">
      {notes.map((hit) => (
        <blockquote key={`${hit.ownerType}:${hit.ownerId}`} className="ask-margin">
          <div className="ask-margin-kicker">YOUR MARGIN · {hit.title}</div>
          <p>{hit.note}</p>
        </blockquote>
      ))}
    </div>
  );
}

function AskNextCards({
  question,
  answer,
  shelf,
  disabled,
  onAsk,
}: {
  question: string;
  answer: string;
  shelf: AskShelfItem[];
  disabled: boolean;
  onAsk: (text: string) => void;
}) {
  const cards = nextCardsFromShelf(question, answer, shelf);
  if (cards.length === 0) return null;
  return (
    <div className="ask-next">
      <div className="ask-next-kicker">NEXT CARDS</div>
      <div className="ask-next-row">
        {cards.map((card, index) => (
          <button
            key={card.ownerKey || `next-${index}`}
            type="button"
            className="ask-next-card"
            style={{ ["--i" as string]: index }}
            disabled={disabled}
            onClick={() => onAsk(card.question)}
          >
            <span className="ask-next-n">{String(index + 1).padStart(2, "0")}</span>
            <span className="ask-next-q">{card.question}</span>
            <span className="ask-next-from">{card.from}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type CarbonState = {
  model: AskModelId;
  status: "streaming" | "ready" | "error";
  text: string;
  shelf: AskShelfItem[];
  front: boolean;
};

function nextModel(current: AskModelId): AskModelId {
  const ids = ASK_MODELS.map((item) => item.id);
  const index = ids.indexOf(current);
  return ids[(index + 1) % ids.length] ?? current;
}

function modelLabel(id: AskModelId): string {
  return ASK_MODELS.find((item) => item.id === id)?.label ?? id;
}

function KeepAnswer({
  messages,
  index,
  model,
  disabled,
}: {
  messages: AskUIMessage[];
  index: number;
  model: AskModelId;
  disabled: boolean;
}) {
  const [state, setState] = useState<"idle" | "saving" | "kept" | "error">("idle");

  async function keep() {
    if ((state !== "idle" && state !== "error") || disabled) return;
    const message = messages[index];
    if (!message || message.role !== "assistant") return;
    setState("saving");
    try {
      const body = buildAskSave({
        question: questionForAssistantTurn(messages, index),
        answer: textFromAskMessage(message),
        citations: citationsFromAskMessage(message),
        model,
      });
      const res = await fetch("/api/library/ask/saves", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("keep failed");
      setState("kept");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="ask-keep">
      <button
        type="button"
        className={state === "kept" ? "ask-keep-btn is-kept" : "ask-keep-btn"}
        onClick={keep}
        disabled={disabled || state === "saving" || state === "kept"}
      >
        {state === "kept" ? "KEPT" : state === "saving" ? "INKING…" : "KEEP"}
      </button>
      {state === "error" ? (
        <span className="ask-keep-err">Could not save.</span>
      ) : (
        <Link href="/ask/saved" prefetch={false} className="ask-keep-hint">
          File in the margin →
        </Link>
      )}
    </div>
  );
}

export function AskDeskReply({
  messages,
  index,
  model,
  busy,
  live,
  web,
  onAsk,
}: {
  messages: AskUIMessage[];
  index: number;
  model: AskModelId;
  busy: boolean;
  live: boolean;
  web?: boolean;
  onAsk: (text: string) => void;
}) {
  const message = messages[index];
  const text = textFromAskMessage(message);
  const shelf = shelfFromAskMessage(message);
  const wire = wireFromAskMessage(message);
  const citations = citationsFromAskMessage(message);
  const question = questionForAssistantTurn(messages, index);
  const [activeCite, setActiveCite] = useState<number | null>(null);
  const [carbon, setCarbon] = useState<CarbonState | null>(null);

  async function runCarbon() {
    if (busy || carbon?.status === "streaming") return;
    const carbonId = nextModel(model);
    setCarbon({ model: carbonId, status: "streaming", text: "", shelf: [], front: false });
    try {
      const result = await streamAskOnce({
        question,
        model: carbonId,
        web,
        onText: (next) => {
          setCarbon((current) => (current ? { ...current, text: next } : current));
        },
        onShelf: (next) => {
          setCarbon((current) => (current ? { ...current, shelf: next } : current));
        },
      });
      setCarbon({ model: carbonId, status: "ready", text: result.text, shelf: result.shelf, front: false });
    } catch {
      setCarbon((current) =>
        current ? { ...current, status: "error" } : { model: carbonId, status: "error", text: "", shelf: [], front: false }
      );
    }
  }

  return (
    <div className="ask-desk-col">
      {live && !text ? shelf.length > 0 ? <AskPull shelf={shelf} /> : <Searching web={web || wire.length > 0} /> : null}
      {text ? (
        <div className={carbon ? "ask-stack" : undefined}>
          <div className={carbon?.front ? "ask-stack-front is-back" : "ask-stack-front"}>
            <AskAnswer
              text={text}
              streaming={live}
              shelf={shelf}
              activeCite={activeCite}
              onActiveCite={setActiveCite}
              prompt={question}
            />
          </div>
          {carbon ? (
            <div className={carbon.front ? "ask-carbon is-front" : "ask-carbon"}>
              <button
                type="button"
                className="ask-carbon-tab"
                onClick={() => setCarbon((current) => (current ? { ...current, front: !current.front } : current))}
              >
                CARBON · {modelLabel(carbon.model)}
                {carbon.status === "streaming" ? " · LIVE" : ""}
                {carbon.status === "error" ? " · FAILED" : ""}
              </button>
              {carbon.text ? (
                <AskAnswer text={carbon.text} streaming={carbon.status === "streaming"} shelf={carbon.shelf} prompt={question} />
              ) : carbon.status === "error" ? (
                <p className="ask-keep-err" style={{ padding: "10px 12px" }}>
                  Could not pull a carbon copy.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {!live && text ? <AskMargins shelf={shelf} /> : null}
      <AskShelf
        citations={citations}
        activeCite={activeCite}
        onActiveCite={setActiveCite}
        onOpen={(cite) => {
          if (cite.ownerType !== "til") recordBookmarkUse(cite.ownerId);
        }}
      />
      <AskWire items={wire} />
      {text && !live ? (
        <>
          <AskNextCards question={question} answer={text} shelf={shelf} disabled={busy} onAsk={onAsk} />
          <div className="ask-actions">
            <KeepAnswer messages={messages} index={index} model={model} disabled={busy} />
            <button
              type="button"
              className="ask-carbon-btn"
              onClick={() => void runCarbon()}
              disabled={busy || carbon?.status === "streaming" || !question}
            >
              {carbon?.status === "streaming" ? "CARBON…" : carbon ? "RE-CARBON" : "CARBON"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
