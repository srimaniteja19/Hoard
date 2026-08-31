"use client";

import React, { useState, useEffect } from "react";
import { AppPage } from "@/components/chrome/AppPage";
import { IntakePanel } from "@/components/summarizer/IntakePanel";
import { PlanEditor } from "@/components/summarizer/PlanEditor";
import { DigestReader } from "@/components/summarizer/DigestReader";
import { SavedDigestsShelf } from "@/components/summarizer/SavedDigestsShelf";
import { CourseFolderHub } from "@/components/summarizer/CourseFolderHub";
import { WorkingStageChain, WorkingStage } from "@/components/summarizer/WorkingStageChain";
import { analyzeIntake } from "@/lib/summarizer/intakeAnalyzer";
import { getSavedDigests, SavedDigestItem } from "@/lib/summarizer/storage";
import { getCourseFolders, CourseFolder } from "@/lib/summarizer/folders";
import { IntakeAnalysis, DigestPlan, DigestResult } from "@/lib/summarizer/types";
import { SAMPLES } from "@/lib/summarizer/samples";
import { playSound } from "@/lib/sound";
import { Sparkles, Bookmark, Zap, ArrowRight, RotateCcw, Folder } from "lucide-react";

type SummarizerStep = "INTAKE" | "PLAN" | "WORKING" | "DIGEST";
type ActiveTab = "SYNTHESIZE" | "SHELF" | "FOLDERS";

const DEFAULT_SAMPLE = SAMPLES[0].text; // Black-Scholes

export default function SummarizerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("SYNTHESIZE");
  const [text, setText] = useState<string>(DEFAULT_SAMPLE);
  const [intake, setIntake] = useState<IntakeAnalysis>(() => analyzeIntake(DEFAULT_SAMPLE));
  const [step, setStep] = useState<SummarizerStep>("INTAKE");
  const [plan, setPlan] = useState<DigestPlan | null>(null);
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [savedItems, setSavedItems] = useState<SavedDigestItem[]>([]);
  const [folders, setFolders] = useState<CourseFolder[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetFolder, setTargetFolder] = useState<CourseFolder | null>(null);

  // Working chain stages & logs
  const [currentStage, setCurrentStage] = useState<WorkingStage>("READ_WHOLE");
  const [logs, setLogs] = useState<string[]>([]);

  // Load saved digests and folders on mount
  useEffect(() => {
    setMounted(true);
    setSavedItems(getSavedDigests());
    setFolders(getCourseFolders());
  }, []);

  const refreshSavedList = () => {
    setSavedItems(getSavedDigests());
    setFolders(getCourseFolders());
  };

  // Update intake telemetry in real-time as text changes
  useEffect(() => {
    const analysis = analyzeIntake(text);
    setIntake(analysis);
  }, [text]);

  const handleStartDigestForFolder = (folder: CourseFolder) => {
    setTargetFolder(folder);
    setActiveTab("SYNTHESIZE");
    setStep("INTAKE");
    setText("");
    playSound.fileIt();
  };

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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Plan analysis failed (${res.status})`);
      }

      const data = await res.json();
      setIntake(data.intake);
      setPlan(data.plan);
      setStep("PLAN");
      playSound.fileIt();
    } catch (err: any) {
      console.error("Plan step failed:", err);
      setError(err.message || "Failed to generate plan.");
      playSound.pop();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmWrite = async () => {
    if (!plan) return;
    try {
      setLoading(true);
      setError(null);
      setStep("WORKING");
      setLogs([]);
      playSound.click();

      // 6-stage working chain progression
      const stages: WorkingStage[] = [
        "READ_WHOLE",
        "FIND_ARGUMENT",
        "RANK_MATTERS",
        "CHOOSE_FIGURES",
        "FLAG_CLAIMS",
        "WRITE_DIGEST",
      ];

      const stageLogs = [
        "Ingested source tokens. Evaluating information density...",
        "Thesis hypothesis verified: Dropping meta-narrative framing...",
        "Structuring non-meta section headings according to argument logic...",
        "Synthesizing 700-900 words of load-bearing prose with <strong> phrases...",
        "Evaluating candidate figures against strict drawability criteria...",
        "Performing unverified claim audit on numbers and asserting tags...",
      ];

      for (let i = 0; i < stages.length; i++) {
        setCurrentStage(stages[i]);
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${stageLogs[i]}`]);
        await new Promise((r) => setTimeout(r, 600));
      }

      const res = await fetch("/api/summarizer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, planOverrides: plan }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Digest generation failed (${res.status})`);
      }

      const data = await res.json();
      setDigest(data.digest);
      setCurrentStage("DONE");
      setStep("DIGEST");
      playSound.fileIt();
    } catch (err: any) {
      console.error("Digest synthesis failed:", err);
      setError(err.message || "Failed to synthesize digest.");
      setStep("PLAN");
      playSound.pop();
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    playSound.click();
    setStep("INTAKE");
    setDigest(null);
    setPlan(null);
  };

  const handleOpenSavedDigest = (savedDigest: DigestResult) => {
    setDigest(savedDigest);
    setStep("DIGEST");
    setActiveTab("SYNTHESIZE");
  };

  const foldersCount = getCourseFolders().length;

  return (
    <AppPage width="wide">
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "60px" }}>
        {/* ── TOP HERO HEADER ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
            borderBottom: "2px solid #0A0A0A",
            paddingBottom: "18px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 900,
                  background: "#0A0A0A",
                  color: "#FFE600",
                  padding: "3px 8px",
                  borderRadius: "2px",
                  letterSpacing: "0.08em",
                }}
              >
                PROMPT COMPRESSION ENGINE
              </span>
              <h1
                style={{
                  fontFamily: "var(--display, sans-serif)",
                  fontSize: "28px",
                  fontWeight: 900,
                  color: "#0A0A0A",
                  margin: 0,
                  letterSpacing: "-0.03em",
                }}
              >
                UNIVERSAL DIGEST SYNTHESIZER
              </h1>
            </div>
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "12.5px",
                color: "#4A4A4A",
                fontWeight: 600,
                marginTop: "6px",
              }}
            >
              Turns dense course material, papers, and lectures into load-bearing digests and study dossiers.
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
                  setActiveTab("FOLDERS");
                  refreshSavedList();
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 900,
                  padding: "5px 12px",
                  background: activeTab === "FOLDERS" ? "#FFE600" : "transparent",
                  color: activeTab === "FOLDERS" ? "#0A0A0A" : "#FFFFFF",
                  border: "none",
                  borderRadius: "2px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Folder size={12} />
                COURSE DOSSIERS {mounted ? `(${folders.length})` : ""}
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
                ALL SAVED {mounted ? `(${savedItems.length})` : ""}
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
            {targetFolder && step === "INTAKE" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111111", border: `1.5px solid ${targetFolder.color}`, padding: "10px 16px", borderRadius: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>{targetFolder.icon}</span>
                  <span style={{ fontFamily: "var(--mono, monospace)", fontSize: "11.5px", color: "#FFFFFF", fontWeight: 900 }}>
                    Synthesizing into Course Folder: <b style={{ color: targetFolder.color }}>{targetFolder.name}</b>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetFolder(null)}
                  style={{ background: "none", border: "none", color: "#888888", cursor: "pointer", fontSize: "11px" }}
                >
                  ✕ Clear
                </button>
              </div>
            )}

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

        {/* ── TAB 2: COURSE DOSSIERS & FOLDERS ── */}
        {activeTab === "FOLDERS" && (
          <CourseFolderHub
            savedDigests={savedItems}
            onOpenDigest={handleOpenSavedDigest}
            onStartDigestForFolder={handleStartDigestForFolder}
            onRefreshAll={refreshSavedList}
          />
        )}

        {/* ── TAB 3: SAVED DIGESTS SHELF (BY TAGS) ── */}
        {activeTab === "SHELF" && (
          <SavedDigestsShelf
            savedItems={savedItems}
            onOpenDigest={handleOpenSavedDigest}
            onRefreshList={refreshSavedList}
            onStartNew={() => {
              setActiveTab("SYNTHESIZE");
              handleReset();
            }}
          />
        )}
      </div>
    </AppPage>
  );
}
