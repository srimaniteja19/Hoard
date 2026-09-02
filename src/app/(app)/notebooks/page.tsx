"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  getStoredCourses,
  saveStoredCourses,
  computeLessonBlocksUpdate,
  addLessonGapStub,
  deleteLesson,
  clearLessonNotes,
  createNewCourse,
  toggleLessonWatched,
  fetchNotebooksFromDbApi,
  saveLessonBlocksToDbApi,
  primeLessonBlocksVersion,
  getCollisions,
  createCourseInDbApi,
  updateCourseInDbApi,
  deleteCourseFromDbApi,
  createLessonInDbApi,
  updateLessonInDbApi,
  deleteLessonFromDbApi,
  flushOfflineQueueToDbApi,
  saveCollisions,
  reorderLessonsInMemory,
  reorderLessonsInDbApi,
  duplicateLessonInDbApi,
  createModuleInDbApi,
  updateModuleInDbApi,
  deleteModuleInDbApi,
} from "@/lib/notebooks/storage";
import {
  subscribeToRealtimeEvents,
  broadcastRealtimeEvent,
  setSyncStatus,
} from "@/lib/notebooks/realtime";
import { SeedCourse, SeedCourseLesson, SeedCourseModule, CourseCollision } from "@/lib/notebooks/seedData";
import { Block, computeWordCount, generateBlockId, convertBlocksToMarkdown } from "@/lib/notebooks/blocks";
import { CourseCard } from "@/components/notebooks/CourseCard";
import { CollisionsPanel } from "@/components/notebooks/CollisionsPanel";
import { OutlineSidebar } from "@/components/notebooks/OutlineSidebar";
import { BlockEditor } from "@/components/notebooks/BlockEditor";
import { SyncStatusPill } from "@/components/notebooks/SyncStatusPill";
import { AiBar } from "@/components/notebooks/AiBar";
import { EmptyPage } from "@/components/notebooks/EmptyPage";
import { GapPanel } from "@/components/notebooks/GapPanel";
import { DiffSheet } from "@/components/notebooks/DiffSheet";
import { QuizModal } from "@/components/notebooks/QuizModal";
import { ExplainModal } from "@/components/notebooks/ExplainModal";
import { TranscriptModal } from "@/components/notebooks/TranscriptModal";
import { AddCourseModal } from "@/components/notebooks/AddCourseModal";
import { EditCourseModal } from "@/components/notebooks/EditCourseModal";
import { AddModuleModal } from "@/components/notebooks/AddModuleModal";
import { AddPageModal } from "@/components/notebooks/AddPageModal";
import { ConfirmModal } from "@/components/notebooks/ConfirmModal";
import { QuickSwitcherModal } from "@/components/notebooks/QuickSwitcherModal";
import { FlashcardModal } from "@/components/notebooks/FlashcardModal";
import { playSound } from "@/lib/sound";
import {
  Plus,
  Pencil,
  Copy,
  Check,
  ExternalLink,
  List,
  Clock,
  FileText,
  Sparkles,
  Link as LinkIcon,
  Maximize2,
  Minimize2,
  Printer,
  Layers,
  Search,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  MoreHorizontal,
  ChevronDown,
  Trash2,
  HelpCircle,
  Wand2,
} from "lucide-react";
import { NotebookTheme, TypographyStyle, TYPOGRAPHY_FONTS, getThemeTokens } from "@/lib/notebooks/theme";
import { PageCoverBanner } from "@/components/notebooks/PageCoverBanner";

export default function NotebooksPage() {
  const [courses, setCourses] = useState<SeedCourse[]>([]);
  const [collisions, setCollisions] = useState<CourseCollision[]>([]);
  const [view, setView] = useState<"index" | "course">("index");
  const [currentCourseIdx, setCurrentCourseIdx] = useState(0);
  const [currentModuleIdx, setCurrentModuleIdx] = useState(1);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [paperTheme, setPaperTheme] = useState<NotebookTheme>("cream");
  const [typography, setTypography] = useState<TypographyStyle>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hoard_notebook_typography") as TypographyStyle;
      if (saved && (saved === "sans" || saved === "serif" || saved === "mono")) return saved;
    }
    return "sans";
  });

  const handleToggleTypography = (font: TypographyStyle) => {
    playSound.click();
    setTypography(font);
    if (typeof window !== "undefined") {
      localStorage.setItem("hoard_notebook_typography", font);
    }
  };

  // The two-column course workspace (fixed 300px sidebar + fluid content) has
  // no room to breathe below ~860px — a phone would show a squeezed sliver of
  // note content next to an unshrinkable sidebar. Below that width the
  // sidebar becomes an off-canvas drawer instead of a permanent column.
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 860);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Dialog / Modal States
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SeedCourse | null>(null);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [addPageContext, setAddPageContext] = useState<{ modIdx: number; targetPosition?: number } | null>(null);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    confirmVariant: "danger" | "warning" | "default";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "CONFIRM",
    confirmVariant: "danger",
    onConfirm: () => {},
  });

  // AI Modal States
  const [diffOriginal, setDiffOriginal] = useState<Block[] | null>(null);
  const [diffProposed, setDiffProposed] = useState<Block[] | null>(null);
  const [diffSummary, setDiffSummary] = useState<string>("");
  const [isTidying, setIsTidying] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState<any[] | null>(null);
  const [quizNotEnough, setQuizNotEnough] = useState(false);
  const [quizExplanation, setQuizExplanation] = useState<string>("");
  const [isQuizzing, setIsQuizzing] = useState(false);

  const [explainSelection, setExplainSelection] = useState<string | null>(null);
  const [explainText, setExplainText] = useState<string>("");
  const [isExplaining, setIsExplaining] = useState(false);

  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);

  // Page Productivity & Outline States
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [copiedMarkdownToast, setCopiedMarkdownToast] = useState(false);
  const [showToc, setShowToc] = useState(false);

  // Focus Mode, Quick Switcher, Flashcard, & Deep Search States
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  // Clean Header Dropdown States
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showPageMoreMenu, setShowPageMoreMenu] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const pageMoreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setShowAiMenu(false);
      }
      if (pageMoreMenuRef.current && !pageMoreMenuRef.current.contains(e.target as Node)) {
        setShowPageMoreMenu(false);
      }
    };
    if (showAiMenu || showPageMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAiMenu, showPageMoreMenu]);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K for Quick Switcher, Escape for Focus mode)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowQuickSwitcher((prev) => !prev);
      } else if (e.key === "Escape" && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isFocusMode]);

  // Tracks a write (PATCH) that has already been dispatched to the server but
  // hasn't resolved yet. A refetch-and-overwrite (visibilitychange, online,
  // FULL_SYNC_REQUESTED, or the initial mount fetch) that lands while this is
  // set would read data from before the write committed and silently revert
  // the in-flight edit — so every auto-refetch must wait on this first.
  const inFlightSaveRef = useRef<Promise<unknown> | null>(null);

  // Applies a fetched course snapshot only if no local write is pending or
  // in flight — otherwise the snapshot predates that write and would revert
  // it. Shared by the mount fetch, cross-tab FULL_SYNC_REQUESTED, tab-visible/
  // online revalidation, and background polling below.
  const applyFetchedCoursesIfSafe = useCallback(
    (dbData: Awaited<ReturnType<typeof fetchNotebooksFromDbApi>>) => {
      if (!dbData || !Array.isArray(dbData.courses)) return false;
      if (pendingSaveRef.current || inFlightSaveRef.current) return false;
      setCourses(dbData.courses);
      saveStoredCourses(dbData.courses);
      for (const course of dbData.courses) {
        for (const mod of course.modules) {
          for (const lesson of mod.lessons) {
            primeLessonBlocksVersion(lesson.id, lesson.blocksUpdatedAt);
          }
        }
      }
      return true;
    },
    []
  );

  // Load courses & restore active location on mount
  useEffect(() => {
    // 1. Immediate local cache load
    const loaded = getStoredCourses();
    setCourses(loaded);
    setCollisions(getCollisions());

    // 2. Asynchronously fetch from PostgreSQL database
    fetchNotebooksFromDbApi().then((dbData) => {
      if (applyFetchedCoursesIfSafe(dbData)) {
        saveCollisions(dbData!.collisions || []);
        setCollisions(dbData!.collisions || []);
      }
    });

    // Restore paper theme
    const savedTheme = localStorage.getItem("hoard_notebook_theme") as NotebookTheme | null;
    if (savedTheme === "cream" || savedTheme === "ink" || savedTheme === "matcha" || savedTheme === "midnight") {
      setPaperTheme(savedTheme);
    }

    // Check URL parameters first, then localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const paramCourse = urlParams.get("course") || urlParams.get("c");
    const paramMod = urlParams.get("m") || urlParams.get("module");
    const paramLes = urlParams.get("l") || urlParams.get("lesson");

    let restored = false;

    if (paramCourse) {
      const cIdx = loaded.findIndex((c) => c.id === paramCourse || c.title.toLowerCase() === paramCourse.toLowerCase());
      if (cIdx >= 0) {
        const mIdx = paramMod ? Math.max(0, Math.min(parseInt(paramMod, 10) || 0, loaded[cIdx].modules.length - 1)) : 0;
        const lIdx = paramLes ? Math.max(0, Math.min(parseInt(paramLes, 10) || 0, (loaded[cIdx].modules[mIdx]?.lessons.length || 1) - 1)) : 0;
        setCurrentCourseIdx(cIdx);
        setCurrentModuleIdx(mIdx);
        setCurrentLessonIdx(lIdx);
        setView("course");
        restored = true;
      }
    }

    if (!restored) {
      try {
        const savedLoc = localStorage.getItem("hoard_notebook_location");
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          if (parsed.view === "course" && parsed.courseId) {
            const cIdx = loaded.findIndex((c) => c.id === parsed.courseId);
            if (cIdx >= 0) {
              const mIdx = Math.max(0, Math.min(parsed.m || 0, loaded[cIdx].modules.length - 1));
              const lIdx = Math.max(0, Math.min(parsed.l || 0, (loaded[cIdx].modules[mIdx]?.lessons.length || 1) - 1));
              setCurrentCourseIdx(cIdx);
              setCurrentModuleIdx(mIdx);
              setCurrentLessonIdx(lIdx);
              setView("course");
              restored = true;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Synchronize URL and localStorage on location change
  useEffect(() => {
    if (courses.length === 0) return;
    const course = courses[currentCourseIdx] || courses[0];

    if (view === "course" && course) {
      const url = new URL(window.location.href);
      url.searchParams.set("course", course.id);
      url.searchParams.set("m", currentModuleIdx.toString());
      url.searchParams.set("l", currentLessonIdx.toString());
      window.history.replaceState({}, "", url.toString());

      localStorage.setItem(
        "hoard_notebook_location",
        JSON.stringify({
          view: "course",
          courseId: course.id,
          m: currentModuleIdx,
          l: currentLessonIdx,
        })
      );
    } else if (view === "index") {
      const url = new URL(window.location.href);
      url.searchParams.delete("course");
      url.searchParams.delete("c");
      url.searchParams.delete("m");
      url.searchParams.delete("l");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));

      localStorage.setItem(
        "hoard_notebook_location",
        JSON.stringify({ view: "index" })
      );
    }
  }, [view, currentCourseIdx, currentModuleIdx, currentLessonIdx, courses]);

  // Synchronize paper theme
  const handleToggleTheme = (theme: NotebookTheme) => {
    playSound.click();
    setPaperTheme(theme);
    localStorage.setItem("hoard_notebook_theme", theme);
  };

  const currentCourse = courses[currentCourseIdx] || courses[0];
  const currentModule = currentCourse?.modules[currentModuleIdx] || currentCourse?.modules[0];
  const currentLesson = currentModule?.lessons[currentLessonIdx] || currentModule?.lessons[0];

  const currentBlocks = currentLesson?.blocks || [];
  const wordCount = computeWordCount(currentBlocks);

  const isSameId = (a: string, b: string) => {
    if (a === b) return true;
    if (a.endsWith("_" + b) || b.endsWith("_" + a)) return true;
    return false;
  };

  // ── Real-Time Cross-Tab Live Synchronization (BroadcastChannel) ──────────
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeEvents((event) => {
      if (event.type === "NOTE_BLOCKS_UPDATED") {
        setCourses((prevCourses) => {
          const updated = prevCourses.map((c) => ({
            ...c,
            modules: c.modules.map((m) => ({
              ...m,
              lessons: m.lessons.map((l) => {
                if (isSameId(l.id, event.lessonId)) {
                  const wc = event.wordCount;
                  const nextMeta = wc > 0 ? `${wc.toLocaleString()} WORDS · EDITED JUST NOW` : "NO NOTES YET";
                  return { ...l, blocks: event.blocks, meta: nextMeta };
                }
                return l;
              }),
            })),
          }));
          saveStoredCourses(updated);
          return updated;
        });
      } else if (event.type === "LESSON_WATCHED_TOGGLED") {
        setCourses((prevCourses) => {
          const updated = prevCourses.map((c) => ({
            ...c,
            modules: c.modules.map((m) => ({
              ...m,
              lessons: m.lessons.map((l) => (isSameId(l.id, event.lessonId) ? { ...l, watched: event.watched } : l)),
            })),
          }));
          saveStoredCourses(updated);
          return updated;
        });
      } else if (event.type === "LESSON_CREATED") {
        setCourses((prevCourses) => {
          const updated = prevCourses.map((c) => ({
            ...c,
            modules: c.modules.map((m) => {
              if (isSameId(m.id, event.moduleId)) {
                if (m.lessons.some((l) => isSameId(l.id, event.lesson.id))) return m;
                return { ...m, lessons: [...m.lessons, event.lesson] };
              }
              return m;
            }),
          }));
          saveStoredCourses(updated);
          return updated;
        });
      } else if (event.type === "LESSON_DELETED") {
        setCourses((prevCourses) => {
          const updated = prevCourses.map((c) => ({
            ...c,
            modules: c.modules.map((m) => ({
              ...m,
              lessons: m.lessons.filter((l) => !isSameId(l.id, event.lessonId)),
            })),
          }));
          saveStoredCourses(updated);
          return updated;
        });
      } else if (event.type === "COURSE_UPDATED") {
        setCourses((prevCourses) => {
          const exists = prevCourses.some((c) => isSameId(c.id, event.courseId));
          const updated = exists
            ? prevCourses.map((c) => (isSameId(c.id, event.courseId) ? event.course : c))
            : [...prevCourses, event.course];
          saveStoredCourses(updated);
          return updated;
        });
      } else if (event.type === "COURSE_DELETED") {
        setCourses((prevCourses) => {
          const updated = prevCourses.filter((c) => !isSameId(c.id, event.courseId));
          saveStoredCourses(updated);
          return updated;
        });
      } else if (event.type === "LESSONS_REORDERED") {
        setCourses((prevCourses) => {
          const updated = reorderLessonsInMemory(
            prevCourses,
            event.courseId,
            event.sourceModuleId,
            event.targetModuleId,
            event.lessonId,
            event.targetIndex
          );
          return updated;
        });
      } else if (event.type === "FULL_SYNC_REQUESTED") {
        Promise.resolve(inFlightSaveRef.current).then(() => {
          if (pendingSaveRef.current || inFlightSaveRef.current) return;
          fetchNotebooksFromDbApi().then(applyFetchedCoursesIfSafe);
        });
      }
    });

    return unsubscribe;
  }, []);

  // Persisting to localStorage re-serializes every course/lesson/block (including
  // any pasted base64 images), so doing it on every keystroke is what made typing
  // laggy. React state updates instantly for a responsive UI; the localStorage
  // write and DB sync is debounced and flushed on navigation/unload so nothing is lost.
  const pendingSaveRef = useRef<{
    courses: SeedCourse[];
    lessonId: string;
    blocks: Block[];
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const flushPendingSave = useCallback(() => {
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current.timer);
      saveStoredCourses(pendingSaveRef.current.courses);
      const { lessonId, blocks } = pendingSaveRef.current;
      const savePromise = saveLessonBlocksToDbApi(lessonId, blocks);
      inFlightSaveRef.current = savePromise.finally(() => {
        if (inFlightSaveRef.current === savePromise) inFlightSaveRef.current = null;
      });
      pendingSaveRef.current = null;
    }
    return inFlightSaveRef.current;
  }, []);

  // ── Auto-Revalidate on Tab Visibility & Network Online/Offline ───────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        Promise.resolve(flushPendingSave()).then(() => {
          if (pendingSaveRef.current || inFlightSaveRef.current) return;
          fetchNotebooksFromDbApi().then(applyFetchedCoursesIfSafe);
        });
      }
    };

    const handleOnline = () => {
      setSyncStatus("saving");
      Promise.resolve(flushOfflineQueueToDbApi()).then(() => {
        fetchNotebooksFromDbApi().then(applyFetchedCoursesIfSafe);
      });
    };

    const handleOffline = () => {
      setSyncStatus("offline");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushPendingSave, applyFetchedCoursesIfSafe]);

  // ── Cross-Device Background Sync ──────────────────────────────────────────
  // BroadcastChannel/localStorage (above) only reaches other tabs of the same
  // browser, so a phone typing into the same lesson never reaches this tab
  // that way. Poll for changes from other devices while this tab is the one
  // actually on screen; applyFetchedCoursesIfSafe still guards against
  // clobbering an edit that's mid-save here.
  useEffect(() => {
    const POLL_INTERVAL_MS = 5000;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (pendingSaveRef.current || inFlightSaveRef.current) return;
      fetchNotebooksFromDbApi().then(applyFetchedCoursesIfSafe);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [applyFetchedCoursesIfSafe]);

  const handleUpdateBlocks = (newBlocks: Block[]) => {
    if (!currentCourse || !currentLesson) return;
    const updated = computeLessonBlocksUpdate(courses, currentCourse.id, currentLesson.id, newBlocks);
    setCourses(updated);

    // Instant cross-tab broadcast for Notion-style real-time typing mirror
    broadcastRealtimeEvent({
      type: "NOTE_BLOCKS_UPDATED",
      lessonId: currentLesson.id,
      blocks: newBlocks,
      wordCount: computeWordCount(newBlocks),
    });

    setSyncStatus("saving");

    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current.timer);
    pendingSaveRef.current = {
      courses: updated,
      lessonId: currentLesson.id,
      blocks: newBlocks,
      timer: setTimeout(() => {
        saveStoredCourses(updated);
        const savePromise = saveLessonBlocksToDbApi(currentLesson.id, newBlocks);
        inFlightSaveRef.current = savePromise.finally(() => {
          if (inFlightSaveRef.current === savePromise) inFlightSaveRef.current = null;
        });
        pendingSaveRef.current = null;
      }, 400),
    };
  };

  // Flush any pending debounced save before switching pages, and on unload.
  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [currentCourseIdx, currentModuleIdx, currentLessonIdx, flushPendingSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSave();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const handleUpdateCurrentLessonCover = (coverUrl: string | undefined) => {
    if (!currentCourse || !currentModule || !currentLesson) return;
    const next = [...courses];
    next[currentCourseIdx].modules[currentModuleIdx].lessons[currentLessonIdx].coverUrl = coverUrl;
    setCourses(next);
    saveStoredCourses(next);
  };

  const handleUpdateCurrentLessonIcon = (icon: string | undefined) => {
    if (!currentCourse || !currentModule || !currentLesson) return;
    const next = [...courses];
    next[currentCourseIdx].modules[currentModuleIdx].lessons[currentLessonIdx].icon = icon;
    setCourses(next);
    saveStoredCourses(next);
  };

  const handleSelectCourseFromCard = (idx: number) => {
    playSound.click();
    setCurrentCourseIdx(idx);
    setCurrentModuleIdx(0);
    setCurrentLessonIdx(0);
    setView("course");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleWatched = (modIdx: number, lesIdx: number) => {
    if (!currentCourse) return;
    const targetLesson = currentCourse.modules[modIdx]?.lessons[lesIdx];
    if (!targetLesson) return;
    const updated = toggleLessonWatched(currentCourse.id, targetLesson.id);
    setCourses([...updated]);
    updateLessonInDbApi(targetLesson.id, { toggleWatched: true });
  };

  const handleDeleteLesson = (modIdx: number, lesIdx: number) => {
    if (!currentCourse) return;
    const targetModule = currentCourse.modules[modIdx];
    const targetLesson = targetModule?.lessons[lesIdx];
    if (!targetLesson) return;

    setConfirmModalState({
      isOpen: true,
      title: "DELETE LESSON PAGE",
      description: `Are you sure you want to delete "${targetLesson.title}"? All notes on this page will be permanently removed.`,
      confirmLabel: "DELETE PAGE",
      confirmVariant: "danger",
      onConfirm: () => {
        const updated = deleteLesson(currentCourse.id, targetLesson.id);
        setCourses([...updated]);
        deleteLessonFromDbApi(targetLesson.id);

        // Handle index updates if currently viewing the deleted lesson
        if (modIdx === currentModuleIdx && lesIdx === currentLessonIdx) {
          const remainingInMod = targetModule.lessons.length - 1;
          if (remainingInMod > 0) {
            setCurrentLessonIdx(Math.max(0, lesIdx - 1));
          } else {
            // Module is now empty, switch to previous module
            const nextModIdx = Math.max(0, modIdx - 1);
            setCurrentModuleIdx(nextModIdx);
            setCurrentLessonIdx(0);
          }
        } else if (modIdx === currentModuleIdx && lesIdx < currentLessonIdx) {
          setCurrentLessonIdx(currentLessonIdx - 1);
        }
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleClearCurrentNotes = () => {
    if (!currentCourse || !currentLesson) return;

    setConfirmModalState({
      isOpen: true,
      title: "CLEAR ALL NOTES?",
      description: `Are you sure you want to clear all notes on "${currentLesson.title}"? This page will be reset to an empty state.`,
      confirmLabel: "RESET TO EMPTY",
      confirmVariant: "warning",
      onConfirm: () => {
        const updated = clearLessonNotes(currentCourse.id, currentLesson.id);
        setCourses([...updated]);
        updateLessonInDbApi(currentLesson.id, { clearNotes: true });
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
      },
    });
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
    if (isQuizzing) return;
    setIsQuizzing(true);
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
    } finally {
      setIsQuizzing(false);
    }
  };

  // AI: EXPLAIN AGAIN
  const handleExplain = async () => {
    if (isExplaining) return;
    // Note text lives in <textarea> elements, whose selection isn't exposed via
    // window.getSelection() — read it directly off the focused textarea first.
    const active = document.activeElement;
    let selectedText = "";
    if (active instanceof HTMLTextAreaElement && active.selectionStart !== active.selectionEnd) {
      selectedText = active.value.slice(active.selectionStart ?? 0, active.selectionEnd ?? 0).trim();
    } else {
      selectedText = window.getSelection()?.toString().trim() || "";
    }
    const targetText =
      selectedText ||
      currentBlocks.find((b) => b.type === "paragraph" || b.type === "callout")?.text ||
      "Agentic reflection with outside verification";

    await handleExplainWithSelection(targetText);
  };

  const handleExplainWithSelection = async (text: string) => {
    if (!text.trim()) return;
    setExplainSelection(text.trim());
    setExplainText("");
    setIsExplaining(true);

    try {
      const res = await fetch("/api/notebooks/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: text.trim(),
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

  // AI: CONVERT TRANSCRIPT TO STRUCTURED NOTES
  const handleConvertToNotes = async (transcriptText: string) => {
    setIsAnalyzingGaps(true);
    try {
      const res = await fetch("/api/notebooks/draft-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptText,
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setDiffOriginal(currentBlocks);
      setDiffProposed(data.blocks);
      setDiffSummary(data.summary || "Structured lecture transcript into clean notebook blocks.");
      setShowTranscriptModal(false);
      playSound.fileIt();
    } catch {
      alert("Failed to convert transcript into notes.");
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  // AI: WHAT DID I MISS? (Gap analysis)
  const handleAnalyzeTranscript = async (transcriptText: string) => {
    if (isAnalyzingGaps) return;
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
        updateLessonInDbApi(currentLesson.id, { gap: data.gaps });
      }
      setShowTranscriptModal(false);
      playSound.fileIt();
    } catch {
      alert("Failed to analyze gaps.");
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  const handleAddCourse = () => {
    playSound.click();
    setShowAddCourseModal(true);
  };

  const handleCreateCourse = async ({
    title,
    provider,
    accent,
    accentFg,
  }: {
    title: string;
    provider?: string;
    accent?: string;
    accentFg?: string;
  }) => {
    const newCourse = await createCourseInDbApi({
      title,
      provider: provider || "DEEPLEARNING.AI",
      accent: accent || "#7B5CF0",
      accentFg: accentFg || "#FFFFFF",
    });
    const courseToAdd =
      newCourse ||
      createNewCourse(title, provider || "DEEPLEARNING.AI", accent || "#7B5CF0", accentFg || "#FFFFFF");
    const updated = [...courses, courseToAdd];
    saveStoredCourses(updated);
    setCourses(updated);
    setCurrentCourseIdx(courses.length);
    setCurrentModuleIdx(0);
    setCurrentLessonIdx(0);
    setView("course");
    setShowAddCourseModal(false);
  };

  const handleStartEditCourse = (course: SeedCourse) => {
    playSound.click();
    setEditingCourse(course);
    setShowEditCourseModal(true);
  };

  const handleSaveEditedCourse = (updated: {
    title: string;
    provider: string;
    accent: string;
    accentFg: string;
  }) => {
    if (!editingCourse) return;
    const nextCourses = courses.map((c) => {
      if (c.id === editingCourse.id) {
        return {
          ...c,
          title: updated.title,
          provider: updated.provider,
          accent: updated.accent,
          accentFg: updated.accentFg,
          init: updated.title.trim().charAt(0).toUpperCase() || c.init,
        };
      }
      return c;
    });
    saveStoredCourses(nextCourses);
    setCourses(nextCourses);
    updateCourseInDbApi(editingCourse.id, updated);
    setShowEditCourseModal(false);
    setEditingCourse(null);
  };

  const handleStartDeleteCourse = (course: SeedCourse) => {
    playSound.pop();
    setConfirmModalState({
      isOpen: true,
      title: `DELETE "${course.title.toUpperCase()}"?`,
      description: `This will permanently remove "${course.title}" and all ${course.modules.flatMap((m) => m.lessons).length} pages inside it. This action cannot be undone.`,
      confirmLabel: "DELETE COURSE",
      confirmVariant: "danger",
      onConfirm: () => {
        const nextCourses = courses.filter((c) => c.id !== course.id);
        saveStoredCourses(nextCourses);
        setCourses(nextCourses);
        deleteCourseFromDbApi(course.id);
        if (currentCourse?.id === course.id) {
          setView("index");
          setCurrentCourseIdx(0);
          setCurrentModuleIdx(0);
          setCurrentLessonIdx(0);
        }
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Module Management Handlers
  const handleCreateModule = async (title: string) => {
    if (!currentCourse) return;
    const createdMod = await createModuleInDbApi(currentCourse.id, title);
    const newModule: SeedCourseModule = createdMod || {
      id: "mod-" + Date.now().toString(36),
      title: title.trim(),
      lessons: [],
    };

    const updated = courses.map((c) => {
      if (c.id === currentCourse.id) {
        return {
          ...c,
          modules: [...c.modules, newModule],
        };
      }
      return c;
    });

    saveStoredCourses(updated);
    setCourses(updated);
    setCurrentModuleIdx(currentCourse.modules.length);
    setCurrentLessonIdx(0);
    setShowAddModuleModal(false);
    playSound.fileIt();
  };

  const handleRenameModule = (modIdx: number, newTitle: string) => {
    if (!currentCourse) return;
    const targetMod = currentCourse.modules[modIdx];
    if (!targetMod || !newTitle.trim()) return;
    const title = newTitle.trim();

    const updated = courses.map((c) => {
      if (c.id === currentCourse.id) {
        return {
          ...c,
          modules: c.modules.map((m, mIdx) => (mIdx === modIdx ? { ...m, title } : m)),
        };
      }
      return c;
    });

    saveStoredCourses(updated);
    setCourses(updated);
    updateModuleInDbApi(targetMod.id, { title });
    playSound.click();
  };

  const handleDeleteModule = (modIdx: number) => {
    if (!currentCourse) return;
    const targetMod = currentCourse.modules[modIdx];
    if (!targetMod) return;

    playSound.pop();
    setConfirmModalState({
      isOpen: true,
      title: `DELETE "${targetMod.title.toUpperCase()}"?`,
      description: `This will permanently delete this module and all ${targetMod.lessons.length} pages inside it. This action cannot be undone.`,
      confirmLabel: "DELETE MODULE",
      confirmVariant: "danger",
      onConfirm: () => {
        const updated = courses.map((c) => {
          if (c.id === currentCourse.id) {
            return {
              ...c,
              modules: c.modules.filter((_, mIdx) => mIdx !== modIdx),
            };
          }
          return c;
        });

        saveStoredCourses(updated);
        setCourses(updated);
        deleteModuleInDbApi(targetMod.id);
        setCurrentModuleIdx(Math.max(0, modIdx - 1));
        setCurrentLessonIdx(0);
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        playSound.fileIt();
      },
    });
  };

  // Create Lesson Above / Below Handlers
  const handleCreateLessonAbove = (modIdx: number, lesIdx: number) => {
    setAddPageContext({ modIdx, targetPosition: lesIdx });
    setShowAddPageModal(true);
  };

  const handleCreateLessonBelow = (modIdx: number, lesIdx: number) => {
    setAddPageContext({ modIdx, targetPosition: lesIdx + 1 });
    setShowAddPageModal(true);
  };

  const handleCreatePage = async (newTitle: string) => {
    if (!currentCourse) return;
    const targetModIdx = addPageContext ? addPageContext.modIdx : currentModule ? currentModuleIdx : 0;
    const targetMod = currentCourse.modules[targetModIdx];
    if (!targetMod) return;

    const targetPos = addPageContext?.targetPosition ?? targetMod.lessons.length;
    const createdLesson = await createLessonInDbApi(targetMod.id, newTitle, undefined, targetPos);
    const newLesson: SeedCourseLesson = createdLesson || {
      id: "les-" + Date.now().toString(36),
      title: newTitle,
      watched: false,
      meta: "STUB · 1 LINE",
      blocks: [{ id: generateBlockId(), type: "paragraph" as const, text: "" }],
    };

    const updated = courses.map((c) => {
      if (c.id === currentCourse.id) {
        return {
          ...c,
          modules: c.modules.map((m, mIdx) => {
            if (mIdx === targetModIdx) {
              const nextLessons = [...m.lessons];
              nextLessons.splice(targetPos, 0, newLesson);
              return { ...m, lessons: nextLessons };
            }
            return m;
          }),
        };
      }
      return c;
    });

    saveStoredCourses(updated);
    setCourses(updated);
    setCurrentModuleIdx(targetModIdx);
    setCurrentLessonIdx(targetPos);
    setAddPageContext(null);
    setShowAddPageModal(false);
  };

  // Drag-and-Drop Reorder Handler
  const handleReorderLesson = (
    sourceModIdx: number,
    targetModIdx: number,
    sourceLesIdx: number,
    targetLesIdx: number
  ) => {
    if (!currentCourse) return;
    const srcMod = currentCourse.modules[sourceModIdx];
    const tgtMod = currentCourse.modules[targetModIdx];
    if (!srcMod || !tgtMod) return;
    const lesson = srcMod.lessons[sourceLesIdx];
    if (!lesson) return;

    const updated = reorderLessonsInMemory(
      courses,
      currentCourse.id,
      srcMod.id,
      tgtMod.id,
      lesson.id,
      targetLesIdx
    );
    setCourses(updated);
    playSound.click();

    reorderLessonsInDbApi(currentCourse.id, srcMod.id, tgtMod.id, lesson.id, targetLesIdx);

    // If current selected lesson was moved, track its new location
    if (sourceModIdx === currentModuleIdx && sourceLesIdx === currentLessonIdx) {
      setCurrentModuleIdx(targetModIdx);
      setCurrentLessonIdx(targetLesIdx);
    }
  };

  // 1-Click Page Duplication
  const handleDuplicateLesson = async (modIdx: number, lesIdx: number) => {
    if (!currentCourse) return;
    const targetMod = currentCourse.modules[modIdx];
    const targetLes = targetMod?.lessons[lesIdx];
    if (!targetMod || !targetLes) return;

    const duplicated = await duplicateLessonInDbApi(targetLes.id);
    const newLesson: SeedCourseLesson = duplicated || {
      id: "les-" + Date.now().toString(36),
      title: `${targetLes.title} (Copy)`,
      watched: false,
      meta: targetLes.meta,
      blocks: targetLes.blocks ? JSON.parse(JSON.stringify(targetLes.blocks)) : [],
      gap: targetLes.gap,
      lessonUrl: targetLes.lessonUrl,
    };

    const updated = courses.map((c) => {
      if (c.id === currentCourse.id) {
        return {
          ...c,
          modules: c.modules.map((m, mIdx) => {
            if (mIdx === modIdx) {
              return { ...m, lessons: [...m.lessons, newLesson] };
            }
            return m;
          }),
        };
      }
      return c;
    });

    saveStoredCourses(updated);
    setCourses(updated);
    setCurrentModuleIdx(modIdx);
    setCurrentLessonIdx(targetMod.lessons.length);
    playSound.fileIt();
  };

  // Inline Page Title Renaming
  const handleRenameLesson = (newTitle: string) => {
    if (!currentCourse || !currentLesson || !newTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }
    const title = newTitle.trim();
    const updated = courses.map((c) => {
      if (c.id === currentCourse.id) {
        return {
          ...c,
          modules: c.modules.map((m, mIdx) => {
            if (mIdx === currentModuleIdx) {
              return {
                ...m,
                lessons: m.lessons.map((l, lIdx) => (lIdx === currentLessonIdx ? { ...l, title } : l)),
              };
            }
            return m;
          }),
        };
      }
      return c;
    });
    saveStoredCourses(updated);
    setCourses(updated);
    setIsEditingTitle(false);
    updateLessonInDbApi(currentLesson.id, { title });
    playSound.click();
  };

  // Copy Full Page as Markdown
  const handleCopyAsMarkdown = () => {
    if (!currentLesson) return;
    const md = convertBlocksToMarkdown(currentLesson.title, currentBlocks);
    navigator.clipboard.writeText(md);
    setCopiedMarkdownToast(true);
    playSound.click();
    setTimeout(() => setCopiedMarkdownToast(false), 2200);
  };

  // Attach / Update Lesson URL
  const handleSaveLessonUrl = (url: string) => {
    if (!currentCourse || !currentLesson) return;
    const trimmed = url.trim();
    const updated = courses.map((c) => {
      if (c.id === currentCourse.id) {
        return {
          ...c,
          modules: c.modules.map((m, mIdx) => {
            if (mIdx === currentModuleIdx) {
              return {
                ...m,
                lessons: m.lessons.map((l, lIdx) => (lIdx === currentLessonIdx ? { ...l, lessonUrl: trimmed } : l)),
              };
            }
            return m;
          }),
        };
      }
      return c;
    });
    saveStoredCourses(updated);
    setCourses(updated);
    setShowUrlModal(false);
    updateLessonInDbApi(currentLesson.id, { lessonUrl: trimmed });
    playSound.click();
  };

  // Deep Full-Text Search across all courses, modules, lessons, and block text
  const globalSearchResults = React.useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    const q = globalSearchQuery.toLowerCase();
    const results: {
      courseIdx: number;
      courseTitle: string;
      courseAccent: string;
      courseAccentFg: string;
      moduleIdx: number;
      moduleTitle: string;
      lessonIdx: number;
      lessonTitle: string;
      matchSnippet: string;
      matchType: string;
      wordCount: number;
    }[] = [];

    courses.forEach((c, cIdx) => {
      c.modules.forEach((m, mIdx) => {
        m.lessons.forEach((l, lIdx) => {
          const wc = computeWordCount(l.blocks || []);

          // Check lesson title
          if (l.title.toLowerCase().includes(q)) {
            results.push({
              courseIdx: cIdx,
              courseTitle: c.title,
              courseAccent: c.accent,
              courseAccentFg: c.accentFg,
              moduleIdx: mIdx,
              moduleTitle: m.title.split(" · ")[0] || m.title,
              lessonIdx: lIdx,
              lessonTitle: l.title,
              matchSnippet: `Page title match: "${l.title}"`,
              matchType: "PAGE TITLE",
              wordCount: wc,
            });
            return;
          }

          // Check blocks content
          if (l.blocks) {
            for (const b of l.blocks) {
              let text = "";
              if ("text" in b && typeof (b as any).text === "string") text = (b as any).text;
              else if (b.type === "code" && b.code) text = b.code;
              else if (b.type === "toggle") text = `${b.summary} ${b.body}`;

              if (text && text.toLowerCase().includes(q)) {
                const idx = text.toLowerCase().indexOf(q);
                const start = Math.max(0, idx - 35);
                const end = Math.min(text.length, idx + q.length + 55);
                const snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");

                results.push({
                  courseIdx: cIdx,
                  courseTitle: c.title,
                  courseAccent: c.accent,
                  courseAccentFg: c.accentFg,
                  moduleIdx: mIdx,
                  moduleTitle: m.title.split(" · ")[0] || m.title,
                  lessonIdx: lIdx,
                  lessonTitle: l.title,
                  matchSnippet: snippet,
                  matchType: b.type.toUpperCase(),
                  wordCount: wc,
                });
                break;
              }
            }
          }
        });
      });
    });

    return results;
  }, [courses, globalSearchQuery]);

  const tokens = getThemeTokens(paperTheme);
  const isInk = tokens.isDark;

  return (
    <div
      className="page-scroll"
      style={{
        background: tokens.canvasBg,
        color: tokens.textPrimary,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflowY: view === "index" ? "auto" : "hidden",
        fontFamily: "var(--body, 'Space Grotesk', sans-serif)",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      {/* Print-Only Custom Styles */}
      <style>{`
        @media print {
          aside, nav, header, button, .no-print, [data-no-print] {
            display: none !important;
          }
          body, html, main {
            background: #FFFFFF !important;
            color: #000000 !important;
            height: auto !important;
            overflow: visible !important;
          }
          main {
            padding: 0 20px !important;
          }
        }
      `}</style>

      {/* Top Paper Mode & Global Actions Bar (Hidden in Focus Mode) */}
      {!isFocusMode && (
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontFamily: "var(--mono, monospace)",
            fontSize: "10.5px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            padding: "12px clamp(16px, 3vw, 28px)",
            borderBottom: `3px solid ${tokens.borderPrimary}`,
            background: tokens.canvasBg,
            flexShrink: 0,
            zIndex: 40,
          }}
        >
          {view === "course" && isMobile && (
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open lesson outline"
              style={{
                background: "transparent",
                border: `2px solid ${tokens.borderPrimary}`,
                color: "inherit",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "13px",
                lineHeight: 1,
              }}
            >
              ☰
            </button>
          )}
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

          {/* Quick Jump / Switcher Button (Cmd + K) */}
          <button
            type="button"
            onClick={() => setShowQuickSwitcher(true)}
            title="Quick Jump across all notes (Cmd+K)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              border: `2px solid ${tokens.borderPrimary}`,
              background: tokens.cardBg,
              color: tokens.textPrimary,
              padding: "4px 9px",
              cursor: "pointer",
              boxShadow: tokens.isDark ? "2px 2px 0 rgba(0,0,0,0.6)" : "2px 2px 0 #0A0A0A",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.isDark ? "rgba(255,255,255,0.15)" : "#FCE94F")}
            onMouseLeave={(e) => (e.currentTarget.style.background = tokens.cardBg)}
          >
            <Search size={11} />
            <span>QUICK JUMP</span>
            <span style={{ opacity: 0.5, fontSize: "8.5px" }}>⌘K</span>
          </button>

          <SyncStatusPill
            theme={paperTheme}
            onRetry={() => {
              flushOfflineQueueToDbApi();
              fetchNotebooksFromDbApi().then((dbData) => {
                if (dbData?.courses && dbData.courses.length > 0) {
                  setCourses(dbData.courses);
                  saveStoredCourses(dbData.courses);
                }
              });
            }}
          />

          {/* 4-Theme Segmented Switcher */}
          <div
            style={{
              display: "flex",
              border: `2px solid ${tokens.borderPrimary}`,
              background: tokens.isDark ? "#12151E" : "#E5E1D5",
              boxShadow: tokens.isDark ? "2px 2px 0 rgba(0,0,0,0.6)" : "2px 2px 0 #0A0A0A",
            }}
          >
            {[
              { id: "cream" as NotebookTheme, label: "CREAM", emoji: "📜" },
              { id: "matcha" as NotebookTheme, label: "MATCHA", emoji: "🍵" },
              { id: "ink" as NotebookTheme, label: "INK", emoji: "🖋️" },
              { id: "midnight" as NotebookTheme, label: "MIDNIGHT", emoji: "🌌" },
            ].map((th, thIdx) => {
              const isActive = paperTheme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => handleToggleTheme(th.id)}
                  title={`Switch to ${th.label} theme`}
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "8.5px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    border: "none",
                    borderRight: thIdx < 3 ? `1.5px solid ${tokens.borderPrimary}` : "none",
                    background: isActive
                      ? (tokens.isDark
                          ? (th.id === "midnight" ? "#8B5CF6" : "#242A38")
                          : (th.id === "matcha" ? "#2E6B47" : "#0A0A0A"))
                      : "transparent",
                    color: isActive
                      ? (th.id === "matcha" ? "#F5FDF7" : (th.id === "midnight" ? "#FFFFFF" : (tokens.isDark ? "#FCE94F" : "#F3F0E8")))
                      : (tokens.isDark ? "rgba(240,237,228,0.6)" : "rgba(10,10,10,0.65)"),
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = tokens.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: "10px" }}>{th.emoji}</span>
                  <span>{th.label}</span>
                </button>
              );
            })}
          </div>

          {/* Typography Switcher */}
          <div
            style={{
              display: "flex",
              border: `2px solid ${tokens.borderPrimary}`,
              background: tokens.isDark ? "#12151E" : "#E5E1D5",
              boxShadow: tokens.isDark ? "2px 2px 0 rgba(0,0,0,0.6)" : "2px 2px 0 #0A0A0A",
            }}
          >
            {(["sans", "serif", "mono"] as TypographyStyle[]).map((fId, fIdx) => {
              const fontObj = TYPOGRAPHY_FONTS[fId];
              const isActive = typography === fId;
              return (
                <button
                  key={fId}
                  type="button"
                  onClick={() => handleToggleTypography(fId)}
                  title={`Switch font to ${fontObj.label}`}
                  style={{
                    fontFamily: fontObj.fontStack,
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    border: "none",
                    borderRight: fIdx < 2 ? `1.5px solid ${tokens.borderPrimary}` : "none",
                    background: isActive ? (tokens.isDark ? "#242A38" : "#0A0A0A") : "transparent",
                    color: isActive ? (tokens.isDark ? "#FCE94F" : "#F3F0E8") : tokens.textSecondary,
                    padding: "4px 8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = tokens.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: "10px", opacity: 0.7 }}>{fontObj.glyph}</span>
                  <span>{fontObj.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
              marginBottom: "26px",
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
                {courses.flatMap((c) => c.modules.flatMap((m) => m.lessons)).length} LESSONS
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
                border: `3px solid ${tokens.borderPrimary}`,
                background: tokens.cardBg,
                color: tokens.textPrimary,
                padding: "11px 17px",
                cursor: "pointer",
                boxShadow: tokens.boxShadow,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = tokens.cardBg)}
            >
              ＋ ADD A COURSE
            </button>
          </div>

          {/* Deep Global Full-Text Search Bar */}
          <div style={{ marginBottom: "28px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                border: `3px solid ${tokens.borderPrimary}`,
                background: tokens.cardBg,
                boxShadow: tokens.boxShadow,
                padding: "12px 18px",
              }}
            >
              <Search size={18} style={{ opacity: 0.5, flexShrink: 0, color: tokens.textPrimary }} />
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Deep search across all notes, blocks, code snippets, and callouts…"
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  fontFamily: "var(--body, 'Space Grotesk', sans-serif)",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: tokens.textPrimary,
                  outline: "none",
                }}
              />
              {globalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGlobalSearchQuery("")}
                  style={{
                    border: "none",
                    background: tokens.borderPrimary,
                    color: tokens.canvasBg,
                    cursor: "pointer",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9.5px",
                    fontWeight: 700,
                    padding: "4px 8px",
                  }}
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {/* Deep Search Results View (If Search Active) */}
          {globalSearchQuery.trim() ? (
            <div style={{ marginBottom: "40px" }}>
              <div
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  opacity: 0.6,
                  marginBottom: "14px",
                }}
              >
                MATCHING SEARCH RESULTS ({globalSearchResults.length})
              </div>

              {globalSearchResults.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    border: "2px dashed rgba(10,10,10,0.25)",
                    textAlign: "center",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    opacity: 0.5,
                  }}
                >
                  NO NOTES FOUND MATCHING &quot;{globalSearchQuery}&quot;
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
                  {globalSearchResults.map((res, rIdx) => (
                    <div
                      key={rIdx}
                      onClick={() => {
                        playSound.click();
                        setCurrentCourseIdx(res.courseIdx);
                        setCurrentModuleIdx(res.moduleIdx);
                        setCurrentLessonIdx(res.lessonIdx);
                        setView("course");
                      }}
                      style={{
                        border: "3px solid #0A0A0A",
                        background: "#FFFFFF",
                        boxShadow: "4px 4px 0 #0A0A0A",
                        padding: "16px",
                        cursor: "pointer",
                        color: "#0A0A0A",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "transform 0.1s ease, box-shadow 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translate(-2px, -2px)";
                        e.currentTarget.style.boxShadow = "6px 6px 0 #0A0A0A";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "4px 4px 0 #0A0A0A";
                      }}
                    >
                      <div>
                        {/* Course & Match Type Badges */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span
                            style={{
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "8.5px",
                              fontWeight: 700,
                              background: res.courseAccent,
                              color: res.courseAccentFg,
                              padding: "2px 6px",
                              border: "1px solid #0A0A0A",
                            }}
                          >
                            {res.courseTitle.toUpperCase()}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "8.5px",
                              fontWeight: 700,
                              background: "#EBE7DC",
                              padding: "2px 5px",
                            }}
                          >
                            {res.matchType}
                          </span>
                        </div>

                        {/* Title & Module */}
                        <h4 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700 }}>
                          {res.lessonTitle}
                        </h4>
                        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", opacity: 0.5, marginBottom: "10px" }}>
                          {res.moduleTitle}
                        </div>

                        {/* Snippet */}
                        <div
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.4,
                            background: "#F7F5EE",
                            border: "1px solid rgba(10,10,10,0.15)",
                            padding: "8px 10px",
                            fontFamily: "var(--body, sans-serif)",
                            fontStyle: "italic",
                          }}
                        >
                          &quot;{res.matchSnippet}&quot;
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "8.5px",
                          fontWeight: 700,
                          opacity: 0.6,
                        }}
                      >
                        <span>{res.wordCount} WORDS</span>
                        <span style={{ color: "#0A0A0A", fontWeight: 800 }}>OPEN NOTE →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Courses Grid */
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
                  theme={paperTheme}
                  onClick={() => handleSelectCourseFromCard(idx)}
                  onEdit={() => handleStartEditCourse(course)}
                  onDelete={() => handleStartDeleteCourse(course)}
                />
              ))}

              {/* Add Course Dashed Card */}
              <div
                onClick={handleAddCourse}
                style={{
                  border: `3px dashed ${tokens.borderSubtle}`,
                  background: "transparent",
                  minHeight: "250px",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    color: tokens.textSecondary,
                  }}
                >
                  ＋ ADD A COURSE
                </span>
              </div>
            </div>
          )}

          {collisions.length > 0 && <CollisionsPanel collisions={collisions} />}
        </div>
      )}

      {/* ══════════ 2. COURSE WORKSPACE VIEW ══════════ */}
      {view === "course" && currentCourse && currentLesson && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isFocusMode ? "1fr" : isMobile ? "1fr" : "300px minmax(0, 1fr)",
            flex: 1,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Floating Exit Focus Mode Button */}
          {isFocusMode && (
            <button
              type="button"
              onClick={() => setIsFocusMode(false)}
              title="Exit Focus Mode (ESC)"
              className="no-print"
              style={{
                position: "fixed",
                top: "18px",
                right: "24px",
                zIndex: 99999,
                background: "#0A0A0A",
                color: "#F3F0E8",
                border: "2px solid #0A0A0A",
                boxShadow: "3px 3px 0 rgba(0,0,0,0.2)",
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                padding: "7px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                animation: "fadeIn 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FCE94F";
                e.currentTarget.style.color = "#0A0A0A";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0A0A0A";
                e.currentTarget.style.color = "#F3F0E8";
              }}
            >
              <Minimize2 size={12} />
              <span>EXIT FOCUS</span>
              <span style={{ opacity: 0.5, fontSize: "8.5px" }}>ESC</span>
            </button>
          )}

          {/* On mobile the sidebar becomes an off-canvas drawer instead of a
              permanent 300px column — there's no room for both next to any
              usable amount of note content below ~860px. */}
          {!isFocusMode && isMobile && mobileSidebarOpen && (
            <div
              onClick={() => setMobileSidebarOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(10,10,10,0.5)",
                zIndex: 70,
              }}
            />
          )}

          {/* Outline Sidebar — a normal grid column on desktop, a sliding
              off-canvas drawer on mobile (closes itself after a selection,
              same as any mobile nav drawer). */}
          {!isFocusMode && (
            <div
              className="no-print"
              style={
                isMobile
                  ? {
                      position: "fixed",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: "min(300px, 85vw)",
                      zIndex: 71,
                      transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)",
                      transition: "transform 0.22s ease",
                      boxShadow: mobileSidebarOpen ? "8px 0 24px rgba(0,0,0,0.35)" : "none",
                    }
                  : {
                      height: "100%",
                      minHeight: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }
              }
            >
              <OutlineSidebar
                courses={courses}
                currentCourseIndex={currentCourseIdx}
                currentModuleIndex={currentModuleIdx}
                currentLessonIndex={currentLessonIdx}
                theme={paperTheme}
                onSelectCourse={(idx) => {
                  setCurrentCourseIdx(idx);
                  setCurrentModuleIdx(0);
                  setCurrentLessonIdx(0);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                onSelectLesson={(modIdx, lesIdx) => {
                  setCurrentModuleIdx(modIdx);
                  setCurrentLessonIdx(lesIdx);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                onReorderLesson={handleReorderLesson}
                onDuplicateLesson={handleDuplicateLesson}
                onCreateLessonAbove={handleCreateLessonAbove}
                onCreateLessonBelow={handleCreateLessonBelow}
                onDeleteLesson={handleDeleteLesson}
                onToggleWatched={handleToggleWatched}
                onCreateModule={() => {
                  playSound.click();
                  setShowAddModuleModal(true);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                onRenameModule={handleRenameModule}
                onDeleteModule={handleDeleteModule}
                onNewPageInModule={(modIdx) => {
                  playSound.click();
                  setAddPageContext({ modIdx });
                  setShowAddPageModal(true);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                onEditCourse={() => handleStartEditCourse(currentCourse)}
                onDeleteCourse={() => handleStartDeleteCourse(currentCourse)}
                onBackToIndex={() => {
                  setView("index");
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                onNewPage={() => {
                  playSound.click();
                  setAddPageContext({ modIdx: currentModuleIdx });
                  setShowAddPageModal(true);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
              />
            </div>
          )}

          {/* Main Notebook Page Area */}
          <main
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (items) {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.startsWith("image/")) {
                    const file = items[i].getAsFile();
                    if (file) {
                      e.preventDefault();
                      let targetIdx = -1;
                      if (e.target instanceof HTMLElement) {
                        const targetEl = e.target.closest<HTMLElement>("[data-block-id]");
                        if (targetEl) {
                          const targetId = targetEl.getAttribute("data-block-id");
                          targetIdx = targetId ? currentBlocks.findIndex((b) => b.id === targetId) : -1;
                        }
                      }
                      if (targetIdx === -1 && typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
                        const targetEl = document.activeElement.closest<HTMLElement>("[data-block-id]");
                        if (targetEl) {
                          const targetId = targetEl.getAttribute("data-block-id");
                          targetIdx = targetId ? currentBlocks.findIndex((b) => b.id === targetId) : -1;
                        }
                      }

                      const reader = new FileReader();
                      reader.onload = (uploadEvent) => {
                        const dataUrl = uploadEvent.target?.result as string;
                        if (dataUrl) {
                          const imageBlock: Block = {
                            id: generateBlockId(),
                            type: "image",
                            url: dataUrl,
                            caption: `PASTED IMAGE · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                          };
                          if (targetIdx >= 0 && targetIdx < currentBlocks.length) {
                            const targetBlock = currentBlocks[targetIdx];
                            const isEmptyParagraph =
                              targetBlock.type === "paragraph" &&
                              (!("text" in targetBlock) || !targetBlock.text || !targetBlock.text.trim());
                            const next = [...currentBlocks];
                            if (isEmptyParagraph) {
                              next[targetIdx] = imageBlock;
                            } else {
                              next.splice(targetIdx + 1, 0, imageBlock);
                            }
                            handleUpdateBlocks(next);
                          } else {
                            handleUpdateBlocks([...currentBlocks, imageBlock]);
                          }
                          playSound.fileIt();
                        }
                      };
                      reader.readAsDataURL(file);
                      return;
                    }
                  }
                }
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const files = e.dataTransfer?.files;
              if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith("image/")) {
                  e.preventDefault();
                  let targetIdx = -1;
                  if (e.target instanceof HTMLElement) {
                    const targetEl = e.target.closest<HTMLElement>("[data-block-id]");
                    if (targetEl) {
                      const targetId = targetEl.getAttribute("data-block-id");
                      targetIdx = targetId ? currentBlocks.findIndex((b) => b.id === targetId) : -1;
                    }
                  }
                  if (targetIdx === -1 && typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
                    const targetEl = document.activeElement.closest<HTMLElement>("[data-block-id]");
                    if (targetEl) {
                      const targetId = targetEl.getAttribute("data-block-id");
                      targetIdx = targetId ? currentBlocks.findIndex((b) => b.id === targetId) : -1;
                    }
                  }

                  const reader = new FileReader();
                  reader.onload = (uploadEvent) => {
                    const dataUrl = uploadEvent.target?.result as string;
                    if (dataUrl) {
                      const imageBlock: Block = {
                        id: generateBlockId(),
                        type: "image",
                        url: dataUrl,
                        caption: file.name || "DROPPED IMAGE",
                      };
                      if (targetIdx >= 0 && targetIdx < currentBlocks.length) {
                        const targetBlock = currentBlocks[targetIdx];
                        const isEmptyParagraph =
                          targetBlock.type === "paragraph" &&
                          (!("text" in targetBlock) || !targetBlock.text || !targetBlock.text.trim());
                        const next = [...currentBlocks];
                        if (isEmptyParagraph) {
                          next[targetIdx] = imageBlock;
                        } else {
                          next.splice(targetIdx + 1, 0, imageBlock);
                        }
                        handleUpdateBlocks(next);
                      } else {
                        handleUpdateBlocks([...currentBlocks, imageBlock]);
                      }
                      playSound.fileIt();
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }
            }}
            style={{
              padding: "32px clamp(16px, 4vw, 58px) 120px",
              overflowY: "auto",
              height: "100%",
              WebkitOverflowScrolling: "touch",
              position: "relative",
            }}
          >
            {/* Copied to Clipboard Notification Toast */}
            {copiedMarkdownToast && (
              <div
                style={{
                  position: "fixed",
                  bottom: "32px",
                  right: "32px",
                  zIndex: 9999,
                  background: "#B8F04A",
                  color: "#0A0A0A",
                  border: "3px solid #0A0A0A",
                  boxShadow: "5px 5px 0 #0A0A0A",
                  padding: "10px 18px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Check size={14} />
                COPIED PAGE AS MARKDOWN
              </div>
            )}

            <div
              style={{
                maxWidth: "900px",
                margin: "0 auto",
                fontFamily: TYPOGRAPHY_FONTS[typography].fontStack,
              }}
            >
              {/* Page Hero Cover Artwork & Custom Emoji Badge */}
              <PageCoverBanner
                coverUrl={currentLesson.coverUrl}
                icon={currentLesson.icon}
                theme={paperTheme}
                onChangeCover={handleUpdateCurrentLessonCover}
                onChangeIcon={handleUpdateCurrentLessonIcon}
              />

              {/* Breadcrumb & Navigation */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "9.5px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    opacity: 0.45,
                  }}
                >
                  {currentCourse.title.toUpperCase()} · {currentModule.title.split(" · ")[0]} · PAGE{" "}
                  {currentLessonIdx + 1}
                </div>

                {/* Source Lecture Link Badge */}
                {currentLesson.lessonUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <a
                      href={currentLesson.lessonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open source video / lecture"
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: "inherit",
                        textDecoration: "none",
                        border: "1.5px solid rgba(10,10,10,0.3)",
                        padding: "2px 7px",
                        background: "rgba(184, 240, 74, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <ExternalLink size={10} />
                      SOURCE LECTURE
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setUrlDraft(currentLesson.lessonUrl || "");
                        setShowUrlModal(true);
                      }}
                      title="Edit source URL"
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        opacity: 0.4,
                        padding: "2px",
                      }}
                    >
                      <Pencil size={10} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setUrlDraft("");
                      setShowUrlModal(true);
                    }}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "8.5px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      border: "1px dashed rgba(10,10,10,0.3)",
                      background: "transparent",
                      color: "inherit",
                      opacity: 0.45,
                      padding: "2px 6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
                  >
                    <LinkIcon size={9} />
                    ＋ LINK SOURCE URL
                  </button>
                )}
              </div>

              {/* Editable Page Title Header */}
              {isEditingTitle ? (
                <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameLesson(titleDraft);
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    onBlur={() => handleRenameLesson(titleDraft)}
                    style={{
                      flex: 1,
                      fontFamily: "var(--display, sans-serif)",
                      fontWeight: 800,
                      fontSize: "clamp(26px, 4.5vw, 44px)",
                      lineHeight: 1,
                      letterSpacing: "-0.05em",
                      border: "3px solid #0A0A0A",
                      background: "#FFFFFF",
                      color: "#0A0A0A",
                      padding: "6px 12px",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRenameLesson(titleDraft)}
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10px",
                      fontWeight: 700,
                      border: "2px solid #0A0A0A",
                      background: "#B8F04A",
                      color: "#0A0A0A",
                      padding: "10px 14px",
                      cursor: "pointer",
                    }}
                  >
                    SAVE
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "6px",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setTitleDraft(currentLesson.title);
                    setIsEditingTitle(true);
                  }}
                  title="Click to rename page"
                >
                  <h1
                    style={{
                      margin: 0,
                      fontFamily: "var(--display, sans-serif)",
                      fontWeight: 800,
                      fontSize: "clamp(28px, 4.8vw, 48px)",
                      lineHeight: 0.97,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {currentLesson.title}
                  </h1>
                  <span
                    style={{
                      opacity: 0.25,
                      display: "inline-flex",
                      alignItems: "center",
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    <Pencil size={16} />
                  </span>
                </div>
              )}

              {/* Meta Row & Productivity Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9.5px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  marginBottom: "16px",
                  paddingBottom: "10px",
                  borderBottom: isInk ? "1.5px solid rgba(255,255,255,0.12)" : "1.5px solid rgba(10,10,10,0.1)",
                }}
              >
                {/* Stats indicators */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", opacity: 0.65 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={11} />
                    ~{Math.max(1, Math.ceil(wordCount / 200))} MIN READ
                  </span>
                  <span>·</span>
                  <span>{wordCount.toLocaleString()} WORDS</span>
                  <span>·</span>
                  <span>{currentBlocks.length} BLOCKS</span>
                </div>

                {/* Clean Unified Action Controls */}
                <div className="no-print" style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                  {/* AI Actions Dropdown Pill */}
                  <div ref={aiMenuRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => {
                        playSound.click();
                        setShowAiMenu(!showAiMenu);
                        setShowPageMoreMenu(false);
                      }}
                      style={{
                        border: isInk ? "1.5px solid rgba(255,255,255,0.25)" : "1.5px solid #0A0A0A",
                        background: isInk ? "#242A38" : "#7B5CF0",
                        color: isInk ? "#FCE94F" : "#FFFFFF",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9px",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        padding: "5px 10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: isInk ? "2px 2px 0 rgba(0,0,0,0.5)" : "2px 2px 0 #0A0A0A",
                        transition: "all 0.1s ease",
                      }}
                    >
                      <Sparkles size={11} />
                      <span>✦ AI</span>
                      <ChevronDown size={10} style={{ transform: showAiMenu ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                    </button>

                    {showAiMenu && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          right: 0,
                          zIndex: 100,
                          background: tokens.popoverBg,
                          border: `2px solid ${tokens.borderPrimary}`,
                          boxShadow: tokens.popoverShadow,
                          minWidth: "200px",
                          padding: "6px 0",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowAiMenu(false);
                            handleTidyNotes();
                          }}
                          disabled={isTidying}
                          style={{
                            padding: "8px 14px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "inherit",
                            cursor: isTidying ? "wait" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Wand2 size={12} color="#7B5CF0" />
                          <span>{isTidying ? "TIDYING NOTES…" : "TIDY MY NOTES"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAiMenu(false);
                            handleQuizMe();
                          }}
                          disabled={isQuizzing}
                          style={{
                            padding: "8px 14px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "inherit",
                            cursor: isQuizzing ? "wait" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <HelpCircle size={12} color="#FF9900" />
                          <span>{isQuizzing ? "GENERATING QUIZ…" : "QUIZ ME"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAiMenu(false);
                            handleExplain();
                          }}
                          disabled={isExplaining}
                          style={{
                            padding: "8px 14px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "inherit",
                            cursor: isExplaining ? "wait" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <FileText size={12} color="#00D4FF" />
                          <span>{isExplaining ? "EXPLAINING…" : "EXPLAIN CONCEPTS"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowAiMenu(false);
                            if (currentLesson.transcript) {
                              handleAnalyzeTranscript(currentLesson.transcript.text);
                            } else {
                              setShowTranscriptModal(true);
                            }
                          }}
                          disabled={isAnalyzingGaps}
                          style={{
                            padding: "8px 14px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "inherit",
                            cursor: isAnalyzingGaps ? "wait" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Search size={12} color="#B8F04A" />
                          <span>{isAnalyzingGaps ? "ANALYZING GAPS…" : "WHAT DID I MISS?"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Zen Focus Mode Button */}
                  <button
                    type="button"
                    onClick={() => {
                      playSound.click();
                      setIsFocusMode(!isFocusMode);
                    }}
                    title="Toggle Zen Focus Mode (ESC to exit)"
                    style={{
                      border: isInk ? "1.5px solid rgba(255,255,255,0.25)" : "1.5px solid rgba(10,10,10,0.3)",
                      background: isFocusMode ? (isInk ? "#FCE94F" : "#0A0A0A") : "transparent",
                      color: isFocusMode ? "#0A0A0A" : "inherit",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9px",
                      fontWeight: 700,
                      padding: "5px 9px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isFocusMode) e.currentTarget.style.background = isInk ? "rgba(255,255,255,0.12)" : "#FCE94F";
                    }}
                    onMouseLeave={(e) => {
                      if (!isFocusMode) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Maximize2 size={11} />
                    FOCUS
                  </button>

                  {/* Flashcards Button */}
                  <button
                    type="button"
                    onClick={() => {
                      playSound.click();
                      setShowFlashcardModal(true);
                    }}
                    title="Study note with active recall flashcards"
                    style={{
                      border: isInk ? "1.5px solid rgba(255,255,255,0.25)" : "1.5px solid rgba(10,10,10,0.3)",
                      background: "transparent",
                      color: "inherit",
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9px",
                      fontWeight: 700,
                      padding: "5px 9px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isInk ? "rgba(255,255,255,0.12)" : "#FCE94F")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Layers size={11} />
                    CARDS
                  </button>

                  {/* More Actions Popover (⋯) */}
                  <div ref={pageMoreMenuRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => {
                        playSound.click();
                        setShowPageMoreMenu(!showPageMoreMenu);
                        setShowAiMenu(false);
                      }}
                      title="More page actions"
                      style={{
                        border: isInk ? "1.5px solid rgba(255,255,255,0.25)" : "1.5px solid rgba(10,10,10,0.3)",
                        background: showPageMoreMenu ? (isInk ? "rgba(255,255,255,0.15)" : "#FCE94F") : "transparent",
                        color: "inherit",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "5px 8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isInk ? "rgba(255,255,255,0.12)" : "#FCE94F")}
                      onMouseLeave={(e) => {
                        if (!showPageMoreMenu) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <MoreHorizontal size={13} />
                    </button>

                    {showPageMoreMenu && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          right: 0,
                          zIndex: 100,
                          background: tokens.popoverBg,
                          border: `2px solid ${tokens.borderPrimary}`,
                          boxShadow: tokens.popoverShadow,
                          minWidth: "190px",
                          padding: "6px 0",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowPageMoreMenu(false);
                            playSound.click();
                            window.print();
                          }}
                          style={{
                            padding: "7px 12px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "inherit",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Printer size={12} />
                          <span>EXPORT / PRINT PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPageMoreMenu(false);
                            handleCopyAsMarkdown();
                          }}
                          style={{
                            padding: "7px 12px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "inherit",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Copy size={12} />
                          <span>COPY AS MARKDOWN</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPageMoreMenu(false);
                            handleDuplicateLesson(currentModuleIdx, currentLessonIdx);
                          }}
                          style={{
                            padding: "7px 12px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "inherit",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <FileText size={12} />
                          <span>DUPLICATE PAGE</span>
                        </button>

                        {currentBlocks.some((b) => b.type === "heading") && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPageMoreMenu(false);
                              setShowToc(!showToc);
                            }}
                            style={{
                              padding: "7px 12px",
                              background: "transparent",
                              border: "none",
                              textAlign: "left",
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "9.5px",
                              fontWeight: 700,
                              color: "inherit",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <List size={12} />
                            <span>{showToc ? "HIDE OUTLINE" : "SHOW OUTLINE (TOC)"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setShowPageMoreMenu(false);
                            handleCreateLessonAbove(currentModuleIdx, currentLessonIdx);
                          }}
                          style={{
                            padding: "7px 12px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "inherit",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <ArrowUp size={12} />
                          <span>INSERT PAGE ABOVE</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPageMoreMenu(false);
                            handleCreateLessonBelow(currentModuleIdx, currentLessonIdx);
                          }}
                          style={{
                            padding: "7px 12px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "inherit",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <ArrowDown size={12} />
                          <span>INSERT PAGE BELOW</span>
                        </button>

                        <div style={{ height: "1px", background: tokens.borderSubtle, margin: "4px 0" }} />

                        {currentBlocks.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPageMoreMenu(false);
                              handleClearCurrentNotes();
                            }}
                            style={{
                              padding: "7px 12px",
                              background: "transparent",
                              border: "none",
                              textAlign: "left",
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "9.5px",
                              fontWeight: 700,
                              color: "inherit",
                              opacity: 0.7,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span>🧹 CLEAR PAGE CONTENT</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setShowPageMoreMenu(false);
                            handleDeleteLesson(currentModuleIdx, currentLessonIdx);
                          }}
                          style={{
                            padding: "7px 12px",
                            background: "transparent",
                            border: "none",
                            textAlign: "left",
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9.5px",
                            fontWeight: 700,
                            color: "#DC2626",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#DC2626";
                            e.currentTarget.style.color = "#FFFFFF";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#DC2626";
                          }}
                        >
                          <Trash2 size={12} />
                          <span>DELETE PAGE</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Table of Contents (TOC) Outline Box */}
              {showToc && (
                <div
                  style={{
                    background: isInk ? "#181B24" : "rgba(0,0,0,0.03)",
                    border: isInk ? "2px solid rgba(255,255,255,0.2)" : "2px solid #0A0A0A",
                    padding: "12px 16px",
                    marginBottom: "18px",
                    boxShadow: isInk ? "3px 3px 0 rgba(0,0,0,0.6)" : "3px 3px 0 #0A0A0A",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9px",
                      fontWeight: 800,
                      letterSpacing: "0.15em",
                      opacity: 0.5,
                      marginBottom: "8px",
                    }}
                  >
                    ON THIS PAGE
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {currentBlocks
                      .filter((b): b is Extract<Block, { type: "heading" }> => b.type === "heading")
                      .map((h, hIdx) => (
                        <div
                          key={h.id || hIdx}
                          onClick={() => {
                            const el = document.getElementById(h.id);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          style={{
                            fontFamily: "var(--body, sans-serif)",
                            fontSize: h.level === 3 ? "12px" : "13.5px",
                            fontWeight: h.level === 3 ? 500 : 700,
                            paddingLeft: h.level === 3 ? "14px" : "0",
                            cursor: "pointer",
                            opacity: 0.85,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = currentCourse.accent)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "inherit")}
                        >
                          <span style={{ opacity: 0.4, fontFamily: "var(--mono, monospace)", fontSize: "9px" }}>
                            {h.level === 3 ? "››" : "›"}
                          </span>
                          <span>{h.text || "(Untitled Heading)"}</span>
                          {h.ts && (
                            <span
                              style={{
                                fontFamily: "var(--mono, monospace)",
                                fontSize: "8.5px",
                                opacity: 0.5,
                                background: isInk ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                                padding: "1px 4px",
                              }}
                            >
                              {h.ts}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Content: Empty Page vs Block Editor */}
              {currentBlocks.length === 0 ? (
                <EmptyPage
                  onStartWriting={() => {
                    handleUpdateBlocks([
                      { id: generateBlockId(), type: "paragraph", text: "" },
                    ]);
                  }}
                  onPasteTranscript={() => setShowTranscriptModal(true)}
                  onDraftFromSlides={() => setShowTranscriptModal(true)}
                />
              ) : (
                <BlockEditor
                  key={currentLesson.id}
                  blocks={currentBlocks}
                  onChange={handleUpdateBlocks}
                  onExplain={handleExplainWithSelection}
                  accentColor={currentCourse.accent}
                  theme={paperTheme}
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
                      topic,
                      courses
                    );
                    setCourses(updated);
                    const targetLes = updated
                      .find((c) => c.id === currentCourse.id)
                      ?.modules[currentModuleIdx]?.lessons.find((l) => l.id === currentLesson.id);
                    if (targetLes) {
                      saveLessonBlocksToDbApi(currentLesson.id, targetLes.blocks || []);
                      updateLessonInDbApi(currentLesson.id, { gap: targetLes.gap || [] });
                    }
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

      {/* 4. Transcript Modal */}
      {showTranscriptModal && (
        <TranscriptModal
          onConvertToNotes={handleConvertToNotes}
          onAnalyzeGaps={handleAnalyzeTranscript}
          onClose={() => setShowTranscriptModal(false)}
          loading={isAnalyzingGaps}
        />
      )}

      {/* 5. Add Course Modal Popup */}
      <AddCourseModal
        isOpen={showAddCourseModal}
        onClose={() => setShowAddCourseModal(false)}
        onSubmit={handleCreateCourse}
      />

      {/* 5b. Edit Course Modal Popup */}
      <EditCourseModal
        isOpen={showEditCourseModal}
        course={editingCourse}
        onClose={() => {
          setShowEditCourseModal(false);
          setEditingCourse(null);
        }}
        onSubmit={handleSaveEditedCourse}
      />

      {/* 6. Add Page / Lesson Modal Popup */}
      <AddPageModal
        isOpen={showAddPageModal}
        onClose={() => {
          setShowAddPageModal(false);
          setAddPageContext(null);
        }}
        onSubmit={handleCreatePage}
        courseTitle={currentCourse?.title}
      />

      {/* 6b. Add Module Modal Popup */}
      <AddModuleModal
        isOpen={showAddModuleModal}
        onClose={() => setShowAddModuleModal(false)}
        onSubmit={handleCreateModule}
        courseTitle={currentCourse?.title}
        defaultIndex={currentCourse ? currentCourse.modules.length + 1 : 1}
      />

      {/* 7. Confirmation Modal Popup */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        description={confirmModalState.description}
        confirmLabel={confirmModalState.confirmLabel}
        confirmVariant={confirmModalState.confirmVariant}
      />

      {/* 8. Source URL Modal Popup */}
      {showUrlModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,10,10,0.6)",
            backdropFilter: "blur(2px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setShowUrlModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "#FFFFFF",
              border: "3px solid #0A0A0A",
              boxShadow: "7px 7px 0 #0A0A0A",
              padding: "24px",
              color: "#0A0A0A",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.16em",
                opacity: 0.5,
                marginBottom: "6px",
              }}
            >
              LECTURE / VIDEO / RESOURCE LINK
            </div>
            <h3
              style={{
                margin: "0 0 16px",
                fontFamily: "var(--display, sans-serif)",
                fontSize: "20px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              Attach Source URL
            </h3>
            <input
              type="url"
              autoFocus
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or https://coursera.org/..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLessonUrl(urlDraft);
                if (e.key === "Escape") setShowUrlModal(false);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "12px",
                border: "2px solid #0A0A0A",
                background: "#F3F0E8",
                color: "#0A0A0A",
                outline: "none",
                marginBottom: "18px",
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: "2px solid #0A0A0A",
                  background: "transparent",
                  color: "#0A0A0A",
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => handleSaveLessonUrl(urlDraft)}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: "2px solid #0A0A0A",
                  background: "#B8F04A",
                  color: "#0A0A0A",
                  padding: "8px 16px",
                  cursor: "pointer",
                  boxShadow: "2px 2px 0 #0A0A0A",
                }}
              >
                SAVE URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Global Quick Switcher Modal (Cmd+K) */}
      <QuickSwitcherModal
        isOpen={showQuickSwitcher}
        onClose={() => setShowQuickSwitcher(false)}
        courses={courses}
        onSelectPage={(cIdx, mIdx, lIdx) => {
          setCurrentCourseIdx(cIdx);
          setCurrentModuleIdx(mIdx);
          setCurrentLessonIdx(lIdx);
          setView("course");
        }}
      />

      {/* 10. Active Recall Flashcards Deck Modal */}
      {showFlashcardModal && currentLesson && (
        <FlashcardModal
          isOpen={showFlashcardModal}
          onClose={() => setShowFlashcardModal(false)}
          lessonTitle={currentLesson.title}
          blocks={currentBlocks}
          accentColor={currentCourse?.accent}
        />
      )}
    </div>
  );
}
