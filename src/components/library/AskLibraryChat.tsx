"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ASK_MODEL, ASK_MODELS, type AskModelId } from "@/lib/ai/askModels";
import { parseAskAnswer } from "@/lib/library/askAnswer";
import type { AskUIMessage } from "@/lib/library/askLibrary";
import { AskMarkdown } from "@/components/library/AskMarkdown";

const STARTERS = [
  "why didn't SSDs inside the GPU work?",
  "what did I save about rate limiting?",
  "what have I learned about postgres?",
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

  const push = (hit: { title?: unknown; href?: unknown; kind?: unknown; ownerType?: unknown; ownerId?: unknown }) => {
    const title = typeof hit.title === "string" ? hit.title : "";
    const href = typeof hit.href === "string" ? hit.href : "";
    const key = `${hit.ownerType}:${hit.ownerId}`;
    if (!title || !href || seen.has(key)) return;
    seen.add(key);
    out.push({
      key,
      title,
      href,
      kind: typeof hit.kind === "string" ? hit.kind : "",
      ownerType: typeof hit.ownerType === "string" ? hit.ownerType : "bookmark",
      ownerId: typeof hit.ownerId === "string" ? hit.ownerId : "",
    });
  };

  for (const part of message.parts) {
    if (part.type !== "data-shelf" || !Array.isArray(part.data)) continue;
    for (const hit of part.data) push(hit);
  }
  return out;
}

function recordBookmarkUse(ownerId: string) {
  const id = Number(ownerId);
  if (!Number.isFinite(id)) return;
  fetch(`/api/bookmarks/${id}/use`, { method: "POST", credentials: "include" }).catch(() => {});
}

function AssistantAnswer({ text, streaming }: { text: string; streaming?: boolean }) {
  const { summary, body } = parseAskAnswer(text);
  return (
    <div className="ask-answer">
      {summary ? (
        <div className="ask-lede">
          <div className="ask-lede-kicker">THE SHORT OF IT</div>
          <div className="ask-lede-text">
            <AskMarkdown content={summary} />
            {streaming && !body ? <span className="ask-caret" aria-hidden /> : null}
          </div>
        </div>
      ) : null}
      {body ? (
        <div className="ask-answer-body">
          <AskMarkdown content={body} />
          {streaming ? <span className="ask-caret" aria-hidden /> : null}
        </div>
      ) : !summary && text ? (
        <div className="ask-answer-body">
          <AskMarkdown content={text} />
          {streaming ? <span className="ask-caret" aria-hidden /> : null}
        </div>
      ) : null}
    </div>
  );
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
            <p className="ask-empty-kicker">THE DESK</p>
            <p>
              Ask anything. We pull the card you saved, then answer like a small ChatGPT — even when the note is just a
              title or a video.
            </p>
            <div className="ask-starters">
              {STARTERS.map((starter) => (
                <button key={starter} type="button" className="ask-starter" onClick={() => ask(starter)}>
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const citations = message.role === "assistant" ? citationsFromMessage(message) : [];
            const text = message.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("");
            const live = busy && index === messages.length - 1 && message.role === "assistant";

            return (
              <article key={message.id} className={`ask-turn ask-turn-${message.role}`}>
                <div className="ask-role">{message.role === "user" ? "YOU" : "DESK"}</div>
                {message.role === "user" ? (
                  <div className="ask-user-bubble">{text}</div>
                ) : (
                  <>
                    {live && !text ? (
                      <div className="ask-searching">
                        <span className="ask-searching-dot" />
                        PULLING THE CARD…
                      </div>
                    ) : null}
                    {text ? <AssistantAnswer text={text} streaming={live} /> : null}
                    {citations.length > 0 ? (
                      <div className="ask-shelf">
                        <div className="ask-shelf-kicker">FROM THE SHELF</div>
                        <ul className="ask-cites">
                          {citations.map((cite) => {
                            const isTil = cite.ownerType === "til";
                            const onClick = () => {
                              if (!isTil) recordBookmarkUse(cite.ownerId);
                            };
                            return (
                              <li key={cite.key}>
                                <Link
                                  href={cite.href}
                                  target={isTil ? undefined : "_blank"}
                                  onClick={onClick}
                                >
                                  <span className="ask-cite-kind">{isTil ? "TIL" : cite.kind || "BM"}</span>
                                  <span className="ask-cite-title">{cite.title}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}
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
          placeholder="ask anything — or what you saved…"
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
