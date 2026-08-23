"use client";

import React, { useMemo, useCallback } from "react";
import { renderScratchMarkdown } from "@/lib/scratch/markdown";

interface ScratchMarkdownProps {
  content: string;
  className?: string;
  onToggleTask?: (taskIndex: number, currentDone: boolean) => void;
}

export const ScratchMarkdown: React.FC<ScratchMarkdownProps> = ({
  content,
  className = "md",
}) => {
  const html = useMemo(() => {
    return renderScratchMarkdown(content);
  }, [content]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Handle code copy button
    if (target.classList.contains("cb-copy-btn")) {
      const code = target.getAttribute("data-code");
      if (code) {
        navigator.clipboard.writeText(code);
        const original = target.textContent;
        target.textContent = "COPIED!";
        setTimeout(() => {
          target.textContent = original;
        }, 1500);
      }
    }
  }, []);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  );
};
