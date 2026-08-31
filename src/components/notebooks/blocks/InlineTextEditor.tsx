"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { playSound } from "@/lib/sound";

interface InlineTextEditorProps {
  value: string;
  onChange: (nextVal: string) => void;
  onInsertBelow?: () => void;
  onDeleteBlock?: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
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
  renderFormatted,
  as = "p",
  style = {},
  placeholder = "Start writing…",
  autoFocus = false,
}) => {
  const [isEditing, setIsEditing] = useState(autoFocus || value === "");
  const [localVal, setLocalVal] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Synchronize local value when external value changes and not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalVal(value);
    }
  }, [value, isEditing]);

  // Auto-resize textarea height to match text content precisely
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
    }
  };

  useLayoutEffect(() => {
    if (isEditing) {
      adjustHeight();
      const el = textareaRef.current;
      if (el) {
        el.focus();
        // Place cursor at end of text
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localVal !== value) {
      onChange(localVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    // Enter without Shift -> create new paragraph below
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // If cursor is in middle of paragraph, we can split text
      const before = localVal.slice(0, start);
      const after = localVal.slice(end);

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

    // Backspace on empty -> delete block and focus previous
    if (e.key === "Backspace" && localVal.trim() === "") {
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
      handleBlur();
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

    // ArrowUp at beginning -> previous block
    if (e.key === "ArrowUp" && start === 0 && end === 0) {
      if (onFocusPrevious) {
        setIsEditing(false);
        onFocusPrevious();
      }
    }

    // ArrowDown at end -> next block
    if (e.key === "ArrowDown" && start === localVal.length && end === localVal.length) {
      if (onFocusNext) {
        setIsEditing(false);
        onFocusNext();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalVal(e.target.value);
    adjustHeight();
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
          color: "inherit",
          ...style,
        }}
      />
    );
  }

  return (
    <Tag
      onClick={() => setIsEditing(true)}
      title="Click to edit"
      style={{
        ...style,
        cursor: "text",
        minHeight: "1.4em",
        borderRadius: "2px",
      }}
    >
      {value ? (
        renderFormatted(value)
      ) : (
        <span style={{ opacity: 0.35, fontStyle: "italic" }}>{placeholder}</span>
      )}
    </Tag>
  );
};
