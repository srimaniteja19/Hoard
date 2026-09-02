"use client";

import React, { useRef, useEffect, useState } from "react";
import { Block } from "@/lib/notebooks/blocks";
import { playSound } from "@/lib/sound";

export interface InlineEditorHandle {
  focus: (position: "start" | "end") => void;
}

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
  registerEditorHandle?: (handle: InlineEditorHandle | null) => void;
  as?: "p" | "h2" | "h3" | "div" | "blockquote" | "li";
  blockType?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
}

// Notion-style markdown auto-transform triggers. Each pattern is matched against
// the start of the block's value; anything typed/pasted after the trigger is
// carried over into the new block instead of being discarded.
const TRANSFORM_PATTERNS: Array<{
  regex: RegExp;
  build: (rest: string, match: RegExpMatchArray) => Partial<Block>;
}> = [
  { regex: /^###\s([\s\S]*)$/, build: (rest) => ({ type: "heading", level: 3, text: rest }) },
  { regex: /^##\s([\s\S]*)$/, build: (rest) => ({ type: "heading", level: 3, text: rest }) },
  { regex: /^#\s([\s\S]*)$/, build: (rest) => ({ type: "heading", level: 2, text: rest }) },
  { regex: /^>\s([\s\S]*)$/, build: (rest) => ({ type: "quote", text: rest }) },
  { regex: /^\[\]\s([\s\S]*)$/, build: (rest) => ({ type: "todo", items: [{ text: rest, done: false }] }) },
  { regex: /^-\s\[\s?\]\s([\s\S]*)$/, build: (rest) => ({ type: "todo", items: [{ text: rest, done: false }] }) },
  { regex: /^!gotcha\s([\s\S]*)$/i, build: (rest) => ({ type: "callout", kind: "gotcha", text: rest }) },
  { regex: /^!\s([\s\S]*)$/, build: (rest) => ({ type: "callout", kind: "gotcha", text: rest }) },
  { regex: /^!q\s([\s\S]*)$/i, build: (rest) => ({ type: "callout", kind: "question", text: rest }) },
  { regex: /^\?\s([\s\S]*)$/, build: (rest) => ({ type: "callout", kind: "question", text: rest }) },
  { regex: /^!fact\s([\s\S]*)$/i, build: (rest) => ({ type: "callout", kind: "fact", text: rest }) },
  { regex: /^★\s([\s\S]*)$/, build: (rest) => ({ type: "callout", kind: "fact", text: rest }) },
  { regex: /^!connects\s([\s\S]*)$/i, build: (rest) => ({ type: "callout", kind: "connects", text: rest }) },
  // Bullet List: -, *, • followed by space
  { regex: /^[*\-•]\s([\s\S]*)$/, build: (rest) => ({ type: "bullet", text: rest }) },
  // Numbered List: 1. or 1) followed by space
  { regex: /^(\d+)[\.\)]\s([\s\S]*)$/, build: (rest, match) => ({ type: "numbered", number: parseInt(match[1] || "1", 10), text: rest }) },
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
  renderFormatted,
  registerEditorHandle,
  as = "p",
  blockType = "paragraph",
  style = {},
  placeholder = "Type note, or # for heading, - for bullet, > for quote…",
  autoFocus = false,
  readOnly = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // A block only shows its raw markdown/live textarea while actively being
  // edited. Otherwise it renders through renderFormatted — otherwise **bold**,
  // `code`, etc. would just sit there as literal asterisks/backticks forever,
  // since a plain <textarea> has no way to render rich text inside itself.
  const [isEditing, setIsEditing] = useState(autoFocus && !readOnly);
  const pendingFocusPosRef = useRef<"start" | "end" | null>(null);

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
  }, [value, isEditing]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  // Resolve a focus() request against the actual textarea once it mounts
  // (switching into edit mode is what makes the textarea exist at all).
  useEffect(() => {
    if (isEditing && pendingFocusPosRef.current && textareaRef.current) {
      const el = textareaRef.current;
      const pos = pendingFocusPosRef.current === "start" ? 0 : el.value.length;
      el.focus();
      el.setSelectionRange(pos, pos);
      pendingFocusPosRef.current = null;
    }
  }, [isEditing]);

  useEffect(() => {
    if (!registerEditorHandle) return;
    registerEditorHandle({
      focus: (position) => {
        pendingFocusPosRef.current = position;
        setIsEditing(true);
      },
    });
    return () => registerEditorHandle(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerEditorHandle]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
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
          onTransformBlock(build(match[1] || "", match));
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
    if (readOnly) return;

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

    // Backspace on empty line -> convert bullet/numbered back to paragraph, or delete block
    if (e.key === "Backspace" && value === "") {
      e.preventDefault();
      if ((blockType === "bullet" || blockType === "numbered") && onTransformBlock) {
        playSound.pop();
        onTransformBlock({ type: "paragraph", text: "" });
        return;
      }
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

  // NOTE: padding/margin default to 0 here, but ...style (spread last) lets
  // each block type's own margin (e.g. a paragraph's "6px 0 14px") win — the
  // same value is used whether this block is currently a <textarea> or the
  // rendered preview below, so nothing shifts when toggling between them.
  const baseStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    padding: 0,
    margin: 0,
    color: "inherit",
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    fontWeight: "inherit",
    letterSpacing: "inherit",
    ...style,
  };

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Read-only (e.g. the "Tidy My Notes" diff preview), or simply not the block
  // currently being edited: show the rendered/formatted view. **bold**,
  // `code`, etc. render for real here instead of sitting as literal markdown.
  if (readOnly || (!isEditing && value)) {
    return React.createElement(
      as,
      {
        onMouseUp: readOnly
          ? undefined
          : () => {
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
                if (clickTimeoutRef.current) {
                  clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = null;
                }
              }
            },
        onClick: readOnly
          ? undefined
          : (e: React.MouseEvent) => {
              if (e.target instanceof Element && e.target.closest("a")) {
                return;
              }
              const sel = window.getSelection();
              if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
                return;
              }
              if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
              }
              clickTimeoutRef.current = setTimeout(() => {
                const currentSel = window.getSelection();
                if (currentSel && !currentSel.isCollapsed && currentSel.toString().trim().length > 0) {
                  return;
                }
                pendingFocusPosRef.current = "end";
                setIsEditing(true);
              }, 180);
            },
        // A subtle hover tint is the only signal this text is editable at
        // all — without it, clicking into a block to edit it is invisible
        // until you've already done it once.
        onMouseEnter: readOnly
          ? undefined
          : (e: React.MouseEvent<HTMLElement>) => {
              e.currentTarget.style.background = "rgba(128,128,128,0.08)";
            },
        onMouseLeave: readOnly
          ? undefined
          : (e: React.MouseEvent<HTMLElement>) => {
              e.currentTarget.style.background = "transparent";
            },
        style: {
          ...baseStyle,
          display: "block",
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          cursor: readOnly ? "default" : "text",
          borderRadius: "3px",
          transition: "background 0.08s ease",
        },
      },
      value ? (renderFormatted ? renderFormatted(value) : value) : null
    );
  }

  return (
    <textarea
      ref={(el) => {
        textareaRef.current = el;
      }}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsEditing(true)}
      onBlur={() => setIsEditing(false)}
      placeholder={placeholder}
      rows={1}
      style={{
        ...baseStyle,
        resize: "none",
        overflow: "hidden",
        display: "block",
      }}
    />
  );
};
