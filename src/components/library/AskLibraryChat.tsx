"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ASK_MODEL, ASK_MODELS, type AskModelId } from "@/lib/ai/askModels";
import type { AskUIMessage } from "@/lib/library/askLibrary";
import {
  buildAskSave,
  citationsFromAskMessage,
  questionForAssistantTurn,
  textFromAskMessage,
} from "@/lib/library/askSave";
import { AskAnswer } from "@/components/library/AskMarkdown";

const STARTERS = [
  "why didn't SSDs inside the GPU work?",
  "what did I save about rate limiting?",
  "what have I learned about postgres?",
];

function recordBookmarkUse(ownerId: string) {
  const id = Number(ownerId);
  if (!Number.isFinite(id)) return;
  fetch(`/api/bookmarks/${id}/use`, { method: "POST", credentials: "include" }).catch(() => {});
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
      <button type="button" className="ask-keep-btn" onClick={keep} disabled={disabled || state === "saving" || state === "kept"}>
        {state === "kept" ? "KEPT" : state === "saving" ? "KEEPING…" : "KEEP"}
      </button>
      {state === "error" ? (
        <span className="ask-keep-err">Could not save.</span>
      ) : (
        <Link href="/ask/saved" className="ask-keep-hint">
          Saved answers
        </Link>
      )}
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
        <Link href="/ask/saved" className="ask-toolbar-saved">
          SAVED
        </Link>
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
            const citations = message.role === "assistant" ? citationsFromAskMessage(message) : [];
            const text = textFromAskMessage(message);
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
                    {text ? <AskAnswer text={text} streaming={live} /> : null}
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
                              <li key={`${cite.ownerType}:${cite.ownerId}`}>
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
                    {text && !live ? (
                      <KeepAnswer messages={messages} index={index} model={model} disabled={busy} />
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
