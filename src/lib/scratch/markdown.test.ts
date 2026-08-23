import { describe, it, expect } from "vitest";
import { renderScratchMarkdown, inlineMarkdown, highlightCode } from "./markdown";

describe("renderScratchMarkdown", () => {
  it("renders headings", () => {
    const md = "# Title 1\n## Title 2\n### Title 3";
    const html = renderScratchMarkdown(md);
    expect(html).toContain("<h1>Title 1</h1>");
    expect(html).toContain("<h2>Title 2</h2>");
    expect(html).toContain("<h3>Title 3</h3>");
  });

  it("renders custom callouts", () => {
    const md = ":::gotcha The tell is always the same\nNone of the three errors named the thing.\n:::";
    const html = renderScratchMarkdown(md);
    expect(html).toContain('<div class="co co--gotcha">');
    expect(html).toContain('<div class="co__h">THE TELL IS ALWAYS THE SAME</div>');
    expect(html).toContain("<p>None of the three errors named the thing.</p>");
  });

  it("renders tables", () => {
    const md = "| Where | Symptom |\n| --- | --- |\n| CSS | blend mode muddy |";
    const html = renderScratchMarkdown(md);
    expect(html).toContain("<table><thead><tr><th>Where</th><th>Symptom</th></tr></thead>");
    expect(html).toContain("<tbody><tr><td>CSS</td><td>blend mode muddy</td></tr></tbody></table>");
  });

  it("renders task lists with active checkboxes", () => {
    const md = "- [x] Done item\n- [ ] Pending item";
    const html = renderScratchMarkdown(md);
    expect(html).toContain('<ul class="task">');
    expect(html).toContain('<li class="on"><span class="bx on">✓</span><span>Done item</span></li>');
    expect(html).toContain('<li class=""><span class="bx">✓</span><span>Pending item</span></li>');
  });

  it("renders code blocks with syntax highlighting", () => {
    const md = "```css\n.card {\n  isolation: isolate;\n}\n```";
    const html = renderScratchMarkdown(md);
    expect(html).toContain('<div class="cb">');
    expect(html).toContain("<span>CSS</span>");
    expect(html).toContain('<span class="kw">isolation</span>');
  });

  it("renders inline marks, tags, and formatting", () => {
    const res = inlineMarkdown("**bold** *italic* ==highlight== ~~strike~~ `code` #design");
    expect(res).toContain("<strong>bold</strong>");
    expect(res).toContain("<em>italic</em>");
    expect(res).toContain("<mark>highlight</mark>");
    expect(res).toContain("<del>strike</del>");
    expect(res).toContain("<code>code</code>");
    expect(res).toContain('<span class="tg">#design</span>');
  });
});
