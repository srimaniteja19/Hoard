"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";

interface InlineTextEditorProps {
  value: string;
  onChange: (nextVal: string) => void;
  onInsertBelow?: () => void;
  onDeleteBlock?: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  onTransformBlock?: (props: Partial<Block>) => void;
  onSlashCommand?: (query: string, rect: DOMRect | null) => void;
  onSlashKeyDown?: (e: React.KeyboardEvent) => boolean;
  renderFormatted?: (val: string) => React.ReactNode;
  as?: "p" | "h2" | "h3" | "div" | "blockquote";
  style?: React.CSSProperties;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Converts raw markdown/HTML into rich formatted HTML for the WYSIWYG contentEditable view
 */
export const formatToHTML = (text: string): string => {
  if (!text) return "";

  let html = text;

  // Convert **bold** to <strong style="...">
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="background: #FCE94F; color: #0A0A0A; padding: 0 4px; border-radius: 1px;">$1</strong>'
  );

  // Convert `code` to <code style="...">
  html = html.replace(
    /`([^`]+)`/g,
    '<code style="font-family: var(--mono, monospace); font-size: 0.88em; background: #EBE7DC; border: 1.5px solid #0A0A0A; padding: 1px 5px; color: #0A0A0A;">$1</code>'
  );

  // Convert *italic* or _italic_ to <em>
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>");

  // Format existing <strong> tags with the signature yellow highlight if not styled
  html = html.replace(
    /<strong>((?!style=)[\s\S])*?<\/strong>/gi,
    (match) => match.replace('<strong', '<strong style="background: #FCE94F; color: #0A0A0A; padding: 0 4px; border-radius: 1px;"')
  );

  return html;
};

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  value,
  onChange,
  onInsertBelow,
  onDeleteBlock,
  onFocusPrevious,
  onFocusNext,
  onTransformBlock,
  onSlashCommand,
  onSlashKeyDown,
  as = "p",
  style = {},
  placeholder = "Type something, or press '/' for commands…",
  autoFocus = false,
}) => {
  const elRef = useRef<HTMLElement>(null);
  const isComposingRef = useRef(false);
  const lastSavedValueRef = useRef(value);

  // Set initial content without causing React reconciliation loops
  useEffect(() => {
    const el = elRef.current;
    if (el) {
      if (document.activeElement !== el) {
        const formatted = formatToHTML(value);
        if (el.innerHTML !== formatted) {
          el.innerHTML = formatted;
        }
      }
      lastSavedValueRef.current = value;
    }
  }, [value]);

  // Handle auto-focus on mount
  useEffect(() => {
    if (autoFocus && elRef.current) {
      elRef.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(elRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [autoFocus]);

  const saveContent = useCallback(() => {
    if (!elRef.current) return;
    const currentHTML = elRef.current.innerHTML;
    // Normalize content
    let clean = currentHTML
      .replace(/<strong[^>]*style="[^"]*background:[^"]*"[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/<div>/gi, "\n")
      .replace(/<\/div>/gi, "");

    // Strip remaining tags if any
    clean = clean.replace(/<\/?[^>]+(>|$)/g, "");

    if (clean !== lastSavedValueRef.current) {
      lastSavedValueRef.current = clean;
      onChange(clean);
    }
  }, [onChange]);

  const handleInput = () => {
    if (isComposingRef.current || !elRef.current) return;

    const rawText = elRef.current.innerText || "";

    // ── 1. Notion-Style Block Markdown Auto-Transformations ──
    if (onTransformBlock) {
      // # -> Heading 1
      if (rawText === "#\n" || rawText === "# " || rawText.startsWith("# ")) {
        const textAfter = rawText.replace(/^#\s*/, "").replace(/\n$/, "");
        playSound.pop();
        if (elRef.current) elRef.current.innerHTML = "";
        onTransformBlock({ type: "heading", level: 2, text: textAfter });
        return;
      }
      // ## -> Heading 2
      if (rawText === "##\n" || rawText === "## " || rawText.startsWith("## ")) {
        const textAfter = rawText.replace(/^##\s*/, "").replace(/\n$/, "");
        playSound.pop();
        if (elRef.current) elRef.current.innerHTML = "";
        onTransformBlock({ type: "heading", level: 2, text: textAfter });
        return;
      }
      // ### -> Heading 3
      if (rawText === "###\n" || rawText === "### " || rawText.startsWith("### ")) {
        const textAfter = rawText.replace(/^###\s*/, "").replace(/\n$/, "");
        playSound.pop();
        if (elRef.current) elRef.current.innerHTML = "";
        onTransformBlock({ type: "heading", level: 3, text: textAfter });
        return;
      }
      // > -> Quote Block
      if (rawText === ">\n" || rawText === "> " || rawText.startsWith("> ")) {
        const textAfter = rawText.replace(/^>\s*/, "").replace(/\n$/, "");
        playSound.pop();
        if (elRef.current) elRef.current.innerHTML = "";
        onTransformBlock({ type: "quote", text: textAfter });
        return;
      }
      // [] or - [ ] -> To-do Checklist
      if (rawText === "[]\n" || rawText === "[] " || rawText === "- [ ] " || rawText.startsWith("[] ") || rawText.startsWith("- [ ] ")) {
        const textAfter = rawText.replace(/^(\[\]|- \[ \])\s*/, "").replace(/\n$/, "");
        playSound.pop();
        if (elRef.current) elRef.current.innerHTML = "";
        onTransformBlock({ type: "todo", items: [{ text: textAfter, done: false }] });
        return;
      }
      // ! -> Gotcha Callout (Pink)
      if (rawText === "!\n" || rawText === "! " || rawText.startsWith("!gotcha ")) {
        const textAfter = rawText.replace(/^(!|!gotcha)\s*/, "").replace(/\n$/, "");
        playSound.pop();
        if (elRef.current) elRef.current.innerHTML = "";
        onTransformBlock({ type: "callout", kind: "gotcha", text: textAfter });
        return;
      }
      // ? -> Question Callout (Yellow)
      if (rawText === "?\n" || rawText === "? " || rawText.startsWith("!q ")) {
        const textAfter = rawText.replace(/^(\?|!q)\s*/, "").replace(/\n$/, "");
        playSound.pop();
        if (elRef.current) elRef.current.innerHTML = "";
        onTransformBlock({ type: "callout", kind: "question", text: textAfter });
        return;
      }
      // !fact or ★ -> Key Takeaway Callout (Lime)
      if (rawText.startsWith("!fact ") || rawText.startsWith("★ ")) {
        const textAfter = rawText.replace(/^(!fact|★)\s*/, "").replace(/\n$/, "");
        playSound.pop();
        if (elRef.current) elRef.current.innerHTML = "";
        onTransformBlock({ type: "callout", kind: "fact", text: textAfter });
        return;
      }
      // ``` -> Code Block
      if (rawText.startsWith("```") && (rawText.includes("\n") || rawText.endsWith(" "))) {
        const lang = rawText.replace(/^```/, "").trim().toUpperCase() || "PYTHON";
        playSound.pop();
        if (elRef.current) elRef.current.innerHTML = "";
        onTransformBlock({ type: "code", lang, note: "SNIPPET", code: "# Write code snippet here\n" });
        return;
      }
    }

    // ── 2. Live Inline Markdown Auto-Replacements (**bold**, `code`, *italic*) ──
    const html = elRef.current.innerHTML;

    // Check if user just closed a markdown tag like **word** + space
    if (/\*\*(.+?)\*\*\s$/.test(rawText) || /`([^`]+)`\s$/.test(rawText) || /\*([^*]+)\*\s$/.test(rawText)) {
      const formatted = formatToHTML(rawText);
      elRef.current.innerHTML = formatted;
      // Move cursor to end
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(elRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    // ── 3. Slash Command Trigger ──
    if (onSlashCommand) {
      if (rawText.startsWith("/")) {
        const rect = elRef.current.getBoundingClientRect();
        onSlashCommand(rawText.trim(), rect);
      } else {
        onSlashCommand("", null);
      }
    }

    saveContent();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // Check if slash menu handled this key event
    if (onSlashKeyDown && onSlashKeyDown(e)) {
      return;
    }

    // Enter without Shift -> create new block below
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveContent();
      if (onInsertBelow) {
        playSound.click();
        onInsertBelow();
      }
      return;
    }

    // Backspace on empty -> delete block & focus previous
    if (e.key === "Backspace") {
      const text = elRef.current?.innerText?.trim() || "";
      if (text === "") {
        e.preventDefault();
        if (onDeleteBlock) {
          playSound.pop();
          onDeleteBlock();
        }
        if (onFocusPrevious) {
          onFocusPrevious();
        }
        return;
      }
    }

    // Cmd+B / Ctrl+B -> WYSIWYG Bold with signature highlight
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const selectedText = selection.toString();
        const span = document.createElement("strong");
        span.style.background = "#FCE94F";
        span.style.color = "#0A0A0A";
        span.style.padding = "0 4px";
        span.style.borderRadius = "1px";
        span.textContent = selectedText;

        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);

        // Move caret after formatted span
        range.setStartAfter(span);
        range.setEndAfter(span);
        selection.removeAllRanges();
        selection.addRange(range);

        saveContent();
        playSound.click();
      }
      return;
    }

    // Cmd+E / Ctrl+E -> WYSIWYG Inline Code badge
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const selectedText = selection.toString();
        const code = document.createElement("code");
        code.style.fontFamily = "var(--mono, monospace)";
        code.style.fontSize = "0.88em";
        code.style.background = "#EBE7DC";
        code.style.border = "1.5px solid #0A0A0A";
        code.style.padding = "1px 5px";
        code.style.color = "#0A0A0A";
        code.textContent = selectedText;

        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(code);

        range.setStartAfter(code);
        range.setEndAfter(code);
        selection.removeAllRanges();
        selection.addRange(range);

        saveContent();
        playSound.click();
      }
      return;
    }

    // Cmd+I / Ctrl+I -> WYSIWYG Italic
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      document.execCommand("italic");
      saveContent();
      return;
    }

    // ArrowUp at start -> previous block
    if (e.key === "ArrowUp") {
      const sel = window.getSelection();
      if (sel && sel.anchorOffset === 0) {
        if (onFocusPrevious) {
          onFocusPrevious();
        }
      }
    }

    // ArrowDown at end -> next block
    if (e.key === "ArrowDown") {
      const text = elRef.current?.innerText || "";
      const sel = window.getSelection();
      if (sel && sel.anchorOffset >= text.length - 1) {
        if (onFocusNext) {
          onFocusNext();
        }
      }
    }
  };

  const Tag = as as any;

  return (
    <Tag
      ref={elRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={saveContent}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => (isComposingRef.current = true)}
      onCompositionEnd={() => {
        isComposingRef.current = false;
        handleInput();
      }}
      data-placeholder={placeholder}
      style={{
        outline: "none",
        border: "none",
        background: "transparent",
        minHeight: "1.4em",
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        cursor: "text",
        borderRadius: "2px",
        margin: 0,
        ...style,
      }}
    />
  );
};
