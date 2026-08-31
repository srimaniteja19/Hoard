"use client";

import React, { useRef, useEffect } from "react";
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
      // 1. # -> Heading 1
      if (val === "# " || val === "#\n") {
        playSound.pop();
        onTransformBlock({ type: "heading", level: 2, text: "" });
        return;
      }
      // 2. ## -> Heading 2
      if (val === "## " || val === "##\n") {
        playSound.pop();
        onTransformBlock({ type: "heading", level: 2, text: "" });
        return;
      }
      // 3. ### -> Heading 3
      if (val === "### " || val === "###\n") {
        playSound.pop();
        onTransformBlock({ type: "heading", level: 3, text: "" });
        return;
      }
      // 4. > -> Quote
      if (val === "> " || val === ">\n") {
        playSound.pop();
        onTransformBlock({ type: "quote", text: "" });
        return;
      }
      // 5. [] or - [ ] -> To-do Checklist
      if (val === "[] " || val === "[]\n" || val === "- [ ] " || val === "- [ ]\n") {
        playSound.pop();
        onTransformBlock({ type: "todo", items: [{ text: "", done: false }] });
        return;
      }
      // 6. ! -> Gotcha Callout (Pink)
      if (val === "! " || val === "!\n" || val === "!gotcha ") {
        playSound.pop();
        onTransformBlock({ type: "callout", kind: "gotcha", text: "" });
        return;
      }
      // 7. ? -> Question Callout (Yellow)
      if (val === "? " || val === "?\n" || val === "!q ") {
        playSound.pop();
        onTransformBlock({ type: "callout", kind: "question", text: "" });
        return;
      }
      // 8. !fact -> Key Takeaway Callout (Lime)
      if (val === "!fact " || val === "★ ") {
        playSound.pop();
        onTransformBlock({ type: "callout", kind: "fact", text: "" });
        return;
      }
      // 9. ``` -> Code Block
      if (val === "```\n" || val === "``` " || (val.startsWith("```") && (val.includes("\n") || val.endsWith(" ")))) {
        playSound.pop();
        const lang = val.replace(/^```/, "").trim().toUpperCase() || "PYTHON";
        onTransformBlock({ type: "code", lang, note: "SNIPPET", code: "# Write code here\n" });
        return;
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

    // ArrowUp at top position -> move to previous block
    if (e.key === "ArrowUp" && start === 0 && end === 0) {
      if (onFocusPrevious) {
        onFocusPrevious();
      }
    }

    // ArrowDown at bottom position -> move to next block
    if (e.key === "ArrowDown" && start === value.length && end === value.length) {
      if (onFocusNext) {
        onFocusNext();
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
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
