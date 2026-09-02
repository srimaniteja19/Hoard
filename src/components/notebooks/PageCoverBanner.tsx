"use client";

import React, { useState, useRef, useEffect } from "react";
import { NotebookTheme, getThemeTokens } from "@/lib/notebooks/theme";
import { playSound } from "@/lib/sound";
import { Image as ImageIcon, Smile, X, RefreshCw, Sparkles } from "lucide-react";

export const COVER_PRESETS = [
  { id: "aurora", label: "Aurora Mesh", bg: "linear-gradient(135deg, #FF6B6B 0%, #556270 50%, #4ECDC4 100%)" },
  { id: "sunset", label: "Sunset Duotone", bg: "linear-gradient(135deg, #FA709A 0%, #FEE140 100%)" },
  { id: "obsidian", label: "Obsidian Wave", bg: "linear-gradient(135deg, #18191D 0%, #2C3038 50%, #141518 100%)" },
  { id: "neon", label: "Neon Cyber", bg: "linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)" },
  { id: "sage", label: "Zen Botanical", bg: "linear-gradient(135deg, #1B4D3E 0%, #4A7C59 50%, #86EFAC 100%)" },
  { id: "cosmic", label: "Cosmic Indigo", bg: "linear-gradient(135deg, #4A00E0 0%, #8E2DE2 50%, #00D4FF 100%)" },
  { id: "blueprint", label: "Technical Blueprint", bg: "linear-gradient(135deg, #0052D4 0%, #4364F7 50%, #6FB1FC 100%)" },
  { id: "amber", label: "Warm Parchment", bg: "linear-gradient(135deg, #F3904F 0%, #3B4371 100%)" },
];

export const EMOJI_PALETTE = [
  "📐", "⚡", "🧠", "🚀", "📚", "💻", "🎨", "✨", "🔥", "💡",
  "🎯", "🔬", "📜", "🪐", "💎", "⚙️", "☕", "🌿", "🤖", "📊",
  "🛡️", "🔑", "🔍", "📌", "🏷️", "🗺️", "🗂️", "🧩", "🔮", "🪄"
];

interface PageCoverBannerProps {
  coverUrl?: string;
  icon?: string;
  theme?: NotebookTheme;
  onChangeCover: (coverUrl: string | undefined) => void;
  onChangeIcon: (icon: string | undefined) => void;
}

export const PageCoverBanner: React.FC<PageCoverBannerProps> = ({
  coverUrl,
  icon,
  theme = "cream",
  onChangeCover,
  onChangeIcon,
}) => {
  const tokens = getThemeTokens(theme);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const coverPickerRef = useRef<HTMLDivElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (coverPickerRef.current && !coverPickerRef.current.contains(e.target as Node)) {
        setShowCoverPicker(false);
      }
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasCover = Boolean(coverUrl);
  const hasIcon = Boolean(icon);

  return (
    <div
      className="no-print"
      style={{ position: "relative", marginBottom: hasCover ? "36px" : "12px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Cover Hero Area ── */}
      {hasCover && (
        <div
          className="nb-cover-hero"
          style={{
            background: coverUrl,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderBottom: `2.5px solid ${tokens.borderPrimary}`,
            position: "relative",
          }}
        >
          {/* Cover Action Pills Overlay (visible on hover and touch devices) */}
          <div
            className="nb-touch-always-visible"
            style={{
              position: "absolute",
              bottom: "10px",
              right: "clamp(8px, 3vw, 20px)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: isHovered || showCoverPicker ? 1 : 0,
              transition: "opacity 0.15s ease",
            }}
          >
            <button
              type="button"
              onClick={() => {
                playSound.click();
                setShowCoverPicker(!showCoverPicker);
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                background: tokens.cardBg,
                color: tokens.textPrimary,
                border: `1.5px solid ${tokens.borderPrimary}`,
                boxShadow: tokens.boxShadow,
                padding: "5px 9px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <ImageIcon size={11} />
              <span>Change Cover</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound.click();
                onChangeCover(undefined);
              }}
              title="Remove Cover"
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 700,
                background: tokens.cardBg,
                color: "#EF4444",
                border: `1.5px solid ${tokens.borderPrimary}`,
                boxShadow: tokens.boxShadow,
                padding: "5px 7px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Emoji Badge / Add Buttons ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "10px",
          marginTop: hasCover ? "-42px" : "4px",
          paddingLeft: "4px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {hasIcon ? (
          <div
            style={{ position: "relative" }}
            onClick={() => {
              playSound.pop();
              setShowIconPicker(!showIconPicker);
            }}
          >
            <div
              title="Change page icon"
              className="nb-cover-icon"
              style={{
                background: tokens.cardBg,
                border: `2.5px solid ${tokens.borderPrimary}`,
                boxShadow: tokens.boxShadow,
                cursor: "pointer",
                userSelect: "none",
                transition: "transform 0.12s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {icon}
            </div>
          </div>
        ) : null}

        {/* Action Buttons to Add Icon / Cover if missing */}
        <div
          className="nb-touch-always-visible"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            opacity: isHovered || showCoverPicker || showIconPicker ? 0.9 : (hasCover ? 0 : 0.6),
            transition: "opacity 0.15s ease",
            marginBottom: hasCover ? "8px" : "0px",
          }}
        >
          {!hasIcon && (
            <button
              type="button"
              onClick={() => {
                playSound.click();
                setShowIconPicker(true);
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                background: "transparent",
                color: tokens.textSecondary,
                border: `1.5px dashed ${tokens.borderSubtle}`,
                padding: "4px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Smile size={11} />
              <span>＋ Add Icon</span>
            </button>
          )}

          {!hasCover && (
            <button
              type="button"
              onClick={() => {
                playSound.click();
                setShowCoverPicker(true);
              }}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                background: "transparent",
                color: tokens.textSecondary,
                border: `1.5px dashed ${tokens.borderSubtle}`,
                padding: "4px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ImageIcon size={11} />
              <span>＋ Add Cover</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Cover Picker Modal Popover ── */}
      {showCoverPicker && (
        <div
          ref={coverPickerRef}
          style={{
            position: "absolute",
            top: hasCover ? "130px" : "40px",
            left: "clamp(8px, 3vw, 20px)",
            zIndex: 9999,
            background: tokens.popoverBg,
            border: `2px solid ${tokens.borderPrimary}`,
            boxShadow: tokens.popoverShadow,
            padding: "14px",
            width: "min(320px, calc(100vw - 32px))",
            fontFamily: "var(--mono, monospace)",
            animation: "fadeIn 0.1s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", color: tokens.textPrimary }}>
              CHOOSE COVER ARTWORK
            </span>
            <button
              type="button"
              onClick={() => setShowCoverPicker(false)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: tokens.textPrimary }}
            >
              <X size={12} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
            {COVER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  playSound.click();
                  onChangeCover(preset.bg);
                  setShowCoverPicker(false);
                }}
                style={{
                  height: "56px",
                  borderRadius: "4px",
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: preset.bg,
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  padding: 0,
                  display: "flex",
                  alignItems: "flex-end",
                  boxShadow: "2px 2px 0 rgba(0,0,0,0.3)",
                }}
              >
                <span
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    color: "#FFFFFF",
                    fontSize: "8px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  {preset.label}
                </span>
              </button>
            ))}
          </div>

          {hasCover && (
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onChangeCover(undefined);
                setShowCoverPicker(false);
              }}
              style={{
                marginTop: "12px",
                width: "100%",
                padding: "6px",
                background: "transparent",
                border: `1.5px solid #EF4444`,
                color: "#EF4444",
                fontSize: "9px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Remove Cover
            </button>
          )}
        </div>
      )}

      {/* ── Icon Picker Modal Popover ── */}
      {showIconPicker && (
        <div
          ref={iconPickerRef}
          style={{
            position: "absolute",
            top: hasCover ? "30px" : "40px",
            left: "clamp(6px, 2vw, 10px)",
            zIndex: 9999,
            background: tokens.popoverBg,
            border: `2px solid ${tokens.borderPrimary}`,
            boxShadow: tokens.popoverShadow,
            padding: "14px",
            width: "min(280px, calc(100vw - 32px))",
            fontFamily: "var(--mono, monospace)",
            animation: "fadeIn 0.1s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", color: tokens.textPrimary }}>
              SELECT PAGE ICON
            </span>
            <button
              type="button"
              onClick={() => setShowIconPicker(false)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: tokens.textPrimary }}
            >
              <X size={12} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px" }}>
            {EMOJI_PALETTE.map((em, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  playSound.pop();
                  onChangeIcon(em);
                  setShowIconPicker(false);
                }}
                style={{
                  fontSize: "20px",
                  height: "36px",
                  background: "transparent",
                  border: `1px solid ${tokens.borderSubtle}`,
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  transition: "background 0.1s ease, transform 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = tokens.popoverHoverBg;
                  e.currentTarget.style.transform = "scale(1.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {em}
              </button>
            ))}
          </div>

          {hasIcon && (
            <button
              type="button"
              onClick={() => {
                playSound.click();
                onChangeIcon(undefined);
                setShowIconPicker(false);
              }}
              style={{
                marginTop: "10px",
                width: "100%",
                padding: "6px",
                background: "transparent",
                border: `1.5px solid #EF4444`,
                color: "#EF4444",
                fontSize: "9px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Remove Icon
            </button>
          )}
        </div>
      )}
    </div>
  );
};
