"use client";

import React, { useRef, useEffect } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";

interface InlineTextEditorProps {
  value: string;
  onChange: (nextVal: string) => void;
  onInsertBelow?: () => void;
  onSplitBlock?: (before: string, after: string) => void;
  onDeleteBlock?: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  onTransformBlock?: (props: Partial<Block>) => void;
  onSlashCommand?: (query: string, rect: DOMRect | null) => void;
  onSlashKeyDown?: (e: React.KeyboardEvent) => boolean;
  renderFormatted?: (val: string) => React.ReactNode;
  registerTextareaRef?: (el: HTMLTextAreaElement | null) => void;
  as?: "p" | "h2" | "h3" | "div" | "blockquote";
  style?: React.CSSProperties;
  placeholder?: string;
  autoFocus?: boolean;
}

// Notion-style markdown auto-transform triggers. Each pattern is matched against
// the start of the block's value; anything typed/pasted after the trigger is
// carried over into the new block instead of being discarded.
const TRANSFORM_PATTERNS: Array<{
  regex: RegExp;
  build: (rest: string) => Partial<Block>;
}> = [
  { regex: /^###\s([\s\S]*)$/, build: (rest) => ({ type: "heading", level: 3, text: rest }) },
  { regex: /^##\s([\s\S]*)$/, build: (rest) => ({ type: "heading", level: 3, text: rest }) },
  { regex: /^#\s([\s\S]*)$/, build: (rest) => ({ type: "heading", level: 2, text: rest }) },
  { regex: /^>\s([\s\S]*)$/, build: (rest) => ({ type: "quote", text: rest }) },
  { regex: /^\[\]\s([\s\S]*)$/, build: (rest) => ({ type: "todo", items: [{ text: rest, done: false }] }) },
  { regex: /^-\s\[\s?\]\s([\s\S]*)$/, build: (rest) => ({ type: "todo", items: [{ text: rest, done: false }] }) },
  { regex: /^!gotcha\s([\s\S]*)$/, build: (rest) => ({ type: "callout", kind: "gotcha", text: rest }) },
  { regex: /^!\s([\s\S]*)$/, build: (rest) => ({ type: "callout", kind: "gotcha", text: rest }) },
  { regex: /^!q\s([\s\S]*)$/, build: (rest) => ({ type: "callout", kind: "question", text: rest }) },
  { regex: /^\?\s([\s\S]*)$/, build: (rest) => ({ type: "callout", kind: "question", text: rest }) },
  { regex: /^!fact\s([\s\S]*)$/, build: (rest) => ({ type: "callout", kind: "fact", text: rest }) },
  { regex: /^★\s([\s\S]*)$/, build: (rest) => ({ type: "callout", kind: "fact", text: rest }) },
];

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  value,
  onChange,
  onInsertBelow,
  onSplitBlock,
  onDeleteBlock,
  onFocusPrevious,
  onFocusNext,
  onTransformBlock,
  onSlashCommand,
  onSlashKeyDown,
  registerTextareaRef,
  style = {},
  placeholder = "Type note, or # for heading, > for quote, ! for callout…",
  autoFocus = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit text naturally without scrollbars
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, 26)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;

    // ── Notion-style Markdown Auto-Transformations ──
    if (onTransformBlock) {
      // Code block: ``` optionally followed by a language and/or pasted code
      if (val.startsWith("```") && (val.includes("\n") || val.endsWith(" "))) {
        playSound.pop();
        const firstNewline = val.indexOf("\n");
        const firstLine = firstNewline === -1 ? val : val.slice(0, firstNewline);
        const rest = firstNewline === -1 ? "" : val.slice(firstNewline + 1);
        const lang = firstLine.replace(/^```/, "").trim().toUpperCase() || "PYTHON";
        onTransformBlock({ type: "code", lang, note: "SNIPPET", code: rest || "# Write code here\n" });
        return;
      }

      for (const { regex, build } of TRANSFORM_PATTERNS) {
        const match = val.match(regex);
        if (match) {
          playSound.pop();
          onTransformBlock(build(match[1]));
          return;
        }
      }
    }

    onChange(val);

    // Slash command trigger
    if (onSlashCommand) {
      if (val.startsWith("/")) {
        const rect = textareaRef.current?.getBoundingClientRect() || null;
        onSlashCommand(val, rect);
      } else {
        onSlashCommand("", null);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If slash menu handled key
    if (onSlashKeyDown && onSlashKeyDown(e)) {
      return;
    }

    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    // Enter (no Shift) -> split into a new block below at the cursor.
    // Shift+Enter keeps a soft line break inside the current block.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      playSound.click();
      if (onSplitBlock) {
        const before = value.slice(0, start);
        const after = value.slice(end);
        onSplitBlock(before, after);
      } else if (onInsertBelow) {
        onInsertBelow();
      }
      return;
    }

    // Backspace on empty line -> delete block & focus previous
    if (e.key === "Backspace" && value === "") {
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

    // Cmd+B / Ctrl+B -> wrap selection with **
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      const selected = value.slice(start, end);
      const wrapped = selected ? `**${selected}**` : `****`;
      const next = value.slice(0, start) + wrapped + value.slice(end);
      onChange(next);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = selected ? start + wrapped.length : start + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
      return;
    }

    // Cmd+E / Ctrl+E -> wrap selection with `
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
      e.preventDefault();
      const selected = value.slice(start, end);
      const wrapped = selected ? `\`${selected}\`` : `\`\``;
      const next = value.slice(0, start) + wrapped + value.slice(end);
      onChange(next);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = selected ? start + wrapped.length : start + 1;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
      return;
    }

    // Cmd+I / Ctrl+I -> wrap selection with *
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      const selected = value.slice(start, end);
      const wrapped = selected ? `*${selected}*` : `**`;
      const next = value.slice(0, start) + wrapped + value.slice(end);
      onChange(next);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = selected ? start + wrapped.length : start + 1;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
      return;
    }

    // ArrowUp at top position -> move to previous block. Must preventDefault:
    // otherwise the browser's own ArrowUp still runs against whichever
    // textarea ends up focused after onFocusPrevious moves focus there,
    // clobbering the caret position we just set.
    if (e.key === "ArrowUp" && start === 0 && end === 0) {
      e.preventDefault();
      if (onFocusPrevious) {
        onFocusPrevious();
      }
      return;
    }

    // ArrowDown at bottom position -> move to next block (same reasoning).
    if (e.key === "ArrowDown" && start === value.length && end === value.length) {
      e.preventDefault();
      if (onFocusNext) {
        onFocusNext();
      }
      return;
    }
  };

  return (
    <textarea
      ref={(el) => {
        textareaRef.current = el;
        if (registerTextareaRef) registerTextareaRef(el);
      }}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={1}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        outline: "none",
        resize: "none",
        overflow: "hidden",
        display: "block",
        padding: 0,
        margin: 0,
        color: "inherit",
        fontFamily: "inherit",
        fontSize: "inherit",
        lineHeight: "inherit",
        fontWeight: "inherit",
        letterSpacing: "inherit",
        ...style,
      }}
    />
  );
};
