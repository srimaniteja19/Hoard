"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type RefObject } from "react";
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

function subscribeNever() {
  return () => {};
}

function deskStamp(now = new Date()) {
  return now
    .toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    .replace(/,/g, "")
    .toUpperCase();
}

function AskComposer({
  web,
  busy,
  input,
  setInput,
  onSubmit,
  onComposerKey,
  composerRef,
  onToggleWire,
  stop,
  stamp,
}: {
  web: boolean;
  busy: boolean;
  input: string;
  setInput: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onComposerKey: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  onToggleWire: () => void;
  stop: () => void;
  stamp: string;
}) {
  const label = busy ? "THE DESK IS WRITING" : web ? "ASK THE SHELF — AND THE WIRE" : "ASK ANYTHING — OR WHAT YOU SAVED";
  const placeholder = web ? "weather in SF, or what I saved about postgres" : "why didn't the thing I saved actually work?";
  return (
    <form className="ask-composer" onSubmit={onSubmit}>
      <div className="ask-slip-head">
        <span className="ask-slip-kicker">CALL SLIP</span>
        <label className="ask-composer-label" htmlFor="ask-input">
          {label}
        </label>
        <span className="ask-slip-date">{stamp}</span>
      </div>
      <div className="ask-composer-row">
        <div className="ask-slip-request">
          <span className="ask-slip-field" aria-hidden="true">
            REQUEST
          </span>
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
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={web}
          aria-label="Search the web"
          className={web ? "ask-wire-pad is-on" : "ask-wire-pad"}
          disabled={busy}
          onClick={onToggleWire}
        >
          <b>WIRE</b>
          <i>{web ? "INKED" : "PAD"}</i>
        </button>
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
  );
}

export function AskLibraryChat({
  chatId,
  initialMessages = [],
  initialModel,
  initialWeb = false,
  threadTitle,
  docketOpen = false,
  onToggleDocket,
  onFresh,
  onPersist,
}: {
  chatId?: string;
  initialMessages?: AskUIMessage[];
  initialModel?: AskModelId;
  initialWeb?: boolean;
  threadTitle?: string;
  docketOpen?: boolean;
  onToggleDocket?: () => void;
  onFresh?: () => void;
  onPersist?: (input: { messages: AskUIMessage[]; model: AskModelId; web: boolean }) => void;
}) {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<AskModelId>(initialModel && ASK_MODELS.some((option) => option.id === initialModel) ? initialModel : ASK_MODEL);
  const [web, setWeb] = useState(initialWeb);
  const modelRef = useRef(model);
  modelRef.current = model;
  const webRef = useRef(web);
  webRef.current = web;
  const persistRef = useRef(onPersist);
  persistRef.current = onPersist;
  const logRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stickRef = useRef(true);
  const persistTimer = useRef<number>(0);
  const skipPersist = useRef(true);
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const stamp = mounted ? deskStamp() : "TODAY";
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/library/ask",
        body: () => ({ model: modelRef.current, web: webRef.current }),
      }),
    []
  );
  const { messages, sendMessage, status, error, stop } = useChat<AskUIMessage>({
    id: chatId,
    messages: initialMessages,
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

  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (!persistRef.current || messages.length === 0) return;
    window.clearTimeout(persistTimer.current);
    const wait = status === "streaming" || status === "submitted" ? 900 : 80;
    persistTimer.current = window.setTimeout(() => {
      persistRef.current?.({ messages, model: modelRef.current, web: webRef.current });
    }, wait);
    return () => window.clearTimeout(persistTimer.current);
  }, [messages, status, model, web]);

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
          <button
            type="button"
            className={docketOpen ? "ask-docket-toggle is-on" : "ask-docket-toggle"}
            aria-expanded={docketOpen}
            aria-controls="ask-docket"
            onClick={onToggleDocket}
          >
            DOCKET
          </button>
          <span className="ask-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="ask-masthead-name">{threadTitle ? threadTitle : "THE DESK"}</span>
          {busy ? <span className="ask-on-air">ON AIR</span> : <span className="ask-masthead-hours">OPEN</span>}
        </div>
        <div className="ask-masthead-tools">
          {onFresh ? (
            <button type="button" className="ask-toolbar-fresh" onClick={onFresh}>
              FRESH SHEET
            </button>
          ) : null}
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
            <div className="ask-blotter">
              <div className="ask-blotter-meta">
                <p className="ask-hero-kicker">THE READING ROOM</p>
                <span className="ask-blotter-date">{stamp}</span>
              </div>
              <div className="ask-blotter-desk">
                <div className="ask-folder" aria-hidden="true">
                  <span className="ask-folder-tab">FOLIO</span>
                  <span className="ask-folder-body">
                    <span className="ask-folder-peek">01</span>
                    closed
                  </span>
                </div>
                <div className="ask-blotter-copy">
                  <span className="ask-blotter-stamp">ASK</span>
                  <p className="ask-hero-dek">
                    Pull the card you saved, then get a real answer — even when the note is just a title or a
                    video. Every turn files itself in the docket.
                  </p>
                </div>
              </div>
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
                    web={web}
                    onAsk={submitText}
                  />
                )}
              </article>
            );
          })
        )}
        {error ? <div className="ask-error">{error.message || "The library could not answer."}</div> : null}
      </div>

      {mounted ? (
        <AskComposer
          web={web}
          busy={busy}
          input={input}
          setInput={setInput}
          onSubmit={onSubmit}
          onComposerKey={onComposerKey}
          composerRef={composerRef}
          onToggleWire={() => setWeb((on) => !on)}
          stop={stop}
          stamp={stamp}
        />
      ) : (
        <form className="ask-composer">
          <div className="ask-slip-head">
            <span className="ask-slip-kicker">CALL SLIP</span>
            <label className="ask-composer-label" htmlFor="ask-input">
              ASK ANYTHING — OR WHAT YOU SAVED
            </label>
            <span className="ask-slip-date">TODAY</span>
          </div>
          <div className="ask-composer-row">
            <div className="ask-slip-request">
              <span className="ask-slip-field" aria-hidden="true">
                REQUEST
              </span>
              <textarea id="ask-input" rows={1} placeholder="why didn't the thing I saved actually work?" disabled />
            </div>
            <button type="button" role="switch" aria-checked={false} aria-label="Search the web" className="ask-wire-pad" disabled>
              <b>WIRE</b>
              <i>PAD</i>
            </button>
            <button type="submit" className="prime" disabled>
              ASK
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
