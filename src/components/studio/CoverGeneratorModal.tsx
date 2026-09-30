"use client";

import { useMemo, useState } from "react";
import { Download, Sparkles, Wand2, X } from "lucide-react";
import {
  coverSvgToDataUrl,
  downloadCoverSvg,
  generateCoverSvg,
  type CoverStyle,
} from "@/lib/studio/coverGenerator";
import type { StudioPiece, StudioSeries } from "@/lib/studio/types";

interface Props {
  piece: StudioPiece;
  series: StudioSeries | null;
  onApply: (coverUrl: string) => void;
  onClose: () => void;
}

const STYLES: { id: CoverStyle; label: string; desc: string }[] = [
  { id: "soundstage", label: "Film Slate", desc: "Clapperboard stripes, timecode & bold title" },
  { id: "editorial", label: "Editorial", desc: "Zine poster with huge part number watermark" },
  { id: "cyber", label: "Cyberpunk", desc: "Neon grid, tech brackets & monospace codes" },
  { id: "minimal", label: "Swiss Clean", desc: "Bold minimal typography with color accent bar" },
];

export function CoverGeneratorModal({ piece, series, onApply, onClose }: Props) {
  const [style, setStyle] = useState<CoverStyle>("soundstage");
  const [subtitle, setSubtitle] = useState(piece.notes?.slice(0, 60) || "");
  const [customTitle, setCustomTitle] = useState(piece.title);

  const svgContent = useMemo(() => {
    return generateCoverSvg({
      title: customTitle,
      seriesTitle: series?.title,
      part: piece.part,
      format: piece.format,
      pillar: piece.pillar,
      subtitle,
      style,
    });
  }, [customTitle, series?.title, piece.part, piece.format, piece.pillar, subtitle, style]);

  const dataUrl = useMemo(() => coverSvgToDataUrl(svgContent), [svgContent]);

  const handleDownload = () => {
    const slug = (customTitle || "cover")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);
    downloadCoverSvg(svgContent, `${slug}-cover.svg`);
  };

  return (
    <div className="studio-scrim" onClick={onClose}>
      <div
        className="studio-modal studio-cover-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-gen-h"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-modal-head">
          <div className="studio-modal-title">
            <Wand2 size={18} aria-hidden="true" />
            <h2 id="cover-gen-h" style={{ margin: 0, fontSize: "16px" }}>
              Cover Card Generator (9:16)
            </h2>
          </div>
          <button
            type="button"
            className="studio-btn studio-btn-plain studio-btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>

        <p className="studio-muted studio-small">
          Auto-generates high-resolution vertical cover art using Hoard design tokens, your series title, part number, and topic color.
        </p>

        <div className="studio-cover-grid">
          {/* Left: 9:16 Preview */}
          <div className="studio-cover-preview-col">
            <div className="studio-cover-preview-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="Cover Preview" className="studio-cover-preview-img" />
            </div>
            <div className="studio-row studio-row-start studio-gap" style={{ marginTop: "10px" }}>
              <button
                type="button"
                className="studio-btn studio-btn-plain studio-btn-sm"
                onClick={handleDownload}
              >
                <Download size={13} aria-hidden="true" />
                <span>Download SVG</span>
              </button>
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className="studio-cover-controls-col">
            <div className="studio-cover-section">
              <span className="studio-label">Choose Aesthetic Style</span>
              <div className="studio-cover-style-grid">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`studio-cover-style-btn ${style === s.id ? "is-active" : ""}`}
                    onClick={() => setStyle(s.id)}
                  >
                    <strong>{s.label}</strong>
                    <span>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="studio-cover-section studio-gap">
              <label className="studio-label" htmlFor="cover-title-input">
                Card Headline Text
              </label>
              <input
                id="cover-title-input"
                className="studio-input"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Piece title on cover…"
              />
            </div>

            <div className="studio-cover-section studio-gap">
              <label className="studio-label" htmlFor="cover-sub-input">
                Subtitle / Hook Line (Optional)
              </label>
              <input
                id="cover-sub-input"
                className="studio-input"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="A weird idea with nerdy roots…"
              />
            </div>

            <div className="studio-cover-meta-info studio-gap">
              <span className="studio-mono studio-small studio-muted">
                Dimensions: 1080 × 1920 (9:16) · Format: Vector SVG · Pillar: {piece.pillar}
              </span>
            </div>

            <div className="studio-row studio-gap" style={{ marginTop: "24px" }}>
              <button
                type="button"
                className="studio-btn"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  onApply(dataUrl);
                  onClose();
                }}
              >
                <Sparkles size={14} aria-hidden="true" />
                <span>Apply to Piece Cover</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
