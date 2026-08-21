import { MarkdownLite } from "@/components/til/MarkdownLite";
import { parseAskMarkdown, type AskMarkdownBlock } from "@/lib/library/askAnswer";

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

export function AskMarkdown({ content }: { content: string }) {
  const blocks = parseAskMarkdown(content);
  if (blocks.length === 0) return null;
  return (
    <div className="ask-md">
      {blocks.map((block, index) => (
        <BlockView key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}
