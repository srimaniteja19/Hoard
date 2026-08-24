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

    // Custom container blocks :::ink, :::marg, :::hand, or :::type Title
    const calloutMatch = L.match(/^:::(\w+)\s*(.*)$/);
    if (calloutMatch) {
      const cType = calloutMatch[1].toLowerCase();
      const cTitle = calloutMatch[2] || "";
      const calloutBuffer: string[] = [];
      i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        calloutBuffer.push(lines[i]);
        i++;
      }
      if (i < lines.length && /^:::\s*$/.test(lines[i])) {
        i++; // Skip closing :::
      }

      // 1. INK SKETCH BLOCK (:::ink <title>)
      if (cType === "ink") {
        const bodyContent = calloutBuffer.join("\n").trim();
        let svgMarkup = "";
        let strokeCount = 0;

        if (bodyContent.startsWith("<svg") || bodyContent.includes("<svg")) {
          svgMarkup = bodyContent;
          const pathMatches = bodyContent.match(/<path/g);
          strokeCount = pathMatches ? pathMatches.length : 12;
        } else {
          // Check standard sample sketches
          const key = cTitle.toLowerCase();
          if (key.includes("stacking") || key.includes("ancestor") || key.includes("blend")) {
            svgMarkup = '<svg viewBox="0 0 460 96" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#0A0A0A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20 C 110 16, 210 20, 300 17 C 303 42, 302 70, 300 86 C 210 89, 110 85, 20 87 C 16 62, 18 38, 18 20 Z"/><path d="M40 40 C 100 37, 160 40, 214 38 C 217 52, 216 66, 214 74 C 160 76, 100 73, 42 75 C 38 62, 40 50, 40 40 Z"/></g><g fill="none" stroke="#7B5CF0" stroke-width="3" stroke-linecap="round"><path d="M318 52 C 350 52, 380 52, 412 52 M400 44 L 414 52 L 400 60"/></g><text x="50" y="34" font-family="Caveat,cursive" font-size="22" fill="#0A0A0A">ancestor</text><text x="60" y="60" font-family="Caveat,cursive" font-size="23" fill="#7B5CF0">blend lives here</text><text x="322" y="82" font-family="Caveat,cursive" font-size="21" fill="#7B5CF0">wrong backdrop</text></svg>';
            strokeCount = 41;
          } else if (key.includes("fix") || key.includes("isolate") || key.includes("card")) {
            svgMarkup = '<svg viewBox="0 0 500 108" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#A8E85C" stroke-width="16" stroke-linecap="round" opacity=".5" style="mix-blend-mode:multiply"><path d="M32 48 C 140 44, 250 50, 344 46"/></g><text x="32" y="56" font-family="Space Mono,monospace" font-size="18" font-weight="700" fill="#0A0A0A">.card { isolation: isolate }</text><g fill="none" stroke="#FF3D8A" stroke-width="2.8" stroke-linecap="round"><path d="M28 70 C 140 84, 268 80, 366 68 M356 60 L 370 68 L 354 76"/></g><text x="112" y="100" font-family="Caveat,cursive" font-size="21" fill="#FF3D8A">now it has a known backdrop</text></svg>';
            strokeCount = 18;
          } else if (key.includes("wear") || key.includes("number") || key.includes("hover")) {
            svgMarkup = '<svg viewBox="0 0 460 78" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#0A0A0A" stroke-width="2.3" stroke-linecap="round"><path d="M14 40 C 22 24, 36 22, 42 32 C 48 44, 36 50, 34 42 C 33 30, 44 20, 56 26"/><path d="M70 22 L 70 46 M70 54 L 70 56"/></g><text x="86" y="34" font-family="Caveat,cursive" font-size="27" fill="#0A0A0A">is wear better than a number?</text><text x="86" y="62" font-family="Caveat,cursive" font-size="27" fill="#FF3D8A">both — wear first, count on hover</text><g fill="none" stroke="#FF3D8A" stroke-width="2.6" stroke-linecap="round"><path d="M70 58 C 90 70, 260 70, 330 60"/></g></svg>';
            strokeCount = 28;
          } else {
            svgMarkup = `<svg viewBox="0 0 460 70" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#0A0A0A" stroke-width="2.2" stroke-linecap="round"><path d="M20 35 C 100 20, 220 50, 440 35"/></g><text x="30" y="55" font-family="Caveat,cursive" font-size="22" fill="#7B5CF0">${escapeHtml(cTitle || "sketch")}</text></svg>`;
            strokeCount = 9;
          }
        }

        out.push(
          `<div class="inkblk"><div class="inkblk__h"><span>✎ SKETCH</span><span>${strokeCount} STROKES</span></div><div class="inkblk__c">${svgMarkup}</div>${
            cTitle ? `<div class="inkblk__f">${escapeHtml(cTitle)}</div>` : ""
          }</div>`
        );
        continue;
      }

      // 2. MARGIN NOTE BLOCK (:::marg)
      if (cType === "marg") {
        const margSvg = '<svg viewBox="0 0 52 56" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#FF3D8A" stroke-width="2.5" stroke-linecap="round"><path d="M13 11 C 37 6, 47 22, 32 33 C 19 42, 6 31, 13 16"/><path d="M9 17 C 35 8, 48 26, 30 39 C 15 48, 2 35, 11 20"/></g><text x="5" y="54" font-family="Caveat,cursive" font-size="18" fill="#FF3D8A">!!</text></svg>';
        const paragraphs = calloutBuffer
          .filter((x) => x.trim())
          .map((x) => `<p>${inlineMarkdown(x)}</p>`)
          .join("");
        out.push(
          `<div class="marg"><div class="marg__m">${margSvg}</div>${paragraphs}</div>`
        );
        continue;
      }

      // 3. HANDWRITTEN BLOCK (:::hand)
      if (cType === "hand") {
        const handText = calloutBuffer
          .filter((x) => x.trim())
          .map((x) => escapeHtml(x))
          .join("<br>");
        out.push(`<div class="hwtext">${handText}</div>`);
        continue;
      }

      // 4. STANDARD TAXONOMY CALLOUT (:::gotcha, :::question, :::action, :::fact, etc.)
      const calloutBody = calloutBuffer
        .filter((x) => x.trim())
        .map((x) => `<p>${inlineMarkdown(x)}</p>`)
        .join("");

      out.push(
        `<div class="co co--${escapeHtml(cType)}"><div class="co__h">${escapeHtml(
          (cTitle || cType).toUpperCase()
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
