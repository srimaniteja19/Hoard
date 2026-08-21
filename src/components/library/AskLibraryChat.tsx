"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ASK_MODEL, ASK_MODELS, type AskModelId } from "@/lib/ai/askModels";
import type { AskUIMessage } from "@/lib/library/askLibrary";
import { textFromAskMessage } from "@/lib/library/askSave";
import { AskDeskReply } from "@/components/library/AskDeskReply";

const STARTERS = [
  { n: "01", tag: "SYSTEMS", q: "why didn't SSDs inside the GPU work?" },
  { n: "02", tag: "NET", q: "what did I save about rate limiting?" },
  { n: "03", tag: "DATA", q: "what have I learned about postgres?" },
];

function resizeComposer(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

export function AskLibraryChat() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<AskModelId>(ASK_MODEL);
  const modelRef = useRef(model);
  modelRef.current = model;
  const logRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stickRef = useRef(true);
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
    onError: () => {},
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = logRef.current;
    if (!el || !stickRef.current) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: status === "streaming" ? "auto" : "smooth",
    });
  }, [messages, status]);

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    stickRef.current = true;
    void sendMessage({ text: trimmed }).catch(() => {});
    setInput("");
    requestAnimationFrame(() => resizeComposer(composerRef.current));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submitText(input);
  }

  function onComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitText(input);
    }
  }

  let userN = 0;
  let deskN = 0;

  return (
    <div className={messages.length === 0 ? "ask-shell is-empty" : "ask-shell"}>
      <div className="ask-masthead">
        <div className="ask-masthead-brand">
          <span className="ask-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="ask-masthead-name">THE DESK</span>
          {busy ? <span className="ask-on-air">ON AIR</span> : <span className="ask-masthead-hours">OPEN</span>}
        </div>
        <Link
          href="/ask/saved"
          prefetch={false}
          className="ask-toolbar-saved"
          onClick={() => {
            if (busy) stop();
          }}
        >
          KEPT
        </Link>
      </div>

      <div className="ask-models" role="radiogroup" aria-label="Model">
        {ASK_MODELS.map((option) => (
          <button
            key={option.id}
            type="button"
            className="ask-model"
            role="radio"
            aria-checked={model === option.id}
            disabled={busy}
            onClick={() => setModel(option.id)}
          >
            {option.label}
            {option.hint ? <span className="ask-model-hint">{option.hint}</span> : null}
          </button>
        ))}
      </div>

      <div
        className="ask-log"
        aria-live="polite"
        ref={logRef}
        onScroll={() => {
          const el = logRef.current;
          if (!el) return;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
        }}
      >
        {messages.length === 0 ? (
          <div className="ask-empty">
            <p className="ask-hero-kicker">THE READING ROOM</p>
            <h2 className="ask-hero-title">
              <span className="ask-hero-stamp">ASK</span>
              <span className="ask-hero-rest">the shelf</span>
            </h2>
            <p className="ask-hero-dek">
              Pull the card you saved, then get a real answer — even when the note is just a title or a
              video.
            </p>
            <div className="ask-starters">
              {STARTERS.map((starter) => (
                <button
                  key={starter.q}
                  type="button"
                  className="ask-starter"
                  onClick={() => submitText(starter.q)}
                >
                  <span className="ask-starter-meta">
                    <span className="ask-starter-n">{starter.n}</span>
                    <span className="ask-starter-tag">{starter.tag}</span>
                  </span>
                  <span className="ask-starter-q">{starter.q}</span>
                  <span className="ask-starter-go">PULL →</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const text = textFromAskMessage(message);
            const live = busy && index === messages.length - 1 && message.role === "assistant";
            if (message.role === "user") userN += 1;
            else deskN += 1;
            const folio = String(message.role === "user" ? userN : deskN).padStart(2, "0");

            return (
              <article key={message.id} className={`ask-turn ask-turn-${message.role}`}>
                <div className={message.role === "user" ? "ask-stub" : "ask-stub ask-stub-desk"}>
                  {message.role === "user" ? "YOU" : "DESK"}
                  <span>{folio}</span>
                </div>
                {message.role === "user" ? (
                  <div className="ask-user-bubble">{text}</div>
                ) : (
                  <AskDeskReply
                    messages={messages}
                    index={index}
                    model={model}
                    busy={busy}
                    live={live}
                    onAsk={submitText}
                  />
                )}
              </article>
            );
          })
        )}
        {error ? <div className="ask-error">{error.message || "The library could not answer."}</div> : null}
      </div>

      <form className="ask-composer" onSubmit={onSubmit}>
        <label className="ask-composer-label" htmlFor="ask-input">
          {busy ? "THE DESK IS WRITING" : "ASK ANYTHING — OR WHAT YOU SAVED"}
        </label>
        <div className="ask-composer-row">
          <textarea
            id="ask-input"
            ref={composerRef}
            value={input}
            rows={1}
            onChange={(event) => {
              setInput(event.target.value);
              resizeComposer(event.target);
            }}
            onKeyDown={onComposerKey}
            placeholder="why didn't the thing I saved actually work?"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
          />
          {busy ? (
            <button type="button" className="ask-stop" onClick={() => stop()}>
              STOP
            </button>
          ) : (
            <button type="submit" className="prime" disabled={!input.trim()}>
              ASK
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
