"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const html = useMemo(() => {
    return renderScratchMarkdown(content);
  }, [content]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxSrc]);

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
      return;
    }

    // Handle image zoom click
    if (
      target.classList.contains("md-img") ||
      target.classList.contains("md-figure__zoom")
    ) {
      const fullSrc = target.getAttribute("data-full-src") || (target as HTMLImageElement).src;
      if (fullSrc) {
        setLightboxSrc(fullSrc);
      }
      return;
    }
  }, []);

  return (
    <>
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={handleClick}
      />

      {lightboxSrc && (
        <div
          className="scratch-img-lightbox"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="scratch-img-lightbox__box" onClick={(e) => e.stopPropagation()}>
            <div className="scratch-img-lightbox__header">
              <span>IMAGE PREVIEW</span>
              <div className="scratch-img-lightbox__acts">
                <a
                  href={lightboxSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="scratch-img-lightbox__dl"
                >
                  DOWNLOAD ⤓
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxSrc(null)}
                  className="scratch-img-lightbox__close"
                >
                  CLOSE ✕
                </button>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxSrc} alt="Full preview" className="scratch-img-lightbox__img" />
          </div>
        </div>
      )}
    </>
  );
};
