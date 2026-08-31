"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
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
  onSlashKeyDown?: (e: React.KeyboardEvent) => boolean; // returns true if handled by slash menu
  renderFormatted: (val: string) => React.ReactNode;
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
  renderFormatted,
  as = "p",
  style = {},
  placeholder = "Type something, or press '/' for commands…",
  autoFocus = false,
}) => {
  const [isEditing, setIsEditing] = useState(autoFocus || value === "");
  const [localVal, setLocalVal] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Synchronize local value when external value changes
  useEffect(() => {
    if (!isEditing) {
      setLocalVal(value);
    }
  }, [value, isEditing]);

  // Auto-resize textarea height to match content
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "0px";
      el.style.height = `${Math.max(el.scrollHeight, 26)}px`;
    }
  };

  useLayoutEffect(() => {
    if (isEditing) {
      adjustHeight();
      const el = textareaRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }, [isEditing]);

  const handleBlur = () => {
    // If slash command is active, allow small delay for click
    setTimeout(() => {
      setIsEditing(false);
      if (localVal !== value) {
        onChange(localVal);
      }
      if (onSlashCommand) onSlashCommand("", null);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If slash menu handled key (ArrowUp, ArrowDown, Enter on slash item, Escape)
    if (onSlashKeyDown && onSlashKeyDown(e)) {
      return;
    }

    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    // Enter without Shift -> create new paragraph below
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const before = localVal.slice(0, start);

      if (localVal !== before) {
        onChange(before);
      }
      setIsEditing(false);

      if (onInsertBelow) {
        playSound.click();
        onInsertBelow();
      }
      return;
    }

    // Backspace on empty line -> delete block & focus previous
    if (e.key === "Backspace" && localVal === "") {
      e.preventDefault();
      setIsEditing(false);
      if (onDeleteBlock) {
        playSound.pop();
        onDeleteBlock();
      }
      if (onFocusPrevious) {
        onFocusPrevious();
      }
      return;
    }

    // Escape -> exit edit mode
    if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
      if (localVal !== value) onChange(localVal);
      if (onSlashCommand) onSlashCommand("", null);
      return;
    }

    // Cmd+B / Ctrl+B -> wrap selection with **
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      const selected = localVal.slice(start, end);
      const wrapped = selected ? `**${selected}**` : `****`;
      const next = localVal.slice(0, start) + wrapped + localVal.slice(end);
      setLocalVal(next);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = selected ? start + wrapped.length : start + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
          adjustHeight();
        }
      }, 0);
      return;
    }

    // Cmd+E / Ctrl+E -> wrap selection with `
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
      e.preventDefault();
      const selected = localVal.slice(start, end);
      const wrapped = selected ? `\`${selected}\`` : `\`\``;
      const next = localVal.slice(0, start) + wrapped + localVal.slice(end);
      setLocalVal(next);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = selected ? start + wrapped.length : start + 1;
          textareaRef.current.setSelectionRange(newPos, newPos);
          adjustHeight();
        }
      }, 0);
      return;
    }

    // Cmd+I / Ctrl+I -> wrap selection with *
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      const selected = localVal.slice(start, end);
      const wrapped = selected ? `*${selected}*` : `**`;
      const next = localVal.slice(0, start) + wrapped + localVal.slice(end);
      setLocalVal(next);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = selected ? start + wrapped.length : start + 1;
          textareaRef.current.setSelectionRange(newPos, newPos);
          adjustHeight();
        }
      }, 0);
      return;
    }

    // ArrowUp at top line -> move to previous block
    if (e.key === "ArrowUp" && start === 0 && end === 0) {
      if (onFocusPrevious) {
        setIsEditing(false);
        onFocusPrevious();
      }
    }

    // ArrowDown at bottom line -> move to next block
    if (e.key === "ArrowDown" && start === localVal.length && end === localVal.length) {
      if (onFocusNext) {
        setIsEditing(false);
        onFocusNext();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;

    // ── Notion-style Markdown Instant Auto-Transformations ──
    if (onTransformBlock) {
      // 1. '# ' -> Heading 1 (Level 2 in our hierarchy)
      if (val === "# " || val === "#\t") {
        playSound.pop();
        onTransformBlock({ type: "heading", level: 2, text: "" });
        return;
      }
      // 2. '## ' -> Heading 2
      if (val === "## " || val === "##\t") {
        playSound.pop();
        onTransformBlock({ type: "heading", level: 2, text: "" });
        return;
      }
      // 3. '### ' -> Heading 3
      if (val === "### " || val === "###\t") {
        playSound.pop();
        onTransformBlock({ type: "heading", level: 3, text: "" });
        return;
      }
      // 4. '> ' -> Quote
      if (val === "> " || val === ">\t") {
        playSound.pop();
        onTransformBlock({ type: "quote", text: "" });
        return;
      }
      // 5. '[] ' or '[ ] ' or '- [ ] ' -> To-do Checklist
      if (val === "[] " || val === "[ ] " || val === "- [ ] ") {
        playSound.pop();
        onTransformBlock({ type: "todo", items: [{ text: "", done: false }] });
        return;
      }
      // 6. '! ' or '!gotcha ' -> Gotcha Callout (Pink)
      if (val === "! " || val === "!gotcha ") {
        playSound.pop();
        onTransformBlock({ type: "callout", kind: "gotcha", text: "" });
        return;
      }
      // 7. '? ' or '!q ' -> Question Callout (Yellow)
      if (val === "? " || val === "!q ") {
        playSound.pop();
        onTransformBlock({ type: "callout", kind: "question", text: "" });
        return;
      }
      // 8. '!fact ' or '★ ' -> Key Takeaway Callout (Lime)
      if (val === "!fact " || val === "★ ") {
        playSound.pop();
        onTransformBlock({ type: "callout", kind: "fact", text: "" });
        return;
      }
      // 9. '```' or '```python' -> Code Block
      if (val === "```" || val === "``` " || (val.startsWith("```") && val.endsWith(" "))) {
        playSound.pop();
        const lang = val.replace(/^```/, "").trim().toUpperCase() || "PYTHON";
        onTransformBlock({ type: "code", lang, note: "SNIPPET", code: "# Write code snippet here\n" });
        return;
      }
    }

    setLocalVal(val);
    adjustHeight();

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

  const Tag = as;

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={localVal}
        onChange={handleChange}
        onBlur={handleBlur}
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
  }

  return (
    <Tag
      onClick={() => setIsEditing(true)}
      style={{
        ...style,
        cursor: "text",
        minHeight: "1.4em",
        borderRadius: "2px",
        margin: 0,
      }}
    >
      {value ? (
        renderFormatted(value)
      ) : (
        <span style={{ opacity: 0.25, fontStyle: "normal" }}>{placeholder}</span>
      )}
    </Tag>
  );
};
