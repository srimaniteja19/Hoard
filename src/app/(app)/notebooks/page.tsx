"use client";

import React, { useState, useEffect } from "react";
import {
  getStoredCourses,
  saveStoredCourses,
  saveLessonBlocks,
  addLessonGapStub,
  createNewCourse,
  getCollisions,
} from "@/lib/notebooks/storage";
import { SeedCourse, CourseCollision } from "@/lib/notebooks/seedData";
import { Block, computeWordCount, generateBlockId } from "@/lib/notebooks/blocks";
import { CourseCard } from "@/components/notebooks/CourseCard";
import { OutlineSidebar } from "@/components/notebooks/OutlineSidebar";
import { BlockEditor } from "@/components/notebooks/BlockEditor";
import { AiBar } from "@/components/notebooks/AiBar";
import { EmptyPage } from "@/components/notebooks/EmptyPage";
import { GapPanel } from "@/components/notebooks/GapPanel";
import { CollisionsPanel } from "@/components/notebooks/CollisionsPanel";
import { DiffSheet } from "@/components/notebooks/DiffSheet";
import { QuizModal } from "@/components/notebooks/QuizModal";
import { ExplainModal } from "@/components/notebooks/ExplainModal";
import { TranscriptModal } from "@/components/notebooks/TranscriptModal";
import { playSound } from "@/lib/sound";
import { Plus } from "lucide-react";

export default function NotebooksPage() {
  const [courses, setCourses] = useState<SeedCourse[]>([]);
  const [view, setView] = useState<"index" | "course">("index");
  const [currentCourseIdx, setCurrentCourseIdx] = useState(0);
  const [currentModuleIdx, setCurrentModuleIdx] = useState(1);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [paperTheme, setPaperTheme] = useState<"cream" | "ink">("cream");
  const [collisions, setCollisions] = useState<CourseCollision[]>([]);

  // AI Modal States
  const [diffOriginal, setDiffOriginal] = useState<Block[] | null>(null);
  const [diffProposed, setDiffProposed] = useState<Block[] | null>(null);
  const [diffSummary, setDiffSummary] = useState<string>("");
  const [isTidying, setIsTidying] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState<any[] | null>(null);
  const [quizNotEnough, setQuizNotEnough] = useState(false);
  const [quizExplanation, setQuizExplanation] = useState<string>("");

  const [explainSelection, setExplainSelection] = useState<string | null>(null);
  const [explainText, setExplainText] = useState<string>("");
  const [isExplaining, setIsExplaining] = useState(false);

  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);

  // Load courses on mount
  useEffect(() => {
    const loaded = getStoredCourses();
    setCourses(loaded);
    setCollisions(getCollisions());
  }, []);

  const currentCourse = courses[currentCourseIdx] || courses[0];
  const currentModule = currentCourse?.modules[currentModuleIdx] || currentCourse?.modules[0];
  const currentLesson = currentModule?.lessons[currentLessonIdx] || currentModule?.lessons[0];

  const currentBlocks = currentLesson?.blocks || [];
  const wordCount = computeWordCount(currentBlocks);

  const handleUpdateBlocks = (newBlocks: Block[]) => {
    if (!currentCourse || !currentLesson) return;
    const updated = saveLessonBlocks(currentCourse.id, currentLesson.id, newBlocks);
    setCourses([...updated]);
  };

  const handleSelectCourseFromCard = (idx: number) => {
    playSound.click();
    setCurrentCourseIdx(idx);
    setCurrentModuleIdx(0);
    setCurrentLessonIdx(0);
    setView("course");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // AI: TIDY MY NOTES
  const handleTidyNotes = async () => {
    if (currentBlocks.length === 0) return;
    setIsTidying(true);
    try {
      const res = await fetch("/api/notebooks/tidy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: currentBlocks,
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setDiffOriginal(currentBlocks);
      setDiffProposed(data.blocks);
      setDiffSummary(data.summaryOfChanges || "Restructured notes into organized sections.");
      playSound.fileIt();
    } catch {
      alert("Could not tidy notes at this moment. Please check connection.");
    } finally {
      setIsTidying(false);
    }
  };

  // AI: QUIZ ME
  const handleQuizMe = async () => {
    try {
      const res = await fetch("/api/notebooks/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: currentBlocks,
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setQuizQuestions(data.questions || []);
      setQuizNotEnough(!!data.notEnough);
      setQuizExplanation(data.explanation || "");
      playSound.fileIt();
    } catch {
      alert("Failed to generate quiz.");
    }
  };

  // AI: EXPLAIN AGAIN
  const handleExplain = async () => {
    const selectedText = window.getSelection()?.toString().trim();
    const targetText =
      selectedText ||
      currentBlocks.find((b) => b.type === "paragraph" || b.type === "callout")?.text ||
      "Agentic reflection with outside verification";

    setExplainSelection(targetText);
    setExplainText("");
    setIsExplaining(true);

    try {
      const res = await fetch("/api/notebooks/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: targetText,
          context: JSON.stringify(currentBlocks),
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setExplainText(data.explanation);
      playSound.fileIt();
    } catch {
      setExplainText("Failed to generate contextual explanation.");
    } finally {
      setIsExplaining(false);
    }
  };

  // AI: WHAT DID I MISS? (Gap analysis)
  const handleAnalyzeTranscript = async (transcriptText: string) => {
    setIsAnalyzingGaps(true);
    try {
      const res = await fetch("/api/notebooks/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptText,
          blocks: currentBlocks,
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (currentLesson) {
        currentLesson.gap = data.gaps;
        saveStoredCourses(courses);
        setCourses([...courses]);
      }
      setShowTranscriptModal(false);
      playSound.fileIt();
    } catch {
      alert("Failed to analyze gaps.");
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  // AI: FIND COLLISIONS
  const handleFindCollisions = async () => {
    playSound.click();
    try {
      const res = await fetch("/api/notebooks/collisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.collisions && data.collisions.length > 0) {
          setCollisions(data.collisions);
        }
      }
    } catch {
      // keep fallback
    }
    setView("index");
    setTimeout(() => {
      window.scrollTo({ top: 600, behavior: "smooth" });
    }, 100);
  };

  const handleAddCourse = () => {
    const title = prompt("Enter course title (e.g. LLM Systems Architecture):");
    if (!title) return;
    const newCourse = createNewCourse(title);
    setCourses([...courses, newCourse]);
    setCurrentCourseIdx(courses.length);
    setCurrentModuleIdx(0);
    setCurrentLessonIdx(0);
    setView("course");
  };

  const isInk = paperTheme === "ink";

  return (
    <div
      className="page-scroll"
      style={{
        background: isInk ? "#0D0F13" : "#F3F0E8",
        color: isInk ? "#F0EDE4" : "#0A0A0A",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflowY: view === "index" ? "auto" : "hidden",
        fontFamily: "var(--body, 'Space Grotesk', sans-serif)",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      {/* Top Paper Mode Switcher Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontFamily: "var(--mono, monospace)",
          fontSize: "10.5px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          padding: "12px clamp(16px, 3vw, 28px)",
          borderBottom: "3px solid #0A0A0A",
          background: isInk ? "#0D0F13" : "#F3F0E8",
          flexShrink: 0,
          zIndex: 40,
        }}
      >
        <span
          onClick={() => setView("index")}
          style={{ cursor: "pointer", opacity: view === "index" ? 1 : 0.4 }}
        >
          NOTEBOOKS
        </span>
        {view === "course" && (
          <>
            <span style={{ opacity: 0.3 }}>/</span>
            <span style={{ color: currentCourse?.accent || "inherit" }}>
              {currentCourse?.title.toUpperCase()}
            </span>
          </>
        )}
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", border: "2px solid #0A0A0A" }}>
          <button
            type="button"
            onClick={() => setPaperTheme("cream")}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              border: "none",
              borderRight: "2px solid #0A0A0A",
              background: !isInk ? "#0A0A0A" : "transparent",
              color: !isInk ? "#F3F0E8" : "#F0EDE4",
              padding: "4px 9px",
              cursor: "pointer",
            }}
          >
            CREAM
          </button>
          <button
            type="button"
            onClick={() => setPaperTheme("ink")}
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              border: "none",
              background: isInk ? "#0A0A0A" : "transparent",
              color: isInk ? "#B8F04A" : "#0A0A0A",
              padding: "4px 9px",
              cursor: "pointer",
            }}
          >
            INK
          </button>
        </div>
      </div>

      {/* ══════════ 1. INDEX VIEW ══════════ */}
      {view === "index" && (
        <div style={{ maxWidth: "1180px", width: "100%", margin: "0 auto", padding: "34px clamp(16px, 3vw, 30px) 110px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "22px",
              flexWrap: "wrap",
              marginBottom: "30px",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "var(--display, sans-serif)",
                  fontWeight: 800,
                  fontSize: "clamp(34px, 6vw, 60px)",
                  lineHeight: 0.94,
                  letterSpacing: "-0.055em",
                }}
              >
                Notebooks
              </h1>
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  opacity: 0.5,
                  marginTop: "9px",
                }}
              >
                {courses.length} COURSES ·{" "}
                {courses.flatMap((c) => c.modules.flatMap((m) => m.lessons)).length} LESSONS ·{" "}
                {collisions.length} CROSS-COURSE COLLISIONS
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddCourse}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.13em",
                border: "3px solid #0A0A0A",
                background: "#FFFFFF",
                color: "#0A0A0A",
                padding: "11px 17px",
                cursor: "pointer",
                boxShadow: "4px 4px 0 #0A0A0A",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FCE94F")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
            >
              ＋ ADD A COURSE
            </button>
          </div>

          {/* Courses Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "24px",
              marginBottom: "40px",
            }}
          >
            {courses.map((course, idx) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => handleSelectCourseFromCard(idx)}
              />
            ))}

            {/* Add Course Dashed Card */}
            <div
              onClick={handleAddCourse}
              style={{
                border: "3px dashed rgba(10,10,10,0.3)",
                background: "transparent",
                minHeight: "250px",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(252,233,79,0.2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  opacity: 0.5,
                }}
              >
                ＋ ADD A COURSE
              </span>
            </div>
          </div>

          {/* Cross-Course Collisions Matrix */}
          <CollisionsPanel collisions={collisions} />
        </div>
      )}

      {/* ══════════ 2. COURSE WORKSPACE VIEW ══════════ */}
      {view === "course" && currentCourse && currentLesson && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px minmax(0, 1fr)",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Outline Sidebar */}
          <OutlineSidebar
            courses={courses}
            currentCourseIndex={currentCourseIdx}
            currentModuleIndex={currentModuleIdx}
            currentLessonIndex={currentLessonIdx}
            onSelectCourse={(idx) => {
              setCurrentCourseIdx(idx);
              setCurrentModuleIdx(0);
              setCurrentLessonIdx(0);
            }}
            onSelectLesson={(modIdx, lesIdx) => {
              setCurrentModuleIdx(modIdx);
              setCurrentLessonIdx(lesIdx);
            }}
            onBackToIndex={() => setView("index")}
            onNewPage={() => {
              const newTitle = prompt("Lesson title:");
              if (!newTitle) return;
              const newLesson = {
                id: "les-" + Date.now().toString(36),
                title: newTitle,
                watched: true,
                meta: "STUB · 1 LINE",
                blocks: [{ id: generateBlockId(), type: "paragraph" as const, text: "" }],
              };
              currentCourse.modules[0].lessons.push(newLesson);
              saveStoredCourses(courses);
              setCourses([...courses]);
              setCurrentModuleIdx(0);
              setCurrentLessonIdx(currentCourse.modules[0].lessons.length - 1);
            }}
          />

          {/* Main Notebook Page Area */}
          <main
            style={{
              padding: "32px clamp(16px, 4vw, 58px) 120px",
              overflowY: "auto",
              height: "100%",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div style={{ maxWidth: "900px", margin: "0 auto" }}>
              {/* Breadcrumb */}
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  opacity: 0.45,
                  marginBottom: "16px",
                }}
              >
                {currentCourse.title.toUpperCase()} · {currentModule.title.split(" · ")[0]} · LESSON{" "}
                {currentLessonIdx + 1}
              </div>

              {/* Lesson Title */}
              <h1
                style={{
                  margin: "0 0 6px",
                  fontFamily: "var(--display, sans-serif)",
                  fontWeight: 800,
                  fontSize: "clamp(28px, 4.8vw, 48px)",
                  lineHeight: 0.97,
                  letterSpacing: "-0.05em",
                }}
              >
                {currentLesson.title}
              </h1>

              {/* Meta Row */}
              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  flexWrap: "wrap",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  opacity: 0.5,
                  marginBottom: "8px",
                }}
              >
                <span>{currentLesson.meta}</span>
                <span>{wordCount.toLocaleString()} WORDS</span>
              </div>

              {/* 5 AI Action Triggers */}
              <AiBar
                accentColor={currentCourse.accent}
                accentFg={currentCourse.accentFg}
                onTidy={handleTidyNotes}
                onQuiz={handleQuizMe}
                onExplain={handleExplain}
                onCollisions={handleFindCollisions}
                onGaps={() => {
                  if (currentLesson.transcript) {
                    handleAnalyzeTranscript(currentLesson.transcript.text);
                  } else {
                    setShowTranscriptModal(true);
                  }
                }}
                isTidying={isTidying}
              />

              {/* Content: Empty Page vs Block Editor */}
              {currentBlocks.length === 0 ? (
                <EmptyPage
                  onStartWriting={() => {
                    handleUpdateBlocks([
                      { id: generateBlockId(), type: "paragraph", text: "Start writing notes from the lecture…" },
                    ]);
                  }}
                  onPasteTranscript={() => setShowTranscriptModal(true)}
                  onDraftFromSlides={() => {
                    handleUpdateBlocks([
                      { id: generateBlockId(), type: "heading", level: 2, text: "Key Concepts from Slides" },
                      { id: generateBlockId(), type: "paragraph", text: "[Draft from Slides] Review lecture slides and outline core principles." },
                    ]);
                  }}
                />
              ) : (
                <BlockEditor
                  blocks={currentBlocks}
                  onChange={handleUpdateBlocks}
                  accentColor={currentCourse.accent}
                />
              )}

              {/* Gap Check Panel (What Did I Miss?) */}
              {currentLesson.gap && currentLesson.gap.length > 0 && (
                <GapPanel
                  gaps={currentLesson.gap}
                  onAddStub={(timestamp, topic) => {
                    const updated = addLessonGapStub(
                      currentCourse.id,
                      currentLesson.id,
                      timestamp,
                      topic
                    );
                    setCourses([...updated]);
                  }}
                />
              )}
            </div>
          </main>
        </div>
      )}

      {/* ══════════ AI MODALS & SHEETS ══════════ */}
      {/* 1. DiffSheet (Tidy My Notes) */}
      {diffOriginal && diffProposed && (
        <DiffSheet
          originalBlocks={diffOriginal}
          proposedBlocks={diffProposed}
          summaryOfChanges={diffSummary}
          onApplyAll={() => {
            handleUpdateBlocks(diffProposed);
            setDiffOriginal(null);
            setDiffProposed(null);
          }}
          onApplySelected={(accepted) => {
            handleUpdateBlocks(accepted);
            setDiffOriginal(null);
            setDiffProposed(null);
          }}
          onDiscard={() => {
            setDiffOriginal(null);
            setDiffProposed(null);
          }}
          accentColor={currentCourse?.accent}
        />
      )}

      {/* 2. Quiz Modal */}
      {quizQuestions !== null && (
        <QuizModal
          questions={quizQuestions}
          notEnough={quizNotEnough}
          explanation={quizExplanation}
          onClose={() => setQuizQuestions(null)}
          accentColor={currentCourse?.accent}
        />
      )}

      {/* 3. Explain Side Panel */}
      {explainSelection !== null && (
        <ExplainModal
          selection={explainSelection}
          explanation={explainText}
          loading={isExplaining}
          onAddAsToggle={(toggleBlock) => {
            handleUpdateBlocks([...currentBlocks, toggleBlock]);
          }}
          onClose={() => setExplainSelection(null)}
          accentColor={currentCourse?.accent}
        />
      )}

      {/* 4. Transcript Gap Modal */}
      {showTranscriptModal && (
        <TranscriptModal
          onAnalyzeGaps={handleAnalyzeTranscript}
          onClose={() => setShowTranscriptModal(false)}
          loading={isAnalyzingGaps}
        />
      )}
    </div>
  );
}
