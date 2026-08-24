import { describe, it, expect } from "vitest";
import { renderScratchMarkdown, inlineMarkdown, highlightCode } from "./markdown";

describe("renderScratchMarkdown", () => {
  it("handles basic formatting without infinite loop", () => {
    const md = "Hello **world** and *italic* and `code`";
    const res = renderScratchMarkdown(md);
    expect(res).toContain("<strong>world</strong>");
    expect(res).toContain("<em>italic</em>");
    expect(res).toContain("<code>code</code>");
  });

  it("handles unclosed streaming code blocks safely", () => {
    const md = "```ts\nconst x = 10;";
    const res = renderScratchMarkdown(md);
    expect(res).toContain('<div class="cb">');
    expect(res).toContain("const x = 10;");
  });

  it("handles standalone pipe and partial tables without looping", () => {
    const md1 = "|";
    expect(renderScratchMarkdown(md1)).toBe("<p>|</p>");

    const md2 = "| Col 1 | Col 2 |\n|";
    expect(() => renderScratchMarkdown(md2)).not.toThrow();

    const fullTable = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const res = renderScratchMarkdown(fullTable);
    expect(res).toContain("<table>");
    expect(res).toContain("<th>A</th>");
    expect(res).toContain("<td>1</td>");
  });

  it("handles callout blocks including unclosed stream", () => {
    const partial = ":::gotcha The tell\nsome body text";
    const res = renderScratchMarkdown(partial);
    expect(res).toContain("co--gotcha");
    expect(res).toContain("THE TELL");
    expect(res).toContain("some body text");
  });

  it("handles dangling ::: without looping", () => {
    expect(() => renderScratchMarkdown(":::")).not.toThrow();
  });

  it("handles task lists and nested lists", () => {
    const md = "- [ ] First task\n- [x] Done task\n- Simple item";
    const res = renderScratchMarkdown(md);
    expect(res).toContain('class="task"');
    expect(res).toContain('class="on"');
    expect(res).toContain("First task");
  });

  it("handles standalone and inline images", () => {
    const standalone = "![Design Draft](/api/scratch/assets/123)";
    const res1 = renderScratchMarkdown(standalone);
    expect(res1).toContain('<figure class="md-figure" data-full-src="/api/scratch/assets/123">');
    expect(res1).toContain('<img src="/api/scratch/assets/123" alt="Design Draft"');
    expect(res1).toContain("<figcaption>Design Draft</figcaption>");

    const inline = "Here is an inline ![diagram](/api/scratch/assets/456) in a sentence.";
    const res2 = renderScratchMarkdown(inline);
    expect(res2).toContain('<span class="md-inline-img-wrap"><img src="/api/scratch/assets/456" alt="diagram"');
  });

  it("handles :::ink, :::marg, and :::hand custom directives", () => {
    const md = `:::ink stacking-context, sketched
:::

:::marg
The three layers are the whole idea.
:::

:::hand
if the state is invisible, the error will be too
:::`;
    const res = renderScratchMarkdown(md);
    expect(res).toContain('<div class="inkblk">');
    expect(res).toContain('<span>✎ SKETCH</span>');
    expect(res).toContain('<div class="inkblk__f">stacking-context, sketched</div>');
    expect(res).toContain('<div class="marg">');
    expect(res).toContain('The three layers are the whole idea.');
    expect(res).toContain('<div class="hwtext">');
    expect(res).toContain('if the state is invisible, the error will be too');
  });
});

