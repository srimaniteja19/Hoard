"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ASK_MODEL, ASK_MODELS, type AskModelId } from "@/lib/ai/askModels";
import type { AskUIMessage } from "@/lib/library/askLibrary";

const STARTERS = [
  "what did I save about rate limiting?",
  "what have I learned about postgres?",
  "show me the auth notes I filed",
];

type Citation = {
  key: string;
  title: string;
  href: string;
  kind: string;
  ownerType: string;
  ownerId: string;
};

function citationsFromMessage(message: AskUIMessage): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool-fetchVector" || part.state !== "output-available") continue;
    const hits = Array.isArray(part.output) ? part.output : [];
    for (const hit of hits) {
      if (!hit || typeof hit !== "object") continue;
      const title = typeof hit.title === "string" ? hit.title : "";
      const href = typeof hit.href === "string" ? hit.href : "";
      const key = `${hit.ownerType}:${hit.ownerId}`;
      if (!title || !href || seen.has(key)) continue;
      seen.add(key);
      out.push({
        key,
        title,
        href,
        kind: typeof hit.kind === "string" ? hit.kind : "",
        ownerType: typeof hit.ownerType === "string" ? hit.ownerType : "bookmark",
        ownerId: typeof hit.ownerId === "string" ? hit.ownerId : "",
      });
    }
  }
  return out;
}

function recordBookmarkUse(ownerId: string) {
  const id = Number(ownerId);
  if (!Number.isFinite(id)) return;
  fetch(`/api/bookmarks/${id}/use`, { method: "POST", credentials: "include" }).catch(() => {});
}

export function AskLibraryChat() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<AskModelId>(ASK_MODEL);
  const modelRef = useRef(model);
  modelRef.current = model;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/library/ask",
        body: () => ({ model: modelRef.current }),
      }),
    []
  );
  const { messages, sendMessage, status, error, stop } = useChat<AskUIMessage>({
    transport,
  });
  const busy = status === "submitted" || status === "streaming";

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  function ask(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="ask-shell">
      <div className="ask-toolbar">
        <label htmlFor="ask-model">MODEL</label>
        <select
          id="ask-model"
          value={model}
          disabled={busy}
          onChange={(event) => setModel(event.target.value as AskModelId)}
        >
          {ASK_MODELS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.hint ? `${option.label} · ${option.hint}` : option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="ask-log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="ask-empty">
            <p>Ask what you already saved. Answers come from your bookmarks and TILs, with citations back to the source.</p>
            <div className="ask-starters">
              {STARTERS.map((starter) => (
                <button key={starter} type="button" className="ask-starter" onClick={() => ask(starter)}>
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const citations = message.role === "assistant" ? citationsFromMessage(message) : [];
            const searching = message.parts.some(
              (part) =>
                part.type === "tool-fetchVector" &&
                (part.state === "input-streaming" || part.state === "input-available")
            );
            const text = message.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("");

            return (
              <article key={message.id} className={`ask-turn ask-turn-${message.role}`}>
                <div className="ask-role">{message.role === "user" ? "YOU" : "LIBRARY"}</div>
                {searching && !text ? <div className="ask-searching">SEARCHING THE SHELF…</div> : null}
                {text ? <div className="ask-text">{text}</div> : null}
                {citations.length > 0 ? (
                  <ul className="ask-cites">
                    {citations.map((cite) => {
                      const isTil = cite.ownerType === "til";
                      const onClick = () => {
                        if (!isTil) recordBookmarkUse(cite.ownerId);
                      };
                      return (
                        <li key={cite.key}>
                          <Link href={cite.href} target={isTil ? undefined : "_blank"} onClick={onClick}>
                            <span className="ask-cite-kind">{isTil ? "TIL" : cite.kind || "BM"}</span>
                            {cite.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {message.parts.some((part) => isToolUIPart(part) && part.state === "output-error") ? (
                  <div className="ask-error">Search failed — try a shorter query.</div>
                ) : null}
              </article>
            );
          })
        )}
        {error ? <div className="ask-error">{error.message || "The library could not answer."}</div> : null}
      </div>

      <form className="ask-composer" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="what did I save about…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
        />
        {busy ? (
          <button type="button" onClick={() => stop()}>
            STOP
          </button>
        ) : (
          <button type="submit" className="prime" disabled={!input.trim()}>
            ASK
          </button>
        )}
      </form>
    </div>
  );
}
