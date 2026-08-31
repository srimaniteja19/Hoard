"use client";

import React, { useState, useEffect } from "react";
import { AppPage } from "@/components/chrome/AppPage";
import { IntakePanel } from "@/components/summarizer/IntakePanel";
import { PlanEditor } from "@/components/summarizer/PlanEditor";
import { DigestReader } from "@/components/summarizer/DigestReader";
import { SavedDigestsShelf } from "@/components/summarizer/SavedDigestsShelf";
import { WorkingStageChain, WorkingStage } from "@/components/summarizer/WorkingStageChain";
import { analyzeIntake } from "@/lib/summarizer/intakeAnalyzer";
import { getSavedDigests, SavedDigestItem } from "@/lib/summarizer/storage";
import { IntakeAnalysis, DigestPlan, DigestResult } from "@/lib/summarizer/types";
import { SAMPLES } from "@/lib/summarizer/samples";
import { playSound } from "@/lib/sound";
import { Sparkles, Bookmark, Zap, ArrowRight, RotateCcw } from "lucide-react";

type SummarizerStep = "INTAKE" | "PLAN" | "WORKING" | "DIGEST";
type ActiveTab = "SYNTHESIZE" | "SHELF";

const DEFAULT_SAMPLE = SAMPLES[0].text; // Black-Scholes

export default function SummarizerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("SYNTHESIZE");
  const [text, setText] = useState<string>(DEFAULT_SAMPLE);
  const [intake, setIntake] = useState<IntakeAnalysis>(() => analyzeIntake(DEFAULT_SAMPLE));
  const [step, setStep] = useState<SummarizerStep>("INTAKE");
  const [plan, setPlan] = useState<DigestPlan | null>(null);
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [savedItems, setSavedItems] = useState<SavedDigestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Working chain stages & logs
  const [currentStage, setCurrentStage] = useState<WorkingStage>("READ_WHOLE");
  const [logs, setLogs] = useState<string[]>([]);

  // Load saved digests on mount
  useEffect(() => {
    const loaded = getSavedDigests();
    setSavedItems(loaded);
  }, []);

  const refreshSavedList = () => {
    const loaded = getSavedDigests();
    setSavedItems(loaded);
  };

  // Update intake telemetry in real-time as text changes
  useEffect(() => {
    const analysis = analyzeIntake(text);
    setIntake(analysis);
  }, [text]);

  const handleAnalyzePlan = async () => {
    try {
      setLoading(true);
      setError(null);
      playSound.click();

      const res = await fetch("/api/summarizer/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to analyze source.");
      }

      const { plan: synthesizedPlan } = await res.json();
      setPlan(synthesizedPlan);
      setStep("PLAN");
      playSound.fileIt();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not generate pre-generation plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmWrite = async () => {
    try {
      setLoading(true);
      setError(null);
      setStep("WORKING");
      playSound.click();

      // Simulate step progression with real log telemetry
      setCurrentStage("READ_WHOLE");
      setLogs([`INGESTING ${intake.wordCount.toLocaleString()} WORDS OF SOURCE ${intake.sourceFormat}...`]);

      setTimeout(() => {
        setCurrentStage("FIND_ARGUMENT");
        setLogs((prev) => [
          ...prev,
          `IDENTIFIED CORE INSIGHT: "${plan?.thesisHypothesis || "Argument logic mapped"}"`,
          `PLANNING ${plan?.proposedHeadings?.length || 4} LOAD-BEARING SECTIONS...`,
        ]);
      }, 700);

      setTimeout(() => {
        setCurrentStage("RANK_MATTERS");
        setLogs((prev) => [
          ...prev,
          `DROPPING NON-ESSENTIAL TANGENTS (${intake.reductionPercentage}% PROSE ELIMINATED)...`,
          `ISOLATING SINGLE LOAD-BEARING PHRASE PER PARAGRAPH...`,
        ]);
      }, 1500);

      setTimeout(() => {
        setCurrentStage("CHOOSE_FIGURES");
        const figCount = plan?.candidateFigures?.length || 0;
        const figText = figCount > 0 ? `STRUCTURING ${figCount} DRAWABLE FIGURES (${plan?.candidateFigures.map((f) => f.kind).join(", ")})...` : `NO DRAWABLE STRUCTURE — SHIPPING WITHOUT FIGURES.`;
        setLogs((prev) => [...prev, figText]);
      }, 2300);

      setTimeout(() => {
        setCurrentStage("FLAG_CLAIMS");
        setLogs((prev) => [
          ...prev,
          `FLAGGING ${intake.numberCount} STATS & ASSERTIONS AS UNVERIFIED...`,
          `WRITING FINAL DIGEST PROSE (700-900 WORDS)...`,
        ]);
      }, 3100);

      setTimeout(() => {
        setCurrentStage("WRITE_DIGEST");
      }, 3900);

      // Trigger actual AI generation route
      const res = await fetch("/api/summarizer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          planOverrides: plan,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate digest.");
      }

      const { digest: synthesizedDigest } = await res.json();
      setDigest(synthesizedDigest);
      setCurrentStage("DONE");
      setLogs((prev) => [...prev, `✓ DIGEST SYNTHESIZED SUCCESSFULLY · ~${synthesizedDigest.readMinutes} MIN READ`]);

      setTimeout(() => {
        setStep("DIGEST");
        playSound.fileIt();
      }, 600);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to write digest.");
      setStep("PLAN");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    playSound.click();
    setStep("INTAKE");
    setDigest(null);
    setPlan(null);
    setError(null);
  };

  const handleOpenSavedDigest = (savedDigest: DigestResult) => {
    playSound.click();
    setDigest(savedDigest);
    setStep("DIGEST");
    setActiveTab("SYNTHESIZE");
  };

  return (
    <AppPage width="wide">
      <div style={{ padding: "12px 0 80px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* ── TOP HEADER (CRISP CONTRAST THEME) ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            borderBottom: "2px solid #0A0A0A",
            paddingBottom: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#0A0A0A",
                  boxShadow: "0 0 0 3px #FFE600",
                }}
              />
              <h1
                style={{
                  fontFamily: "var(--display, sans-serif)",
                  fontSize: "24px",
                  fontWeight: 900,
                  color: "#0A0A0A",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                DIGEST SYNTHESIZER &amp; SUMMARIZER
              </h1>
              <span
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 900,
                  background: "#0A0A0A",
                  color: "#FFE600",
                  padding: "3px 7px",
                  borderRadius: "2px",
                }}
              >
                3–5 MIN LOAD-BEARING
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "11.5px",
                color: "#4A4A4A",
                marginTop: "4px",
                fontWeight: 600,
              }}
            >
              Turns dense source material into a load-bearing digest you read instead of the original. Never meta-narrated.
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* View Switcher Tabs */}
            <div style={{ display: "flex", background: "#0A0A0A", padding: "3px", borderRadius: "4px", gap: "3px" }}>
              <button
                type="button"
                onClick={() => {
                  playSound.click();
                  setActiveTab("SYNTHESIZE");
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 900,
                  padding: "5px 12px",
                  background: activeTab === "SYNTHESIZE" ? "#FFE600" : "transparent",
                  color: activeTab === "SYNTHESIZE" ? "#0A0A0A" : "#FFFFFF",
                  border: "none",
                  borderRadius: "2px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Zap size={12} />
                SYNTHESIZER
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound.click();
                  setActiveTab("SHELF");
                  refreshSavedList();
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 900,
                  padding: "5px 12px",
                  background: activeTab === "SHELF" ? "#FFE600" : "transparent",
                  color: activeTab === "SHELF" ? "#0A0A0A" : "#FFFFFF",
                  border: "none",
                  borderRadius: "2px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Bookmark size={12} />
                SAVED SHELF ({savedItems.length})
              </button>
            </div>

            {activeTab === "SYNTHESIZE" && step !== "INTAKE" && (
              <button
                type="button"
                onClick={handleReset}
                className="btn-card-action"
                style={{
                  background: "#0A0A0A",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  border: "2px solid #0A0A0A",
                }}
              >
                <RotateCcw size={12} />
                START OVER
              </button>
            )}
          </div>
        </div>

        {/* Error alert banner */}
        {error && (
          <div style={{ background: "#450A0A", border: "1.5px solid #DC2626", color: "#FCA5A5", padding: "12px 16px", borderRadius: "4px", fontFamily: "var(--mono, monospace)", fontSize: "12px" }}>
            <b>⚠ ERROR:</b> {error}
          </div>
        )}

        {/* ── TAB 1: SYNTHESIZE WORKFLOW ── */}
        {activeTab === "SYNTHESIZE" && (
          <>
            {/* STEP 1: INTAKE */}
            {step === "INTAKE" && (
              <IntakePanel
                text={text}
                onChangeText={setText}
                intake={intake}
                onAnalyzePlan={handleAnalyzePlan}
                loading={loading}
              />
            )}

            {/* STEP 2: PRE-GENERATION PLAN */}
            {step === "PLAN" && plan && (
              <PlanEditor
                plan={plan}
                intake={intake}
                onChangePlan={setPlan}
                onConfirmWrite={handleConfirmWrite}
                onBackToIntake={() => setStep("INTAKE")}
                loading={loading}
              />
            )}

            {/* STEP 3: WORKING CHAIN */}
            {step === "WORKING" && (
              <WorkingStageChain currentStage={currentStage} logs={logs} />
            )}

            {/* STEP 4: RENDERED DIGEST */}
            {step === "DIGEST" && digest && (
              <DigestReader
                digest={digest}
                onReset={handleReset}
                onSaved={refreshSavedList}
              />
            )}
          </>
        )}

        {/* ── TAB 2: SAVED DIGESTS SHELF (BY TAGS) ── */}
        {activeTab === "SHELF" && (
          <SavedDigestsShelf
            savedItems={savedItems}
            onOpenDigest={handleOpenSavedDigest}
            onRefreshList={refreshSavedList}
            onStartNew={() => {
              setActiveTab("SYNTHESIZE");
              setStep("INTAKE");
            }}
          />
        )}
      </div>
    </AppPage>
  );
}
