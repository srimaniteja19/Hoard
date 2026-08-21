"use client";

import { MarkdownLite } from "@/components/til/MarkdownLite";
import { AskTable } from "@/components/library/AskTable";
import { parseAskAnswer, parseAskMarkdown, type AskMarkdownBlock } from "@/lib/library/askAnswer";
import { assignProvenance, plainAskText } from "@/lib/library/askDesk";
import type { AskShelfItem } from "@/lib/library/askLibrary";
import { useState } from "react";

function Inline({ text }: { text: string }) {
  return <MarkdownLite content={text} style={{ whiteSpace: "normal" }} />;
}

function ProvenanceInline({
  text,
  shelf,
  activeCite,
  onActiveCite,
}: {
  text: string;
  shelf: AskShelfItem[];
  activeCite: number | null;
  onActiveCite: (index: number | null) => void;
}) {
  const spans = assignProvenance(text, shelf);
  if (spans.every((span) => span.citeIndex == null)) {
    return <Inline text={text} />;
  }
  return (
    <>
      {spans.map((span, index) => (
        <span
          key={`${index}-${span.text.slice(0, 16)}`}
          className={
            span.citeIndex != null && span.citeIndex === activeCite
              ? "ask-prov is-hot"
              : span.citeIndex != null
                ? "ask-prov"
                : "ask-prov is-inferred"
          }
          data-cite={span.citeIndex != null ? String(span.citeIndex + 1).padStart(2, "0") : undefined}
          onMouseEnter={() => onActiveCite(span.citeIndex)}
          onMouseLeave={() => onActiveCite(null)}
        >
          <Inline text={span.text} />
          {index < spans.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

function BlockView({
  block,
  shelf,
  activeCite,
  onActiveCite,
  prompt,
}: {
  block: AskMarkdownBlock;
  shelf?: AskShelfItem[];
  activeCite: number | null;
  onActiveCite: (index: number | null) => void;
  prompt?: string;
}) {
  const inline =
    shelf && shelf.length > 0 ? (
      (text: string) => (
        <ProvenanceInline text={text} shelf={shelf} activeCite={activeCite} onActiveCite={onActiveCite} />
      )
    ) : (
      (text: string) => <Inline text={text} />
    );

  if (block.type === "heading") {
    const Tag = block.level === 3 ? "h4" : "h3";
    return (
      <Tag className={`ask-md-h ask-md-h${block.level}`}>
        <Inline text={block.text} />
      </Tag>
    );
  }
  if (block.type === "quote") {
    return <blockquote className="ask-md-quote">{inline(block.text)}</blockquote>;
  }
  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag className={`ask-md-list ${block.ordered ? "ask-md-ol" : "ask-md-ul"}`}>
        {block.items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 24)}`}>{inline(item)}</li>
        ))}
      </Tag>
    );
  }
  if (block.type === "table") {
    return <AskTable headers={block.headers} rows={block.rows} prompt={prompt} />;
  }
  return <p className="ask-md-p">{inline(block.text)}</p>;
}

export function AskMarkdown({
  content,
  lead,
  shelf,
  activeCite = null,
  onActiveCite,
  prompt,
}: {
  content: string;
  lead?: boolean;
  shelf?: AskShelfItem[];
  activeCite?: number | null;
  onActiveCite?: (index: number | null) => void;
  prompt?: string;
}) {
  const blocks = parseAskMarkdown(content);
  if (blocks.length === 0) return null;
  const hover = onActiveCite ?? (() => {});
  return (
    <div className={lead ? "ask-md ask-md-lead" : "ask-md"}>
      {blocks.map((block, index) => (
        <BlockView
          key={`${block.type}-${index}`}
          block={block}
          shelf={shelf}
          activeCite={activeCite}
          onActiveCite={hover}
          prompt={prompt}
        />
      ))}
    </div>
  );
}

export function AskAnswer({
  text,
  streaming,
  shelf,
  activeCite = null,
  onActiveCite,
  prompt,
}: {
  text: string;
  streaming?: boolean;
  shelf?: AskShelfItem[];
  activeCite?: number | null;
  onActiveCite?: (index: number | null) => void;
  prompt?: string;
}) {
  const { summary, body } = parseAskAnswer(text);
  const [copied, setCopied] = useState(false);
  const [flying, setFlying] = useState(false);
  const liveShelf = streaming ? undefined : shelf;

  async function tearOff() {
    if (streaming || !summary) return;
    try {
      await navigator.clipboard.writeText(plainAskText(summary));
    } catch {
      /* still tear */
    }
    setCopied(true);
    setFlying(true);
    window.setTimeout(() => setFlying(false), 900);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={streaming ? "ask-answer is-live" : "ask-answer"}>
      {summary ? (
        <div
          className={copied ? "ask-lede is-torn" : "ask-lede"}
          role={streaming ? undefined : "button"}
          tabIndex={streaming ? undefined : 0}
          onClick={tearOff}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              void tearOff();
            }
          }}
          aria-label={streaming ? undefined : "Copy the short of it"}
        >
          <div className="ask-lede-perf" aria-hidden="true" />
          <div className="ask-lede-kicker">
            THE SHORT OF IT
            {streaming ? <span className="ask-live-pill">LIVE</span> : null}
            {!streaming && copied ? <span className="ask-live-pill ask-copied-pill">TORN</span> : null}
            {!streaming && !copied ? <span className="ask-lede-hint">TEAR OFF</span> : null}
          </div>
          <div className="ask-lede-text">
            <AskMarkdown content={summary} prompt={prompt} />
            {streaming && !body ? <span className="ask-caret" aria-hidden /> : null}
          </div>
          {flying ? (
            <div className="ask-lede-fly" aria-hidden="true">
              {plainAskText(summary)}
            </div>
          ) : null}
        </div>
      ) : null}
      {body ? (
        <div className="ask-answer-body">
          <AskMarkdown
            content={body}
            lead
            shelf={liveShelf}
            activeCite={activeCite}
            onActiveCite={onActiveCite}
            prompt={prompt}
          />
          {streaming ? <span className="ask-caret" aria-hidden /> : null}
        </div>
      ) : !summary && text ? (
        <div className="ask-answer-body">
          <AskMarkdown content={text} lead shelf={liveShelf} activeCite={activeCite} onActiveCite={onActiveCite} prompt={prompt} />
          {streaming ? <span className="ask-caret" aria-hidden /> : null}
        </div>
      ) : null}
    </div>
  );
}
