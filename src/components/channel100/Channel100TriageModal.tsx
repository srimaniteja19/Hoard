"use client";

import React, { useState, useEffect } from "react";
import {
  TriageTime,
  TriageEnergy,
  TriageContext,
  TriagePick,
  TRIAGE_TIME_OPTIONS,
  TRIAGE_ENERGY_OPTIONS,
  TRIAGE_CONTEXT_OPTIONS,
} from "@/lib/channel100/triage";
import { playSound } from "@/lib/sound";
import { CustomMediaItem, CustomMediaKind } from "@/lib/channel100/types";

interface Channel100TriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistTitles?: string[];
  onLogPrescription?: (item: Partial<CustomMediaItem>) => void;
  sfxEnabled?: boolean;
}

type TriageStep = "time" | "energy" | "context" | "scanning" | "result";

export const Channel100TriageModal: React.FC<Channel100TriageModalProps> = ({
  isOpen,
  onClose,
  watchlistTitles = [],
  onLogPrescription,
  sfxEnabled = true,
}) => {
  const [step, setStep] = useState<TriageStep>("time");
  const [time, setTime] = useState<TriageTime>("45m");
  const [energy, setEnergy] = useState<TriageEnergy>("adrenaline");
  const [context, setContext] = useState<TriageContext>("solo");

  const [loading, setLoading] = useState(false);
  const [prescription, setPrescription] = useState<TriagePick | null>(null);
  const [alternatives, setAlternatives] = useState<TriagePick[]>([]);
  const [activePickIndex, setActivePickIndex] = useState(0); // 0 = primary, 1 = alt 1, 2 = alt 2
  const [scanMessage, setScanMessage] = useState("TUNING BROADCAST SATELLITE...");

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep("time");
      setActivePickIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Esc key listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const playClick = () => {
    if (sfxEnabled) {
      try {
        playSound.click();
      } catch {
        // audio safeguard
      }
    }
  };

  const playPop = () => {
    if (sfxEnabled) {
      try {
        playSound.pop();
      } catch {
        // audio safeguard
      }
    }
  };

  const playPromote = () => {
    if (sfxEnabled) {
      try {
        playSound.promote();
      } catch {
        // audio safeguard
      }
    }
  };

  async function runTriage(chosenTime: TriageTime, chosenEnergy: TriageEnergy, chosenContext: TriageContext) {
    setStep("scanning");
    setLoading(true);
    playPop();

    const messages = [
      "CALIBRATING RUNTIME ALLOWANCE...",
      "SCANNING GLOBAL CINEMA & TELEVISION...",
      "CROSS-REFERENCING WATCHLIST & VIBE...",
      "LOCKING OPTIMAL FREQUENCY...",
    ];

    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setScanMessage(messages[msgIdx]);
    }, 450);

    try {
      const res = await fetch("/api/channel100/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: chosenTime,
          energy: chosenEnergy,
          context: chosenContext,
          watchlistTitles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPrescription(data.prescription);
        setAlternatives(data.alternatives || []);
        setActivePickIndex(0);
      }
    } catch (err) {
      console.error("[TriageModal] Error fetching triage pick:", err);
    } finally {
      clearInterval(interval);
      // Give realistic, satisfying broadcast delay
      setTimeout(() => {
        setLoading(false);
        setStep("result");
        playPromote();
      }, 700);
    }
  }

  function handleSelectTime(selected: TriageTime) {
    playClick();
    setTime(selected);
    setStep("energy");
  }

  function handleSelectEnergy(selected: TriageEnergy) {
    playClick();
    setEnergy(selected);
    setStep("context");
  }

  function handleSelectContext(selected: TriageContext) {
    playClick();
    setContext(selected);
    runTriage(time, energy, selected);
  }

  function handleReset() {
    playClick();
    setStep("time");
    setPrescription(null);
    setAlternatives([]);
    setActivePickIndex(0);
  }

  // Active pick being showcased (either primary or selected alternative)
  const currentPick: TriagePick | null =
    activePickIndex === 0
      ? prescription
      : alternatives[activePickIndex - 1] || prescription;

  function handleLogCurrentPick() {
    if (!currentPick || !onLogPrescription) return;
    const mappedKind: CustomMediaKind =
      currentPick.kind === "film"
        ? "film"
        : currentPick.kind === "anime"
        ? "anime"
        : currentPick.kind === "mini-series"
        ? "mini"
        : currentPick.kind === "documentary"
        ? "doc"
        : "tv";

    onLogPrescription({
      title: currentPick.title,
      year: currentPick.year,
      kind: mappedKind,
      lang: currentPick.lang,
      langFlag: currentPick.langFlag,
      genre: currentPick.genre,
      where: currentPick.where,
      notes: `${currentPick.tagline} — Triage prescription for ${time} / ${energy} / ${context}.`,
    });
    onClose();
  }

  return (
    <div
      className="ch100-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="triageModalTitle"
    >
      <div className="ch100-triage-modal">
        {/* SMPTE Broadcast Pattern Bar */}
        <div className="ch100-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>

        {/* Modal Broadcast Console Header */}
        <div className="ch100-triage-header">
          <div className="ch100-triage-header-info">
            <div className="ch100-triage-tagline">
              <span className="ch100-triage-dot" />
              <span>CH·100 // DECISION MATRIX</span>
              <span className="ch100-triage-freq">FREQ 100.0 MHZ</span>
            </div>
            <h2 id="triageModalTitle" className="ch100-triage-title">
              {step === "result" ? "Triage Prescription" : "Watchlist Decision Matrix"}
            </h2>
            <p className="ch100-triage-sub">
              {step === "result"
                ? "The single best worldwide choice calibrated to your time, energy, and context."
                : "Cure watchlist paralysis. Answer 3 quick diagnostic questions to pinpoint tonight's watch."}
            </p>
          </div>

          <button
            type="button"
            className="ch100-log-dclose"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Diagnostic Progress Steps Bar (visible during questions) */}
        {step !== "scanning" && step !== "result" && (
          <div className="ch100-triage-steps-bar" role="navigation" aria-label="Triage Steps">
            <button
              type="button"
              className={`ch100-tstep-btn ${step === "time" ? "active" : "done"}`}
              onClick={() => {
                playClick();
                setStep("time");
              }}
            >
              <span className="step-num">01</span>
              <span className="step-label">Time Allowance</span>
            </button>
            <span className="ch100-tstep-arrow" aria-hidden="true">→</span>
            <button
              type="button"
              className={`ch100-tstep-btn ${step === "energy" ? "active" : step === "context" ? "done" : "idle"}`}
              onClick={() => {
                if (step === "context") {
                  playClick();
                  setStep("energy");
                }
              }}
            >
              <span className="step-num">02</span>
              <span className="step-label">Mental Vibe</span>
            </button>
            <span className="ch100-tstep-arrow" aria-hidden="true">→</span>
            <div className={`ch100-tstep-btn ${step === "context" ? "active" : "idle"}`}>
              <span className="step-num">03</span>
              <span className="step-label">Viewing Context</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="ch100-triage-body">
          {/* STEP 1: TIME ALLOWANCE */}
          {step === "time" && (
            <div className="ch100-triage-step-container">
              <div className="ch100-triage-prompt">
                <span className="ch100-triage-qbadge">QUESTION 1 OF 3</span>
                <h3>How much time do you actually have tonight?</h3>
                <p>Pick your realistic runtime window with zero fluff.</p>
              </div>

              <div className="ch100-triage-grid">
                {TRIAGE_TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`ch100-tcard ${time === opt.id ? "selected" : ""}`}
                    onClick={() => handleSelectTime(opt.id)}
                  >
                    <div className="ch100-tcard-top">
                      <span className="ch100-tcard-icon">{opt.icon}</span>
                      <span className="ch100-tcard-badge">{opt.badge}</span>
                    </div>
                    <strong className="ch100-tcard-title">{opt.label}</strong>
                    <p className="ch100-tcard-desc">{opt.desc}</p>
                    <span className="ch100-tcard-action">Select &amp; Proceed →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: MENTAL ENERGY & MOOD */}
          {step === "energy" && (
            <div className="ch100-triage-step-container">
              <div className="ch100-triage-prompt">
                <span className="ch100-triage-qbadge">QUESTION 2 OF 3</span>
                <h3>What is your mental energy &amp; mood right now?</h3>
                <p>Be honest about how much cognitive or emotional effort you want to invest.</p>
              </div>

              <div className="ch100-triage-grid">
                {TRIAGE_ENERGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`ch100-tcard ${energy === opt.id ? "selected" : ""}`}
                    onClick={() => handleSelectEnergy(opt.id)}
                  >
                    <div className="ch100-tcard-top">
                      <span className="ch100-tcard-icon">{opt.icon}</span>
                      <span className="ch100-tcard-badge">{opt.badge}</span>
                    </div>
                    <strong className="ch100-tcard-title">{opt.label}</strong>
                    <p className="ch100-tcard-desc">{opt.desc}</p>
                    <span className="ch100-tcard-action">Select &amp; Proceed →</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="ch100-triage-back-btn"
                onClick={() => {
                  playClick();
                  setStep("time");
                }}
              >
                ← Back to Time Allowance
              </button>
            </div>
          )}

          {/* STEP 3: VIEWING CONTEXT */}
          {step === "context" && (
            <div className="ch100-triage-step-container">
              <div className="ch100-triage-prompt">
                <span className="ch100-triage-qbadge">QUESTION 3 OF 3</span>
                <h3>Who is in the room watching with you?</h3>
                <p>Different company requires completely different pacing and accessibility.</p>
              </div>

              <div className="ch100-triage-grid ch100-grid-3">
                {TRIAGE_CONTEXT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`ch100-tcard ${context === opt.id ? "selected" : ""}`}
                    onClick={() => handleSelectContext(opt.id)}
                  >
                    <div className="ch100-tcard-top">
                      <span className="ch100-tcard-icon">{opt.icon}</span>
                      <span className="ch100-tcard-badge">{opt.badge}</span>
                    </div>
                    <strong className="ch100-tcard-title">{opt.label}</strong>
                    <p className="ch100-tcard-desc">{opt.desc}</p>
                    <span className="ch100-tcard-action">Calibrate &amp; Diagnose ⚡</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="ch100-triage-back-btn"
                onClick={() => {
                  playClick();
                  setStep("energy");
                }}
              >
                ← Back to Mental Vibe
              </button>
            </div>
          )}

          {/* SCANNING FREQUENCIES ANIMATION */}
          {step === "scanning" && (
            <div className="ch100-triage-scanning">
              <div className="ch100-tscan-radar">
                <div className="ch100-tscan-ring r1" />
                <div className="ch100-tscan-ring r2" />
                <div className="ch100-tscan-ring r3" />
                <div className="ch100-tscan-sweep" />
                <span className="ch100-tscan-center">⚡</span>
              </div>

              <div className="ch100-tscan-status">
                <span className="ch100-tscan-prompt">DECISION MATRIX PROCESSING</span>
                <p className="ch100-tscan-live">{scanMessage}</p>
                <div className="ch100-tscan-tags">
                  <span>⏱️ {time}</span>
                  <span>⚡ {energy}</span>
                  <span>👥 {context}</span>
                </div>
              </div>
            </div>
          )}

          {/* PRESCRIPTION / RESULT VIEW */}
          {step === "result" && currentPick && (
            <div className="ch100-triage-result">
              {/* Prescription Header Showcase */}
              <div
                className="ch100-tresult-card"
                style={{
                  borderTop: `4px solid ${currentPick.color || "#F5C518"}`,
                }}
              >
                <div className="ch100-tresult-top">
                  <div className="ch100-tresult-badges">
                    <span className="ch100-tresult-rx">🎯 THE PRESCRIPTION</span>
                    {currentPick.matchedFromWatchlist && (
                      <span className="ch100-tresult-match">⚡ FROM YOUR BACKLOG</span>
                    )}
                    <span className="ch100-tresult-meta-pill">
                      {currentPick.langFlag} {currentPick.lang}
                    </span>
                    <span className="ch100-tresult-meta-pill">
                      {currentPick.kind === "film"
                        ? "🎬 Feature Film"
                        : currentPick.kind === "anime"
                        ? "⚔️ Anime"
                        : currentPick.kind === "mini-series"
                        ? "🎞️ Mini-Series"
                        : "📺 TV Series"}
                    </span>
                  </div>

                  <span className="ch100-tresult-score">{currentPick.ratingScore}</span>
                </div>

                <div className="ch100-tresult-headline">
                  <h3 className="ch100-tresult-title">
                    {currentPick.title} <small>({currentPick.year})</small>
                  </h3>
                  {currentPick.tagline && (
                    <p className="ch100-tresult-tagline">“{currentPick.tagline}”</p>
                  )}
                </div>

                {/* Why This Fits Tonight Callout */}
                <div className="ch100-tresult-why">
                  <div className="ch100-twhy-header">
                    <span className="ch100-twhy-icon">💡</span>
                    <strong>WHY THIS FITS TONIGHT</strong>
                    <span className="ch100-twhy-params">
                      ({time} · {energy} · {context})
                    </span>
                  </div>
                  <p className="ch100-twhy-text">{currentPick.whyThisFits}</p>
                </div>

                {/* Synopsis / Hook */}
                <p className="ch100-tresult-hook">{currentPick.hook}</p>

                {/* Key Quick Metadata Bar */}
                <div className="ch100-tresult-info-row">
                  <div className="ch100-tinfo-item">
                    <span className="lbl">FORMAT / RUNTIME</span>
                    <strong>⏱️ {currentPick.runtime}</strong>
                  </div>
                  <div className="ch100-tinfo-item">
                    <span className="lbl">GENRE</span>
                    <strong>🎭 {currentPick.genre}</strong>
                  </div>
                  <div className="ch100-tinfo-item">
                    <span className="lbl">STREAMING ON</span>
                    <strong>📺 {currentPick.where}</strong>
                  </div>
                </div>

                {/* Primary Action Button Bar */}
                <div className="ch100-tresult-actions">
                  {onLogPrescription && (
                    <button
                      type="button"
                      className="ch100-tbtn-log"
                      onClick={handleLogCurrentPick}
                      title="Add this title straight into your personal Channel 100 tracker"
                    >
                      ⚡ + Log to Personal Tracker
                    </button>
                  )}

                  <button
                    type="button"
                    className="ch100-tbtn-restart"
                    onClick={handleReset}
                    title="Change diagnostic answers"
                  >
                    🔄 Recalibrate Filter
                  </button>
                </div>
              </div>

              {/* Alternative Frequencies Selector */}
              {alternatives.length > 0 && (
                <div className="ch100-talts-section">
                  <div className="ch100-talts-header">
                    <h4>BACKUP FREQUENCIES ({alternatives.length} ALTERNATIVE PICKS)</h4>
                    <span>Already seen it? Tap to switch to another worldwide title:</span>
                  </div>

                  <div className="ch100-talts-grid">
                    {/* Primary Option Selector */}
                    {prescription && (
                      <button
                        type="button"
                        className={`ch100-talt-card ${activePickIndex === 0 ? "active" : ""}`}
                        onClick={() => {
                          playClick();
                          setActivePickIndex(0);
                        }}
                      >
                        <div className="ch100-talt-top">
                          <span className="ch100-talt-num">#1 Primary</span>
                          <span className="ch100-talt-flag">{prescription.langFlag}</span>
                        </div>
                        <strong>{prescription.title}</strong>
                        <span className="ch100-talt-sub">
                          {prescription.year} · {prescription.where}
                        </span>
                      </button>
                    )}

                    {/* Alternatives */}
                    {alternatives.map((alt, idx) => (
                      <button
                        key={alt.id || idx}
                        type="button"
                        className={`ch100-talt-card ${activePickIndex === idx + 1 ? "active" : ""}`}
                        onClick={() => {
                          playClick();
                          setActivePickIndex(idx + 1);
                        }}
                      >
                        <div className="ch100-talt-top">
                          <span className="ch100-talt-num">#{idx + 2} Alternative</span>
                          <span className="ch100-talt-flag">{alt.langFlag}</span>
                        </div>
                        <strong>{alt.title}</strong>
                        <span className="ch100-talt-sub">
                          {alt.year} · {alt.where}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
