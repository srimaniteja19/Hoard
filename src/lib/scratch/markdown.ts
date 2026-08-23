export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function highlightCode(code: string): string {
  let s = escapeHtml(code);
  // Comments
  s = s.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*|--[^\n]*)/g, '<span class="cm">$1</span>');
  // Keywords
  s = s.replace(
    /\b(const|let|var|function|return|if|else|import|export|class|new|await|async|CREATE|UNIQUE|INDEX|ON|SELECT|FROM|WHERE|NULLS|NOT|DISTINCT|isolation|mix-blend-mode|opacity|transform|filter)\b/g,
    '<span class="kw">$1</span>'
  );
  // Strings
  s = s.replace(/(&quot;[^&]*?&quot;|'[^']*?')/g, '<span class="st">$1</span>');
  // Numbers with optional units
  s = s.replace(/\b(\d+(\.\d+)?(px|em|rem|%|s|ms)?)\b/g, '<span class="nu">$1</span>');
  return s;
}

export function inlineMarkdown(s: string): string {
  if (!s) return "";
  let res = escapeHtml(s);
  // Images: ![alt](url)
  res = res.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<span class="md-inline-img-wrap"><img src="$2" alt="$1" class="md-img" data-full-src="$2" loading="lazy" /></span>'
  );
  // Code: `code`
  res = res.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold: **text**
  res = res.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic: *text*
  res = res.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  // Highlight ==...==
  res = res.replace(/==([^=]+)==/g, "<mark>$1</mark>");
  // Strikethrough ~~...~~
  res = res.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  // Links [title](url)
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Hashtags #tag
  res = res.replace(/(^|\s)(#[a-zA-Z][\w-]*)/g, '$1<span class="tg">$2</span>');
  return res;
}

export function renderScratchMarkdown(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  function parseList(ordered: boolean): string {
    const items: Array<{ depth: number; text: string; done?: boolean; isTask?: boolean }> = [];
    let isTaskList = false;

    while (i < lines.length) {
      const line = lines[i];
      const match = line.match(ordered ? /^(\s*)\d+\.\s+(.*)$/ : /^(\s*)[-*]\s+(.*)$/);
      if (!match) break;

      const indent = match[1].length;
      const content = match[2];
      const taskMatch = content.match(/^\[([ xX])\]\s+(.*)$/);

      if (taskMatch) {
        isTaskList = true;
        items.push({
          depth: indent,
          text: taskMatch[2],
          done: taskMatch[1].toLowerCase() === "x",
          isTask: true,
        });
      } else {
        items.push({
          depth: indent,
          text: content,
          isTask: false,
        });
      }
      i++;
    }

    if (items.length === 0) {
      i++;
      return "";
    }

    const tag = ordered ? "ol" : "ul";
    let html = `<${tag}${isTaskList ? ' class="task"' : ""}>`;
    let openSub = 0;

    items.forEach((it) => {
      const isSub = it.depth >= 2;
      if (isSub && !openSub) {
        html += "<ul>";
        openSub = 1;
      }
      if (!isSub && openSub) {
        html += "</ul>";
        openSub = 0;
      }

      if (it.isTask) {
        html += `<li class="${it.done ? "on" : ""}"><span class="bx${it.done ? " on" : ""}">✓</span><span>${inlineMarkdown(
          it.text
        )}</span></li>`;
      } else {
        html += `<li>${inlineMarkdown(it.text)}</li>`;
      }
    });

    if (openSub) {
      html += "</ul>";
    }

    return html + `</${tag}>`;
  }

  while (i < lines.length) {
    const loopStartIndex = i;
    const L = lines[i];

    // Blank line
    if (!L.trim()) {
      i++;
      continue;
    }

    // Standalone Image Figure ![alt](url)
    const imgMatch = L.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      const altText = escapeHtml(imgMatch[1]);
      const imgUrl = escapeHtml(imgMatch[2]);
      out.push(
        `<figure class="md-figure" data-full-src="${imgUrl}"><div class="md-figure__wrap"><img src="${imgUrl}" alt="${altText}" class="md-img" loading="lazy" /><button type="button" class="md-figure__zoom" data-full-src="${imgUrl}">ZOOM ⊕</button></div>${
          altText ? `<figcaption>${inlineMarkdown(altText)}</figcaption>` : ""
        }</figure>`
      );
      i++;
      continue;
    }

    // Fenced code blocks ```lang
    if (/^```/.test(L)) {
      const lang = L.slice(3).trim() || "text";
      const codeBuffer: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeBuffer.push(lines[i]);
        i++;
      }
      if (i < lines.length && /^```/.test(lines[i])) {
        i++; // Skip closing ```
      }
      const rawCode = codeBuffer.join("\n");
      out.push(
        `<div class="cb"><div class="cb__h"><span>${escapeHtml(
          lang.toUpperCase()
        )}</span><button type="button" class="cb-copy-btn" data-code="${escapeHtml(
          rawCode
        )}">COPY</button></div><pre>${highlightCode(rawCode)}</pre></div>`
      );
      continue;
    }

    // Callout blocks :::type Title
    const calloutMatch = L.match(/^:::(\w+)\s*(.*)$/);
    if (calloutMatch) {
      const cType = calloutMatch[1];
      const cTitle = calloutMatch[2] || cType;
      const calloutBuffer: string[] = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        calloutBuffer.push(lines[i]);
        i++;
      }
      if (i < lines.length && /^:::\s*$/.test(lines[i])) {
        i++; // Skip closing :::
      }
      const calloutBody = calloutBuffer
        .filter((x) => x.trim())
        .map((x) => `<p>${inlineMarkdown(x)}</p>`)
        .join("");

      out.push(
        `<div class="co co--${escapeHtml(cType)}"><div class="co__h">${escapeHtml(
          cTitle.toUpperCase()
        )}</div><div class="co__b">${calloutBody}</div></div>`
      );
      continue;
    }

    // Tables | Header 1 | Header 2 |
    if (/^\|/.test(L) && /^\s*\|?[\s:-]+\|/.test(lines[i + 1] || "")) {
      const headers = L.split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      i += 2; // skip header and delimiter lines
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cols = lines[i]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (cols.length > 0) {
          rows.push(cols);
        }
        i++;
      }
      const thead = `<thead><tr>${headers
        .map((h) => `<th>${inlineMarkdown(h)}</th>`)
        .join("")}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map(
          (r) => `<tr>${r.map((c) => `<td>${inlineMarkdown(c)}</td>`).join("")}</tr>`
        )
        .join("")}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // Headings #, ##, ###, ####, #####, ######
    const hMatch = L.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      const level = Math.min(hMatch[1].length, 6);
      out.push(`<h${level}>${inlineMarkdown(hMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal Rule ---, ***, ___
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(L)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // Blockquotes >
    if (/^>\s?/.test(L)) {
      const quoteBuffer: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteBuffer.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${inlineMarkdown(quoteBuffer.join(" "))}</p></blockquote>`);
      continue;
    }

    // Unordered lists
    if (/^\s*[-*]\s+/.test(L)) {
      out.push(parseList(false));
      continue;
    }

    // Ordered lists
    if (/^\s*\d+\.\s+/.test(L)) {
      out.push(parseList(true));
      continue;
    }

    // Paragraph: consume current line and any continuation lines
    const pBuffer: string[] = [L];
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      if (!nextLine.trim()) break;
      // Stop if next line starts a block element or standalone image
      if (
        /^(#{1,6}\s|>|```|:::(\w+)|(-{3,}|\*{3,}|_{3,})\s*$|\s*[-*]\s+|\s*\d+\.\s+|^\s*!\[)/.test(
          nextLine
        )
      ) {
        break;
      }
      // Stop if next line is start of a table
      if (/^\|/.test(nextLine) && /^\s*\|?[\s:-]+\|/.test(lines[i + 1] || "")) {
        break;
      }
      pBuffer.push(nextLine);
      i++;
    }
    out.push(`<p>${inlineMarkdown(pBuffer.join(" "))}</p>`);

    // Absolute failsafe: guarantee loop progress
    if (i === loopStartIndex) {
      i++;
    }
  }

  return out.join("");
}
