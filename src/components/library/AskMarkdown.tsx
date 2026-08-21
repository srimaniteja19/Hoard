import { MarkdownLite } from "@/components/til/MarkdownLite";
import { parseAskAnswer, parseAskMarkdown, type AskMarkdownBlock } from "@/lib/library/askAnswer";

function Inline({ text }: { text: string }) {
  return <MarkdownLite content={text} style={{ whiteSpace: "normal" }} />;
}

function BlockView({ block }: { block: AskMarkdownBlock }) {
  if (block.type === "heading") {
    const Tag = block.level === 3 ? "h4" : "h3";
    return (
      <Tag className={`ask-md-h ask-md-h${block.level}`}>
        <Inline text={block.text} />
      </Tag>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote className="ask-md-quote">
        <Inline text={block.text} />
      </blockquote>
    );
  }
  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag className={`ask-md-list ${block.ordered ? "ask-md-ol" : "ask-md-ul"}`}>
        {block.items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 24)}`}>
            <Inline text={item} />
          </li>
        ))}
      </Tag>
    );
  }
  return (
    <p className="ask-md-p">
      <Inline text={block.text} />
    </p>
  );
}

export function AskMarkdown({ content, lead }: { content: string; lead?: boolean }) {
  const blocks = parseAskMarkdown(content);
  if (blocks.length === 0) return null;
  return (
    <div className={lead ? "ask-md ask-md-lead" : "ask-md"}>
      {blocks.map((block, index) => (
        <BlockView key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}

export function AskAnswer({ text, streaming }: { text: string; streaming?: boolean }) {
  const { summary, body } = parseAskAnswer(text);
  return (
    <div className={streaming ? "ask-answer is-live" : "ask-answer"}>
      {summary ? (
        <div className="ask-lede">
          <div className="ask-lede-kicker">
            THE SHORT OF IT
            {streaming ? <span className="ask-live-pill">LIVE</span> : null}
          </div>
          <div className="ask-lede-text">
            <AskMarkdown content={summary} />
            {streaming && !body ? <span className="ask-caret" aria-hidden /> : null}
          </div>
        </div>
      ) : null}
      {body ? (
        <div className="ask-answer-body">
          <AskMarkdown content={body} lead />
          {streaming ? <span className="ask-caret" aria-hidden /> : null}
        </div>
      ) : !summary && text ? (
        <div className="ask-answer-body">
          <AskMarkdown content={text} lead />
          {streaming ? <span className="ask-caret" aria-hidden /> : null}
        </div>
      ) : null}
    </div>
  );
}
