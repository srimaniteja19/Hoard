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
  getLessonAncestors,
  getDirectChildLessons,
} from "@/lib/notebooks/storage";
import { SubpagesDirectory } from "@/components/notebooks/SubpagesDirectory";
import {
  subscribeToRealtimeEvents,
  broadcastRealtimeEvent,
  setSyncStatus,
} from "@/lib/notebooks/realtime";
import { SeedCourse, SeedCourseLesson, SeedCourseModule, CourseCollision } from "@/lib/notebooks/seedData";
import { Block, computeWordCount, generateBlockId, convertBlocksToMarkdown, isHtmlContent, extractHtmlTitle, lessonState } from "@/lib/notebooks/blocks";
import { useModalFocusTrap } from "@/lib/notebooks/useModalFocusTrap";
import { CourseCard } from "@/components/notebooks/CourseCard";
import { CollisionsPanel } from "@/components/notebooks/CollisionsPanel";
import { OutlineSidebar } from "@/components/notebooks/OutlineSidebar";
import { BlockEditor } from "@/components/notebooks/BlockEditor";
import { SyncStatusPill } from "@/components/notebooks/SyncStatusPill";
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
import { PageEmbeddedMedia } from "@/components/notebooks/PageEmbeddedMedia";
import { GenerateTopicModal } from "@/components/notebooks/GenerateTopicModal";

const MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_SEARCH_RESULTS = 60;

const isSafeHttpUrl = (raw?: string | null): boolean => {
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export default function NotebooksPage() {
  const [courses, setCourses] = useState<SeedCourse[]>([]);
  const coursesRef = useRef<SeedCourse[]>(courses);
  useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);
  const [collisions, setCollisions] = useState<CourseCollision[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [aiError, setAiError] = useState<{ message: string; retry?: () => void } | null>(null);
  const [view, setView] = useState<"index" | "course">("index");
  const [currentCourseIdx, setCurrentCourseIdx] = useState(0);
  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
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
  const [explainError, setExplainError] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topicModalInitialQuery, setTopicModalInitialQuery] = useState("");

  // Page Productivity & Outline States
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [copiedMarkdownToast, setCopiedMarkdownToast] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const diffTargetRef = useRef<{ courseId: string; lessonId: string } | null>(null);
  const pendingTopicMetaRef = useRef<{
    courseId: string;
    lessonId: string;
    title: string;
    icon?: string;
    coverUrl?: string;
  } | null>(null);
  const pendingNewLessonRef = useRef<{
    courseId: string;
    moduleId: string;
    moduleIdx: number;
    title: string;
    icon?: string;
    coverUrl?: string;
  } | null>(null);
  const explainTargetRef = useRef<{ courseId: string; lessonId: string } | null>(null);
  const urlModalDialogRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);
  const activeControllersRef = useRef<Set<AbortController>>(new Set());
  const copiedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutationInFlightRef = useRef({
    createCourse: false,
    createModule: false,
    createPage: false,
    duplicateLesson: false,
  });

  useEffect(() => {
    const controllers = activeControllersRef.current;
    return () => {
      controllers.forEach((c) => c.abort());
      controllers.clear();
      if (copiedToastTimerRef.current) clearTimeout(copiedToastTimerRef.current);
    };
  }, []);

  // Focus Mode, Quick Switcher, Flashcard, & Deep Search States
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  // Clean Header Dropdown States
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showPageMoreMenu, setShowPageMoreMenu] = useState(false);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const pageMoreMenuRef = useRef<HTMLDivElement>(null);
  const appearanceMenuRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setShowAiMenu(false);
      }
      if (pageMoreMenuRef.current && !pageMoreMenuRef.current.contains(e.target as Node)) {
        setShowPageMoreMenu(false);
      }
      if (appearanceMenuRef.current && !appearanceMenuRef.current.contains(e.target as Node)) {
        setShowAppearanceMenu(false);
      }
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) {
        setShowHelpMenu(false);
      }
    };
    if (showAiMenu || showPageMoreMenu || showAppearanceMenu || showHelpMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAiMenu, showPageMoreMenu, showAppearanceMenu, showHelpMenu]);

  // Global Keyboard Shortcuts (Cmd+K Quick Switcher, Cmd+\ Sidebar, Cmd+Shift+F Focus, ? Help, Escape)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowQuickSwitcher((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        if (isMobile) setMobileSidebarOpen((prev) => !prev);
        else setSidebarCollapsed((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      } else if (e.key === "?" && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowHelpMenu((prev) => !prev);
      } else if (e.key === "Escape") {
        setShowAppearanceMenu(false);
        setShowHelpMenu(false);
        setShowAiMenu(false);
        setShowPageMoreMenu(false);
        if (mobileSidebarOpen) setMobileSidebarOpen(false);
        else if (isFocusMode) setIsFocusMode(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isFocusMode, isMobile, mobileSidebarOpen]);

  useEffect(() => {
    const el = mobileDrawerRef.current;
    if (el) {
      el.inert = isMobile && !mobileSidebarOpen;
    }
  }, [isMobile, mobileSidebarOpen]);

  useModalFocusTrap({
    isOpen: isMobile && mobileSidebarOpen && !isFocusMode,
    onClose: () => setMobileSidebarOpen(false),
    containerRef: mobileDrawerRef,
  });

  useModalFocusTrap({
    isOpen: showUrlModal,
    onClose: () => {
      setShowUrlModal(false);
      setUrlError(null);
    },
    containerRef: urlModalDialogRef,
  });

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

      // Keep active course, module, and lesson aligned with new data
      setCourses((prevCourses) => {
        const activeCourse = prevCourses[currentCourseIdx];
        const activeLesson = activeCourse?.modules[currentModuleIdx]?.lessons[currentLessonIdx];
        if (activeLesson) {
          for (let cIdx = 0; cIdx < dbData.courses.length; cIdx++) {
            if (isSameId(dbData.courses[cIdx].id, activeCourse.id)) {
              for (let mIdx = 0; mIdx < dbData.courses[cIdx].modules.length; mIdx++) {
                const lIdx = dbData.courses[cIdx].modules[mIdx].lessons.findIndex((l) => isSameId(l.id, activeLesson.id));
                if (lIdx !== -1) {
                  setCurrentCourseIdx(cIdx);
                  setCurrentModuleIdx(mIdx);
                  setCurrentLessonIdx(lIdx);
                  break;
                }
              }
            }
          }
        }
        return dbData.courses;
      });

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
    [currentCourseIdx, currentModuleIdx, currentLessonIdx]
  );

  // Load courses & restore active location on mount
  useEffect(() => {
    // 1. Immediate local cache load
    const loaded = getStoredCourses();
    setCourses(loaded);
    setCollisions(getCollisions());

    // 2. Asynchronously fetch from PostgreSQL database
    fetchNotebooksFromDbApi()
      .then((dbData) => {
        if (applyFetchedCoursesIfSafe(dbData)) {
          saveCollisions(dbData!.collisions || []);
          setCollisions(dbData!.collisions || []);
        }
      })
      .finally(() => {
        setIsInitialLoading(false);
      });

    // Restore paper theme (default to global app theme when no notebook override is stored)
    const savedTheme = localStorage.getItem("hoard_notebook_theme") as NotebookTheme | null;
    if (savedTheme === "cream" || savedTheme === "ink" || savedTheme === "matcha" || savedTheme === "midnight") {
      setPaperTheme(savedTheme);
    } else {
      const appTheme = document.documentElement.dataset.theme;
      if (appTheme === "matcha") setPaperTheme("matcha");
      else if (appTheme === "matte_black" || appTheme === "tokyo") setPaperTheme("ink");
      else if (appTheme === "cyberpunk" || appTheme === "nordic") setPaperTheme("midnight");
    }

    // Check URL parameters first, then localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const paramCourse = urlParams.get("course") || urlParams.get("c");
    const paramMod = urlParams.get("m") || urlParams.get("module");
    const paramLes = urlParams.get("l") || urlParams.get("lesson");

    let restored = false;

    if (paramCourse) {
      const cIdx = loaded.findIndex((c) => isSameId(c.id, paramCourse) || c.title.toLowerCase() === paramCourse.toLowerCase());
      if (cIdx >= 0) {
        let mIdx = paramMod ? Math.max(0, Math.min(parseInt(paramMod, 10) || 0, loaded[cIdx].modules.length - 1)) : 0;
        let lIdx = -1;
        if (paramLes) {
          // Check if paramLes is a lessonId across modules
          for (let mi = 0; mi < loaded[cIdx].modules.length; mi++) {
            const found = loaded[cIdx].modules[mi].lessons.findIndex((l) => isSameId(l.id, paramLes));
            if (found !== -1) {
              mIdx = mi;
              lIdx = found;
              break;
            }
          }
        }
        if (lIdx === -1) {
          lIdx = paramLes ? Math.max(0, Math.min(parseInt(paramLes, 10) || 0, (loaded[cIdx].modules[mIdx]?.lessons.length || 1) - 1)) : 0;
        }
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
            const cIdx = loaded.findIndex((c) => isSameId(c.id, parsed.courseId));
            if (cIdx >= 0) {
              let mIdx = Math.max(0, Math.min(parsed.m || 0, loaded[cIdx].modules.length - 1));
              let lIdx = -1;
              if (parsed.lessonId) {
                for (let mi = 0; mi < loaded[cIdx].modules.length; mi++) {
                  const found = loaded[cIdx].modules[mi].lessons.findIndex((l) => isSameId(l.id, parsed.lessonId));
                  if (found !== -1) {
                    mIdx = mi;
                    lIdx = found;
                    break;
                  }
                }
              }
              if (lIdx === -1) {
                lIdx = Math.max(0, Math.min(parsed.l || 0, (loaded[cIdx].modules[mIdx]?.lessons.length || 1) - 1));
              }
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
      const activeLesson = course.modules[currentModuleIdx]?.lessons[currentLessonIdx];
      const url = new URL(window.location.href);
      url.searchParams.set("course", course.id);
      url.searchParams.set("m", currentModuleIdx.toString());
      url.searchParams.set("l", currentLessonIdx.toString());
      if (activeLesson?.id) {
        url.searchParams.set("lesson", activeLesson.id);
      }
      window.history.replaceState({}, "", url.toString());

      localStorage.setItem(
        "hoard_notebook_location",
        JSON.stringify({
          view: "course",
          courseId: course.id,
          m: currentModuleIdx,
          l: currentLessonIdx,
          lessonId: activeLesson?.id,
        })
      );
    } else if (view === "index") {
      const url = new URL(window.location.href);
      url.searchParams.delete("course");
      url.searchParams.delete("c");
      url.searchParams.delete("m");
      url.searchParams.delete("l");
      url.searchParams.delete("lesson");
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

  const lessonAncestors = currentLesson && currentModule
    ? getLessonAncestors(currentModule.lessons, currentLesson.id)
    : [];

  const isSameId = (a: string, b: string) => {
    if (a === b) return true;
    if (a.endsWith("_" + b) || b.endsWith("_" + a)) return true;
    return false;
  };

  // Seamless navigation to any lesson/subpage by ID
  const navigateToLesson = (lessonId: string, coursesList?: SeedCourse[]) => {
    const list = coursesList || courses;
    for (let cIdx = 0; cIdx < list.length; cIdx++) {
      const c = list[cIdx];
      for (let mIdx = 0; mIdx < c.modules.length; mIdx++) {
        const mod = c.modules[mIdx];
        const lIdx = mod.lessons.findIndex((l) => isSameId(l.id, lessonId));
        if (lIdx !== -1) {
          playSound.click();
          setCurrentCourseIdx(cIdx);
          setCurrentModuleIdx(mIdx);
          setCurrentLessonIdx(lIdx);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }
    }
  };

  // Create Notion-style Subpage (nested under parentLessonId or active page)
  const handleCreateSubpage = (parentLessonId?: string, targetBlockIdx?: number) => {
    if (!currentCourse || !currentModule) return;
    const parentId = parentLessonId || currentLesson?.id;
    if (!parentId) return;

    playSound.click();
    const newSubpageId = crypto.randomUUID();
    const newSubpage: SeedCourseLesson = {
      id: newSubpageId,
      title: "Untitled Subpage",
      watched: false,
      parentId,
      icon: "📄",
      meta: "NO NOTES YET",
      blocks: [{ id: generateBlockId(), type: "paragraph", text: "" }],
    };

    const targetMod = currentModule;

    // 1. Flush any pending debounced note save so it does not overwrite the new subpage with stale courses
    if (pendingSaveRef.current) {
      clearTimeout(pendingSaveRef.current.timer);
      const { lessonId, blocks } = pendingSaveRef.current;
      saveLessonBlocksToDbApi(lessonId, blocks);
      pendingSaveRef.current = null;
    }

    // 2. Prepare parent note's blocks if called with targetBlockIdx (inline subpage block)
    let updatedParentBlocks: Block[] | null = null;
    if (typeof targetBlockIdx === "number" && currentLesson && isSameId(currentLesson.id, parentId)) {
      const subpageBlock: Block = {
        id: generateBlockId(),
        type: "subpage",
        pageId: newSubpageId,
        title: newSubpage.title,
        icon: newSubpage.icon,
        wordCount: 0,
      };
      updatedParentBlocks = [...currentBlocks];
      const targetBlock = updatedParentBlocks[targetBlockIdx];
      const isSlashBlock =
        targetBlock &&
        "text" in targetBlock &&
        typeof (targetBlock as any).text === "string" &&
        ((targetBlock as any).text.trim() === "" || (targetBlock as any).text.trim().startsWith("/"));
      if (isSlashBlock) {
        updatedParentBlocks.splice(targetBlockIdx, 1, subpageBlock);
      } else {
        updatedParentBlocks.splice(targetBlockIdx + 1, 0, subpageBlock);
      }
    }

    // 3. Atomically update courses with BOTH new subpage AND parent's updated blocks
    const updated = courses.map((c) => {
      if (!isSameId(c.id, currentCourse.id)) return c;
      return {
        ...c,
        modules: c.modules.map((m) => {
          if (!isSameId(m.id, targetMod.id)) return m;
          let nextLessons = m.lessons;
          if (updatedParentBlocks) {
            nextLessons = nextLessons.map((les) =>
              isSameId(les.id, parentId)
                ? {
                    ...les,
                    blocks: updatedParentBlocks!,
                    meta: `${computeWordCount(updatedParentBlocks!).toLocaleString()} WORDS · EDITED JUST NOW`,
                  }
                : les
            );
          }
          return {
            ...m,
            lessons: [...nextLessons, newSubpage],
          };
        }),
      };
    });

    setCourses(updated);
    saveStoredCourses(updated);

    if (updatedParentBlocks) {
      saveLessonBlocksToDbApi(parentId, updatedParentBlocks);
    }

    // 4. Persist to DB API and guard inFlightSaveRef so auto-refetch cannot clobber it
    const createPromise = createLessonInDbApi(targetMod.id, newSubpage.title, newSubpage.blocks, undefined, {
      id: newSubpageId,
      parentId,
      icon: newSubpage.icon,
    });
    inFlightSaveRef.current = createPromise.finally(() => {
      if (inFlightSaveRef.current === createPromise) inFlightSaveRef.current = null;
    });

    // 5. Navigate into the new subpage using the updated courses list immediately
    navigateToLesson(newSubpageId, updated);
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
    if (!currentCourse || !currentLesson) return;
    const updated = courses.map((c) => {
      if (c.id !== currentCourse.id) return c;
      return {
        ...c,
        modules: c.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => {
            if (l.id !== currentLesson.id) return l;
            return {
              ...l,
              coverUrl: coverUrl || undefined,
            };
          }),
        })),
      };
    });
    setCourses(updated);
    saveStoredCourses(updated);
    updateLessonInDbApi(currentLesson.id, { coverUrl: coverUrl ? coverUrl : null });
  };

  const handleUpdateCurrentLessonIcon = (icon: string | undefined) => {
    if (!currentCourse || !currentLesson) return;
    const updated = courses.map((c) => {
      if (c.id !== currentCourse.id) return c;
      return {
        ...c,
        modules: c.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => {
            const updatedL = isSameId(l.id, currentLesson.id) ? { ...l, icon: icon || undefined } : l;
            // Also update any inline subpage block linking to this lesson
            if (l.blocks && l.blocks.some((b) => b.type === "subpage" && isSameId(b.pageId, currentLesson.id))) {
              return {
                ...updatedL,
                blocks: l.blocks.map((b) =>
                  b.type === "subpage" && isSameId(b.pageId, currentLesson.id)
                    ? { ...b, icon: icon || "📄" }
                    : b
                ),
              };
            }
            return updatedL;
          }),
        })),
      };
    });
    setCourses(updated);
    saveStoredCourses(updated);
    updateLessonInDbApi(currentLesson.id, { icon: icon ? icon : null });
  };

  const handleSelectCourseFromCard = (idx: number) => {
    playSound.click();
    const selectedCourse = courses[idx];
    let targetModIdx = 0;
    let targetLesIdx = 0;

    if (selectedCourse) {
      let foundFallback = false;
      for (let mIdx = 0; mIdx < selectedCourse.modules.length; mIdx++) {
        const lessons = selectedCourse.modules[mIdx].lessons;
        const watchedUnwrittenIdx = lessons.findIndex(
          (l) => l.watched && lessonState({ wordCount: computeWordCount(l.blocks || []) }) !== "written"
        );
        if (watchedUnwrittenIdx !== -1) {
          targetModIdx = mIdx;
          targetLesIdx = watchedUnwrittenIdx;
          foundFallback = true;
          break;
        }
      }
      if (!foundFallback) {
        for (let mIdx = 0; mIdx < selectedCourse.modules.length; mIdx++) {
          const lessons = selectedCourse.modules[mIdx].lessons;
          const firstUnwrittenIdx = lessons.findIndex(
            (l) => lessonState({ wordCount: computeWordCount(l.blocks || []) }) !== "written"
          );
          if (firstUnwrittenIdx !== -1) {
            targetModIdx = mIdx;
            targetLesIdx = firstUnwrittenIdx;
            break;
          }
        }
      }
    }

    setCurrentCourseIdx(idx);
    setCurrentModuleIdx(targetModIdx);
    setCurrentLessonIdx(targetLesIdx);
    setView("course");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigateToCollision = (courseTitle: string, lessonTitle: string) => {
    const normCourse = courseTitle.trim().toLowerCase();
    const normLesson = lessonTitle.trim().toLowerCase();
    for (let cIdx = 0; cIdx < courses.length; cIdx++) {
      const course = courses[cIdx];
      if (course.title.trim().toLowerCase() !== normCourse) continue;
      for (let mIdx = 0; mIdx < course.modules.length; mIdx++) {
        const lIdx = course.modules[mIdx].lessons.findIndex(
          (l) => l.title.trim().toLowerCase() === normLesson
        );
        if (lIdx !== -1) {
          setCurrentCourseIdx(cIdx);
          setCurrentModuleIdx(mIdx);
          setCurrentLessonIdx(lIdx);
          setView("course");
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }
    }
    setAiError({
      message: `Could not locate "${lessonTitle}" in "${courseTitle}".`,
    });
  };

  const handleToggleWatched = (modIdx: number, lesIdx: number) => {
    if (!currentCourse) return;
    const targetLesson = currentCourse.modules[modIdx]?.lessons[lesIdx];
    if (!targetLesson) return;
    const updated = toggleLessonWatched(currentCourse.id, targetLesson.id);
    setCourses([...updated]);
    updateLessonInDbApi(targetLesson.id, { toggleWatched: true });
  };

  const handleToggleModuleWatched = (modIdx: number, watched: boolean) => {
    if (!currentCourse) return;
    const targetModule = currentCourse.modules[modIdx];
    if (!targetModule) return;
    const toUpdate = targetModule.lessons.filter((l) => Boolean(l.watched) !== watched);
    if (toUpdate.length === 0) return;

    playSound.click();
    const updated = courses.map((course) => {
      if (!isSameId(course.id, currentCourse.id)) return course;
      return {
        ...course,
        modules: course.modules.map((mod, idx) =>
          idx === modIdx
            ? {
                ...mod,
                lessons: mod.lessons.map((les) => ({ ...les, watched })),
              }
            : mod
        ),
      };
    });
    setCourses(updated);
    saveStoredCourses(updated);
    toUpdate.forEach((les) => {
      updateLessonInDbApi(les.id, { toggleWatched: true });
    });
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

  const handleApplyBlocksForLesson = (courseId: string, lessonId: string, newBlocks: Block[]) => {
    setCourses((prevCourses) => {
      const updated = computeLessonBlocksUpdate(prevCourses, courseId, lessonId, newBlocks);
      saveStoredCourses(updated);
      return updated;
    });
    broadcastRealtimeEvent({
      type: "NOTE_BLOCKS_UPDATED",
      lessonId,
      blocks: newBlocks,
      wordCount: computeWordCount(newBlocks),
    });
    saveLessonBlocksToDbApi(lessonId, newBlocks);
  };

  const getTargetBlockIdxFromEvent = (target: EventTarget | null): number => {
    const findBlockIdx = (el: HTMLElement | null): number => {
      const blockEl = el?.closest<HTMLElement>("[data-block-id]");
      const blockId = blockEl?.getAttribute("data-block-id");
      return blockId ? currentBlocks.findIndex((b) => b.id === blockId) : -1;
    };
    let idx = target instanceof HTMLElement ? findBlockIdx(target) : -1;
    if (idx === -1 && typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      idx = findBlockIdx(document.activeElement);
    }
    return idx;
  };

  const insertImageFileIntoBlocks = (file: File, targetIdx: number, caption: string) => {
    if (!currentCourse || !currentLesson) return;
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      setAiError({
        message: `Image "${file.name || "pasted image"}" exceeds the 4 MB inline storage limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Compress or link an external image URL instead.`,
      });
      return;
    }
    const targetCourseId = currentCourse.id;
    const targetLessonId = currentLesson.id;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result;
      if (typeof dataUrl !== "string" || !dataUrl) return;
      const imageBlock: Block = {
        id: generateBlockId(),
        type: "image",
        url: dataUrl,
        caption,
      };
      const targetLessonObj = coursesRef.current
        .find((c) => isSameId(c.id, targetCourseId))
        ?.modules.flatMap((m) => m.lessons)
        .find((l) => isSameId(l.id, targetLessonId));
      const baseBlocks = targetLessonObj?.blocks || currentBlocks;
      let nextBlocks: Block[];
      if (targetIdx >= 0 && targetIdx < baseBlocks.length) {
        const targetBlock = baseBlocks[targetIdx];
        const isEmptyParagraph =
          targetBlock.type === "paragraph" &&
          (!("text" in targetBlock) || !targetBlock.text || !targetBlock.text.trim());
        nextBlocks = [...baseBlocks];
        if (isEmptyParagraph) {
          nextBlocks[targetIdx] = imageBlock;
        } else {
          nextBlocks.splice(targetIdx + 1, 0, imageBlock);
        }
      } else {
        nextBlocks = [...baseBlocks, imageBlock];
      }
      handleApplyBlocksForLesson(targetCourseId, targetLessonId, nextBlocks);
      playSound.fileIt();
    };
    reader.onerror = () => {
      setAiError({
        message: `Failed to read "${file.name || "image file"}". Try another image format.`,
      });
    };
    reader.readAsDataURL(file);
  };

  const isAbortError = (err: unknown): boolean =>
    err instanceof Error && err.name === "AbortError";

  const getErrorMessage = (err: unknown, fallback: string): string =>
    err instanceof Error && err.message ? err.message : fallback;

  const fetchJsonWithTimeout = async <T = unknown>(
    url: string,
    payload: unknown,
    fallbackError: string
  ): Promise<T> => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new Error("You appear to be offline. Reconnect and try again.");
    }
    const controller = new AbortController();
    activeControllersRef.current.add(controller);
    const timeoutId = setTimeout(() => controller.abort("timeout"), 45000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        if (res.status === 401) throw new Error("Session expired. Sign in again and retry.");
        if (res.status === 429) throw new Error("Rate limit reached. Wait a moment and retry.");
        throw new Error(data?.error || data?.message || fallbackError);
      }
      return data as T;
    } catch (err: unknown) {
      if (isAbortError(err) && controller.signal.reason === "timeout") {
        throw new Error("Request timed out after 45s. Please try again.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      activeControllersRef.current.delete(controller);
    }
  };

  // AI: TIDY MY NOTES
  const handleTidyNotes = async () => {
    if (!currentCourse || !currentLesson || currentBlocks.length === 0 || isTidying) return;
    const targetCourseId = currentCourse.id;
    const targetLessonId = currentLesson.id;
    const snapshotBlocks = currentBlocks;
    setAiError(null);
    setIsTidying(true);
    try {
      const data = await fetchJsonWithTimeout<{ blocks: Block[]; summaryOfChanges?: string }>(
        "/api/notebooks/tidy",
        {
          blocks: snapshotBlocks,
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        },
        "Could not tidy notes. Check your connection and try again."
      );
      diffTargetRef.current = { courseId: targetCourseId, lessonId: targetLessonId };
      setDiffOriginal(snapshotBlocks);
      setDiffProposed(data.blocks);
      setDiffSummary(data.summaryOfChanges || "Restructured notes into organized sections.");
      playSound.fileIt();
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      setAiError({
        message: getErrorMessage(err, "Could not tidy notes. Check your connection and try again."),
        retry: () => handleTidyNotes(),
      });
    } finally {
      setIsTidying(false);
    }
  };

  // AI: QUIZ ME
  const handleQuizMe = async () => {
    if (!currentCourse || !currentLesson || isQuizzing) return;
    setAiError(null);
    setIsQuizzing(true);
    try {
      const data = await fetchJsonWithTimeout<{
        questions?: React.ComponentProps<typeof QuizModal>["questions"];
        notEnough?: boolean;
        explanation?: string;
      }>(
        "/api/notebooks/quiz",
        {
          blocks: currentBlocks,
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        },
        "Failed to generate quiz for this lesson."
      );
      setQuizQuestions(data.questions || []);
      setQuizNotEnough(!!data.notEnough);
      setQuizExplanation(data.explanation || "");
      playSound.fileIt();
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      setAiError({
        message: getErrorMessage(err, "Failed to generate quiz for this lesson."),
        retry: () => handleQuizMe(),
      });
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
    const fallbackBlock = currentBlocks.find(
      (b) =>
        (b.type === "paragraph" || b.type === "callout" || b.type === "quote" || b.type === "heading") &&
        Boolean((b as { text?: string }).text?.trim())
    );
    const targetText =
      selectedText ||
      (fallbackBlock && "text" in fallbackBlock ? fallbackBlock.text?.trim() : "") ||
      "";

    if (!targetText) {
      setAiError({
        message: "Select a passage or write some notes first before asking AI to explain.",
      });
      return;
    }

    await handleExplainWithSelection(targetText);
  };

  const handleExplainWithSelection = async (text: string) => {
    if (!text.trim() || !currentCourse || !currentLesson || isExplaining) return;
    explainTargetRef.current = { courseId: currentCourse.id, lessonId: currentLesson.id };
    setExplainSelection(text.trim());
    setExplainText("");
    setExplainError(null);
    setIsExplaining(true);

    try {
      const data = await fetchJsonWithTimeout<{ explanation: string }>(
        "/api/notebooks/explain",
        {
          selection: text.trim(),
          context: JSON.stringify(currentBlocks),
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        },
        "Failed to generate contextual explanation."
      );
      setExplainText(data.explanation);
      playSound.fileIt();
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      setExplainError(getErrorMessage(err, "Failed to generate contextual explanation."));
    } finally {
      setIsExplaining(false);
    }
  };

  // AI: CONVERT TRANSCRIPT TO STRUCTURED NOTES
  const handleConvertToNotes = async (transcriptText: string) => {
    if (!currentCourse || !currentLesson || isAnalyzingGaps) return;
    const targetCourseId = currentCourse.id;
    const targetLessonId = currentLesson.id;
    const snapshotBlocks = currentBlocks;
    setAiError(null);
    setIsAnalyzingGaps(true);
    try {
      const data = await fetchJsonWithTimeout<{ blocks: Block[]; summary?: string }>(
        "/api/notebooks/draft-transcript",
        {
          transcript: transcriptText,
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        },
        "Failed to convert transcript into structured notes."
      );
      diffTargetRef.current = { courseId: targetCourseId, lessonId: targetLessonId };
      setDiffOriginal(snapshotBlocks);
      setDiffProposed(data.blocks);
      setDiffSummary(data.summary || "Structured lecture transcript into clean notebook blocks.");
      setShowTranscriptModal(false);
      playSound.fileIt();
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      setShowTranscriptModal(false);
      setAiError({
        message: getErrorMessage(err, "Failed to convert transcript into structured notes."),
        retry: () => handleConvertToNotes(transcriptText),
      });
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  // AI: WHAT DID I MISS? (Gap analysis)
  const handleAnalyzeTranscript = async (transcriptText: string) => {
    if (!currentCourse || !currentLesson || isAnalyzingGaps) return;
    const targetCourseId = currentCourse.id;
    const targetLessonId = currentLesson.id;
    setAiError(null);
    setIsAnalyzingGaps(true);
    try {
      const data = await fetchJsonWithTimeout<{ gaps?: SeedCourseLesson["gap"] }>(
        "/api/notebooks/gaps",
        {
          transcript: transcriptText,
          blocks: currentBlocks,
          courseTitle: currentCourse.title,
          lessonTitle: currentLesson.title,
        },
        "Failed to analyze transcript for missed concepts."
      );
      setCourses((prevCourses) => {
        const nextCourses = prevCourses.map((c) => {
          if (!isSameId(c.id, targetCourseId)) return c;
          return {
            ...c,
            modules: c.modules.map((m) => ({
              ...m,
              lessons: m.lessons.map((l) =>
                isSameId(l.id, targetLessonId) ? { ...l, gap: data.gaps } : l
              ),
            })),
          };
        });
        saveStoredCourses(nextCourses);
        return nextCourses;
      });
      updateLessonInDbApi(targetLessonId, { gap: data.gaps });
      setShowTranscriptModal(false);
      playSound.fileIt();
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      setShowTranscriptModal(false);
      setAiError({
        message: getErrorMessage(err, "Failed to analyze transcript for missed concepts."),
        retry: () => handleAnalyzeTranscript(transcriptText),
      });
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
    if (mutationInFlightRef.current.createCourse) return;
    mutationInFlightRef.current.createCourse = true;
    try {
      const newCourse = await createCourseInDbApi({
        title,
        provider: provider || "DEEPLEARNING.AI",
        accent: accent || "#7B5CF0",
        accentFg: accentFg || "#FFFFFF",
      });
      const courseToAdd =
        newCourse ||
        createNewCourse(title, provider || "DEEPLEARNING.AI", accent || "#7B5CF0", accentFg || "#FFFFFF");
      setCourses((prevCourses) => {
        const updated = [...prevCourses, courseToAdd];
        saveStoredCourses(updated);
        setCurrentCourseIdx(updated.length - 1);
        return updated;
      });
      setCurrentModuleIdx(0);
      setCurrentLessonIdx(0);
      setView("course");
      setShowAddCourseModal(false);
    } finally {
      mutationInFlightRef.current.createCourse = false;
    }
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
    if (!currentCourse || !title.trim() || mutationInFlightRef.current.createModule) return;
    mutationInFlightRef.current.createModule = true;
    const targetCourseId = currentCourse.id;
    try {
      const createdMod = await createModuleInDbApi(targetCourseId, title.trim());
      const newModule: SeedCourseModule = createdMod || {
        id: "mod-" + Date.now().toString(36),
        title: title.trim(),
        lessons: [],
      };

      setCourses((prevCourses) => {
        const updated = prevCourses.map((c) => {
          if (c.id === targetCourseId) {
            const nextModules = [...c.modules, newModule];
            setCurrentModuleIdx(nextModules.length - 1);
            return {
              ...c,
              modules: nextModules,
            };
          }
          return c;
        });
        saveStoredCourses(updated);
        return updated;
      });
      setCurrentLessonIdx(0);
      setShowAddModuleModal(false);
      playSound.fileIt();
    } finally {
      mutationInFlightRef.current.createModule = false;
    }
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
    if (!currentCourse || !newTitle.trim() || mutationInFlightRef.current.createPage) return;
    const targetModIdx = addPageContext ? addPageContext.modIdx : currentModule ? currentModuleIdx : 0;
    const targetMod = currentCourse.modules[targetModIdx];
    if (!targetMod) return;

    mutationInFlightRef.current.createPage = true;
    const targetCourseId = currentCourse.id;
    const targetModId = targetMod.id;
    const targetPos = addPageContext?.targetPosition ?? targetMod.lessons.length;

    try {
      const createdLesson = await createLessonInDbApi(targetModId, newTitle.trim(), undefined, targetPos);
      const newLesson: SeedCourseLesson = createdLesson || {
        id: "les-" + Date.now().toString(36),
        title: newTitle.trim(),
        watched: false,
        meta: "STUB · 1 LINE",
        blocks: [{ id: generateBlockId(), type: "paragraph" as const, text: "" }],
      };

      setCourses((prevCourses) => {
        const updated = prevCourses.map((c) => {
          if (c.id === targetCourseId) {
            return {
              ...c,
              modules: c.modules.map((m, mIdx) => {
                if (mIdx === targetModIdx) {
                  const nextLessons = [...m.lessons];
                  const safePos = Math.max(0, Math.min(targetPos, nextLessons.length));
                  nextLessons.splice(safePos, 0, newLesson);
                  setCurrentLessonIdx(safePos);
                  return { ...m, lessons: nextLessons };
                }
                return m;
              }),
            };
          }
          return c;
        });
        saveStoredCourses(updated);
        return updated;
      });
      setCurrentModuleIdx(targetModIdx);
      setAddPageContext(null);
      setShowAddPageModal(false);
    } finally {
      mutationInFlightRef.current.createPage = false;
    }
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
    if (!currentCourse || mutationInFlightRef.current.duplicateLesson) return;
    const targetMod = currentCourse.modules[modIdx];
    const targetLes = targetMod?.lessons[lesIdx];
    if (!targetMod || !targetLes) return;

    mutationInFlightRef.current.duplicateLesson = true;
    const targetCourseId = currentCourse.id;
    try {
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

      setCourses((prevCourses) => {
        const updated = prevCourses.map((c) => {
          if (c.id === targetCourseId) {
            return {
              ...c,
              modules: c.modules.map((m, mIdx) => {
                if (mIdx === modIdx) {
                  const nextLessons = [...m.lessons, newLesson];
                  setCurrentLessonIdx(nextLessons.length - 1);
                  return { ...m, lessons: nextLessons };
                }
                return m;
              }),
            };
          }
          return c;
        });
        saveStoredCourses(updated);
        return updated;
      });
      setCurrentModuleIdx(modIdx);
      playSound.fileIt();
    } finally {
      mutationInFlightRef.current.duplicateLesson = false;
    }
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
                lessons: m.lessons.map((l, lIdx) => {
                  const updatedL = lIdx === currentLessonIdx ? { ...l, title } : l;
                  // Also update any inline subpage block linking to this lesson
                  if (l.blocks && l.blocks.some((b) => b.type === "subpage" && isSameId(b.pageId, currentLesson.id))) {
                    return {
                      ...updatedL,
                      blocks: l.blocks.map((b) =>
                        b.type === "subpage" && isSameId(b.pageId, currentLesson.id)
                          ? { ...b, title }
                          : b
                      ),
                    };
                  }
                  return updatedL;
                }),
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
  const handleCopyAsMarkdown = async () => {
    if (!currentLesson) return;
    const md = convertBlocksToMarkdown(currentLesson.title, currentBlocks);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(md);
      setCopiedMarkdownToast(true);
      playSound.click();
      if (copiedToastTimerRef.current) clearTimeout(copiedToastTimerRef.current);
      copiedToastTimerRef.current = setTimeout(() => setCopiedMarkdownToast(false), 2200);
    } catch {
      setAiError({
        message: "Clipboard access was blocked by the browser. Use Print / PDF or copy blocks manually.",
      });
    }
  };

  // Handle autonomously generated notes from topic / question
  const handleTopicGenerated = (result: {
    title: string;
    icon: string;
    coverUrl: string;
    blocks: Block[];
    destination: "current" | "new";
  }) => {
    if (!currentCourse || !currentModule) return;

    if (result.destination === "new") {
      pendingTopicMetaRef.current = null;
      diffTargetRef.current = null;
      pendingNewLessonRef.current = {
        courseId: currentCourse.id,
        moduleId: currentModule.id,
        moduleIdx: currentModuleIdx,
        title: result.title,
        icon: result.icon,
        coverUrl: result.coverUrl,
      };
      setDiffOriginal([]);
      setDiffProposed(result.blocks);
      setDiffSummary(`AI Draft (new page): "${result.title}" — review blocks before creating this page.`);
    } else {
      if (!currentLesson) return;
      pendingNewLessonRef.current = null;
      const isFreshOrUntitled =
        !hasCurrentLessonContent &&
        (!currentLesson.title ||
          currentLesson.title === "Untitled Page" ||
          currentLesson.title === "New Page");
      pendingTopicMetaRef.current = isFreshOrUntitled
        ? {
            courseId: currentCourse.id,
            lessonId: currentLesson.id,
            title: result.title,
            icon: result.icon,
            coverUrl: result.coverUrl,
          }
        : null;
      diffTargetRef.current = { courseId: currentCourse.id, lessonId: currentLesson.id };
      setDiffOriginal(currentBlocks);
      setDiffProposed(result.blocks);
      setDiffSummary(`AI Draft: "${result.title}" — review blocks before applying to this page.`);
    }
  };

  const normalizeAndValidateHttpUrl = (
    raw: string
  ): { ok: true; value: string } | { ok: false; error: string } => {
    const trimmed = raw.trim();
    if (!trimmed) return { ok: true, value: "" };
    if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
      return { ok: false, error: "Only http:// or https:// URLs are allowed." };
    }
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(candidate);
      if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname.includes(".")) {
        return { ok: false, error: "Enter a valid web address (e.g. https://youtube.com/...)." };
      }
      return { ok: true, value: parsed.toString() };
    } catch {
      return { ok: false, error: "Enter a valid web address (e.g. https://youtube.com/...)." };
    }
  };

  // Attach / Update Lesson URL
  const handleSaveLessonUrl = (url: string) => {
    if (!currentCourse || !currentLesson) return;
    const checked = normalizeAndValidateHttpUrl(url);
    if (!checked.ok) {
      setUrlError(checked.error);
      return;
    }
    const trimmed = checked.value;
    setUrlError(null);
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

  const hasCurrentLessonContent =
    wordCount > 0 ||
    currentBlocks.length > 1 ||
    (currentBlocks.length === 1 &&
      Boolean((currentBlocks[0] as any).text?.trim() || currentBlocks[0].type !== "paragraph"));

  const activeAiTaskLabel = isTidying
    ? "Tidying notes into clean structured blocks…"
    : isQuizzing
    ? "Generating active-recall quiz questions…"
    : isExplaining
    ? "Analyzing passage for deep-dive explanation…"
    : isAnalyzingGaps
    ? "Analyzing transcript against your notes…"
    : null;

  const renderAiErrorBanner = () =>
    aiError ? (
      <div
        role="alert"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "9px 12px",
          background: tokens.isDark ? "rgba(239, 68, 68, 0.18)" : "#FFF1F2",
          border: `2px solid ${tokens.dangerText}`,
          color: tokens.isDark ? "#FECACA" : "#991B1B",
          fontFamily: "var(--mono, monospace)",
          fontSize: "10px",
          fontWeight: 700,
        }}
      >
        <span>{aiError.message}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {aiError.retry && (
            <button
              type="button"
              onClick={() => aiError.retry?.()}
              style={{
                border: "1.5px solid #B91C1C",
                background: "#B91C1C",
                color: "#FFFFFF",
                padding: "4px 9px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "9.5px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              RETRY
            </button>
          )}
          <button
            type="button"
            onClick={() => setAiError(null)}
            style={{
              border: "1.5px solid currentColor",
              background: "transparent",
              color: "inherit",
              padding: "4px 8px",
              fontFamily: "var(--mono, monospace)",
              fontSize: "9.5px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            DISMISS
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div
      className="page-scroll nb-scope"
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
          className="nb-topbar no-print"
          style={{
            borderBottom: `3px solid ${tokens.borderPrimary}`,
            background: tokens.canvasBg,
          }}
        >
          <div className="nb-topbar-track">
            {view === "course" && (isMobile || sidebarCollapsed) && (
              <button
                type="button"
                className="nb-touch-target"
                onClick={() => {
                  if (isMobile) setMobileSidebarOpen(true);
                  else setSidebarCollapsed(false);
                }}
                aria-label="Open lesson outline"
                title="Open lesson outline (Cmd+\\)"
                style={{
                  background: "transparent",
                  border: `2px solid ${tokens.borderPrimary}`,
                  color: "inherit",
                  cursor: "pointer",
                  padding: "4px 8px",
                  fontSize: "13px",
                  lineHeight: 1,
                  flex: "none",
                  borderRadius: "2px",
                }}
              >
                ☰
              </button>
            )}
            <button
              type="button"
              className="nb-touch-target"
              onClick={() => setView("index")}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                color: "inherit",
                font: "inherit",
                letterSpacing: "inherit",
                cursor: "pointer",
                opacity: view === "index" ? 1 : 0.72,
                flex: "none",
              }}
            >
              NOTEBOOKS
            </button>
            {view === "course" && (
              <>
                <span style={{ opacity: 0.5, flex: "none" }}>/</span>
                <span
                  className="nb-breadcrumb-title"
                  style={{ color: tokens.textPrimary }}
                >
                  {currentCourse?.title.toUpperCase()}
                </span>

                {/* Dynamic Hierarchical Subpage Breadcrumbs */}
                {lessonAncestors.map((anc, ancIdx) => {
                  const isLast = ancIdx === lessonAncestors.length - 1;
                  return (
                    <React.Fragment key={anc.id}>
                      <span style={{ opacity: 0.5, flex: "none" }}>/</span>
                      {isLast ? (
                        <span
                          className="nb-breadcrumb-title"
                          style={{ opacity: 1, fontWeight: 800 }}
                          title={anc.title}
                        >
                          {anc.icon ? `${anc.icon} ` : ""}{anc.title}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigateToLesson(anc.id)}
                          className="nb-breadcrumb-title nb-touch-target"
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            color: "inherit",
                            font: "inherit",
                            cursor: "pointer",
                            opacity: 0.78,
                            fontWeight: 600,
                            textDecoration: "underline",
                            textUnderlineOffset: "2px",
                          }}
                          title={anc.title}
                        >
                          {anc.icon ? `${anc.icon} ` : ""}{anc.title}
                        </button>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </div>

          {/* Quick Jump / Switcher Button (Cmd + K) */}
          <button
            type="button"
            className="nb-touch-target"
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
              padding: "4px 8px",
              cursor: "pointer",
              boxShadow: tokens.isDark ? "2px 2px 0 rgba(0,0,0,0.6)" : "2px 2px 0 #0A0A0A",
              flex: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = tokens.popoverHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = tokens.cardBg)}
          >
            <Search size={11} />
            <span className="nb-text-hide-mobile">QUICK JUMP</span>
            <span className="nb-text-hide-mobile" style={{ opacity: 0.65, fontSize: "8.5px" }}>⌘K</span>
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

          {/* Compact Appearance Popover (Theme + Typography) */}
          <div ref={appearanceMenuRef} style={{ position: "relative", flex: "none" }}>
            <button
              type="button"
              className="nb-touch-target"
              onClick={() => {
                playSound.click();
                setShowAppearanceMenu((prev) => !prev);
                setShowHelpMenu(false);
              }}
              aria-expanded={showAppearanceMenu}
              title="Paper theme & typography"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                border: `2px solid ${tokens.borderPrimary}`,
                background: showAppearanceMenu ? "#FCE94F" : tokens.cardBg,
                color: showAppearanceMenu ? "#0A0A0A" : tokens.textPrimary,
                padding: "4px 8px",
                cursor: "pointer",
                boxShadow: tokens.isDark ? "2px 2px 0 rgba(0,0,0,0.6)" : "2px 2px 0 #0A0A0A",
              }}
            >
              <span>Aa</span>
              <span className="nb-text-hide-mobile">· {paperTheme.toUpperCase()}</span>
              <ChevronDown size={10} />
            </button>

            {showAppearanceMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 300,
                  width: "240px",
                  background: tokens.popoverBg,
                  color: tokens.textPrimary,
                  border: `2px solid ${tokens.borderPrimary}`,
                  boxShadow: tokens.popoverShadow,
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "8.5px",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      color: tokens.textMuted,
                      marginBottom: "6px",
                    }}
                  >
                    PAPER THEME
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    {[
                      { id: "cream" as NotebookTheme, label: "CREAM", emoji: "📜" },
                      { id: "matcha" as NotebookTheme, label: "MATCHA", emoji: "🍵" },
                      { id: "ink" as NotebookTheme, label: "INK", emoji: "🖋️" },
                      { id: "midnight" as NotebookTheme, label: "MIDNIGHT", emoji: "🌌" },
                    ].map((th) => {
                      const isActive = paperTheme === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => handleToggleTheme(th.id)}
                          style={{
                            fontFamily: "var(--mono, monospace)",
                            fontSize: "9px",
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            border: `1.5px solid ${tokens.borderPrimary}`,
                            background: isActive ? "#FCE94F" : tokens.sidebarBg,
                            color: isActive ? "#0A0A0A" : tokens.textPrimary,
                            padding: "6px 8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <span>{th.emoji}</span>
                          <span>{th.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "8.5px",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      color: tokens.textMuted,
                      marginBottom: "6px",
                    }}
                  >
                    TYPOGRAPHY
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                    {(["sans", "serif", "mono"] as TypographyStyle[]).map((fId) => {
                      const fontObj = TYPOGRAPHY_FONTS[fId];
                      const isActive = typography === fId;
                      return (
                        <button
                          key={fId}
                          type="button"
                          onClick={() => handleToggleTypography(fId)}
                          style={{
                            fontFamily: fontObj.fontStack,
                            fontSize: "9px",
                            fontWeight: 800,
                            border: `1.5px solid ${tokens.borderPrimary}`,
                            background: isActive ? "#FCE94F" : tokens.sidebarBg,
                            color: isActive ? "#0A0A0A" : tokens.textPrimary,
                            padding: "6px 4px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "2px",
                          }}
                        >
                          <span style={{ fontSize: "11px" }}>{fontObj.glyph}</span>
                          <span>{fontObj.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts & Syntax Help Popover (?) */}
          <div ref={helpMenuRef} style={{ position: "relative", flex: "none" }}>
            <button
              type="button"
              className="nb-touch-target"
              onClick={() => {
                playSound.click();
                setShowHelpMenu((prev) => !prev);
                setShowAppearanceMenu(false);
              }}
              aria-expanded={showHelpMenu}
              aria-label="Keyboard shortcuts and slash syntax help"
              title="Shortcuts & markdown syntax (?)"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${tokens.borderPrimary}`,
                background: showHelpMenu ? "#FCE94F" : tokens.cardBg,
                color: showHelpMenu ? "#0A0A0A" : tokens.textPrimary,
                padding: "4px 7px",
                cursor: "pointer",
                boxShadow: tokens.isDark ? "2px 2px 0 rgba(0,0,0,0.6)" : "2px 2px 0 #0A0A0A",
              }}
            >
              <HelpCircle size={13} />
            </button>

            {showHelpMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 300,
                  width: "280px",
                  background: tokens.popoverBg,
                  color: tokens.textPrimary,
                  border: `2px solid ${tokens.borderPrimary}`,
                  boxShadow: tokens.popoverShadow,
                  padding: "14px",
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "9.5px",
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    borderBottom: `1.5px solid ${tokens.borderSubtle}`,
                    paddingBottom: "6px",
                    marginBottom: "8px",
                  }}
                >
                  SHORTCUTS & EDITOR SYNTAX
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: tokens.textSecondary }}>Quick jump</span>
                    <strong>⌘K / Ctrl+K</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: tokens.textSecondary }}>Toggle sidebar</span>
                    <strong>⌘\ / Ctrl+\</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: tokens.textSecondary }}>Zen Focus Mode</span>
                    <strong>⌘⇧F / Esc</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: tokens.textSecondary }}>Insert block</span>
                    <strong>/</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: tokens.textSecondary }}>Headings / Quote</span>
                    <strong># · ## · &gt;</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: tokens.textSecondary }}>Checklist / Code</span>
                    <strong>[ ] · ```</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ 1. INDEX VIEW ══════════ */}
      {view === "index" && (
        <div style={{ maxWidth: "1180px", width: "100%", margin: "0 auto", padding: "34px clamp(16px, 3vw, 30px) 110px" }}>
          {aiError && (
            <div className="no-print" style={{ marginBottom: "18px" }}>
              {renderAiErrorBanner()}
            </div>
          )}
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
                  color: tokens.textMuted,
                  marginTop: "9px",
                }}
              >
                {isInitialLoading && courses.length === 0
                  ? "LOADING NOTEBOOKS…"
                  : `${courses.length} COURSES · ${courses.flatMap((c) => c.modules.flatMap((m) => m.lessons)).length} LESSONS`}
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
                aria-label="Deep search across all notes"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder="Deep search across all notes, blocks, code snippets, and callouts…"
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  fontFamily: "var(--body, 'Space Grotesk', sans-serif)",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: tokens.textPrimary,
                }}
              />
              {globalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGlobalSearchQuery("")}
                  style={{
                    border: "none",
                    background: tokens.textPrimary,
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
                {globalSearchResults.length > MAX_SEARCH_RESULTS
                  ? ` · SHOWING TOP ${MAX_SEARCH_RESULTS}`
                  : ""}
              </div>

              {globalSearchResults.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    border: `2px dashed ${tokens.borderSubtle}`,
                    textAlign: "center",
                    fontFamily: "var(--mono, monospace)",
                    fontSize: "11px",
                    color: tokens.textMuted,
                  }}
                >
                  NO NOTES FOUND MATCHING &quot;{globalSearchQuery}&quot;
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
                  {globalSearchResults.slice(0, MAX_SEARCH_RESULTS).map((res, rIdx) => (
                    <div
                      key={`${res.courseIdx}-${res.moduleIdx}-${res.lessonIdx}-${rIdx}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        playSound.click();
                        setCurrentCourseIdx(res.courseIdx);
                        setCurrentModuleIdx(res.moduleIdx);
                        setCurrentLessonIdx(res.lessonIdx);
                        setView("course");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          playSound.click();
                          setCurrentCourseIdx(res.courseIdx);
                          setCurrentModuleIdx(res.moduleIdx);
                          setCurrentLessonIdx(res.lessonIdx);
                          setView("course");
                        }
                      }}
                      style={{
                        border: `3px solid ${tokens.borderPrimary}`,
                        background: tokens.cardBg,
                        boxShadow: tokens.boxShadow,
                        padding: "16px",
                        cursor: "pointer",
                        color: tokens.textPrimary,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        minWidth: 0,
                        transition: "transform 0.1s ease, box-shadow 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translate(-2px, -2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        {/* Course & Match Type Badges */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                          <span
                            style={{
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "8.5px",
                              fontWeight: 700,
                              background: res.courseAccent,
                              color: res.courseAccentFg,
                              padding: "2px 6px",
                              border: `1px solid ${tokens.borderPrimary}`,
                              maxWidth: "100%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {res.courseTitle.toUpperCase()}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "8.5px",
                              fontWeight: 700,
                              background: tokens.sidebarBg,
                              color: tokens.textPrimary,
                              padding: "2px 5px",
                            }}
                          >
                            {res.matchType}
                          </span>
                        </div>

                        {/* Title & Module */}
                        <h4 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, overflowWrap: "anywhere" }}>
                          {res.lessonTitle}
                        </h4>
                        <div style={{ fontFamily: "var(--mono, monospace)", fontSize: "9px", color: tokens.textMuted, marginBottom: "10px", overflowWrap: "anywhere" }}>
                          {res.moduleTitle}
                        </div>

                        {/* Snippet */}
                        <div
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.4,
                            background: tokens.sidebarBg,
                            color: tokens.textPrimary,
                            border: `1px solid ${tokens.borderSubtle}`,
                            padding: "8px 10px",
                            fontFamily: "var(--body, sans-serif)",
                            fontStyle: "italic",
                            overflowWrap: "anywhere",
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
                          color: tokens.textSecondary,
                        }}
                      >
                        <span>{res.wordCount} WORDS</span>
                        <span style={{ color: tokens.textPrimary, fontWeight: 800 }}>OPEN NOTE →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : isInitialLoading && courses.length === 0 ? (
            /* Initial DB Hydration Skeleton */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "24px",
                marginBottom: "40px",
              }}
            >
              {[0, 1, 2].map((skeletonIdx) => (
                <div
                  key={skeletonIdx}
                  style={{
                    border: `3px solid ${tokens.borderSubtle}`,
                    background: tokens.sidebarBg,
                    minHeight: "250px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    opacity: 0.75,
                  }}
                >
                  <div>
                    <div style={{ width: "42%", height: "14px", background: tokens.borderSubtle, marginBottom: "14px" }} />
                    <div style={{ width: "80%", height: "26px", background: tokens.borderSubtle, marginBottom: "8px" }} />
                    <div style={{ width: "55%", height: "14px", background: tokens.borderSubtle }} />
                  </div>
                  <div style={{ width: "65%", height: "12px", background: tokens.borderSubtle }} />
                </div>
              ))}
            </div>
          ) : (
            /* Courses Grid */
            <div
              style={{
                display: "grid",
                // 340px + the page's clamp(16px, 3vw, 30px) side padding
                // overflows on common ~360px-wide phones (328px available <
                // 340px column minimum). 260px stays comfortably under that
                // even at the narrowest common viewports (~320px).
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
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
              <button
                type="button"
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
              </button>
            </div>
          )}

          {collisions.length > 0 && (
            <CollisionsPanel
              collisions={collisions}
              onSelectSource={handleNavigateToCollision}
            />
          )}
        </div>
      )}

      {/* ══════════ 2. COURSE WORKSPACE VIEW ══════════ */}
      {view === "course" && !currentCourse && !isInitialLoading && (
        <div
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
            padding: "32px 20px",
          }}
        >
          <div
            style={{
              maxWidth: "460px",
              width: "100%",
              background: tokens.cardBg,
              border: `3px solid ${tokens.borderPrimary}`,
              boxShadow: tokens.boxShadow,
              padding: "28px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.15em",
                color: tokens.textMuted,
                marginBottom: "8px",
              }}
            >
              NOTEBOOK UNAVAILABLE
            </div>
            <h2
              style={{
                margin: "0 0 10px",
                fontFamily: "var(--display, sans-serif)",
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              This notebook could not be loaded
            </h2>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: "13px",
                color: tokens.textSecondary,
                lineHeight: 1.5,
              }}
            >
              It may have been removed or relocated. Return to the notebooks library to select another notebook.
            </p>
            <button
              type="button"
              className="nb-touch-target"
              onClick={() => setView("index")}
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                background: "#FCE94F",
                color: "#0A0A0A",
                border: `2px solid ${tokens.borderPrimary}`,
                boxShadow: tokens.boxShadow,
                padding: "9px 16px",
                cursor: "pointer",
              }}
            >
              ← BACK TO NOTEBOOKS
            </button>
          </div>
        </div>
      )}

      {view === "course" && currentCourse && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isFocusMode || (!isMobile && sidebarCollapsed) ? "1fr" : isMobile ? "1fr" : "300px minmax(0, 1fr)",
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
              className="no-print nb-touch-target"
              style={{
                position: "fixed",
                top: "18px",
                right: "24px",
                zIndex: 99999,
                background: tokens.popoverBg,
                color: tokens.textPrimary,
                border: `2px solid ${tokens.borderPrimary}`,
                boxShadow: tokens.boxShadow,
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
                e.currentTarget.style.background = tokens.popoverBg;
                e.currentTarget.style.color = tokens.textPrimary;
              }}
            >
              <Minimize2 size={12} />
              <span>EXIT FOCUS</span>
              <span style={{ color: tokens.textMuted, fontSize: "8.5px" }}>ESC</span>
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
                // Matches the app-wide mobile drawer backdrop convention
                // (.sidebar-backdrop, z-index: 110) — the persistent
                // .app-header sits at z-index: 100, so anything lower gets
                // drawn over by the header instead of covering it.
                zIndex: 110,
              }}
            />
          )}

          {/* Outline Sidebar — a normal grid column on desktop, a sliding
              off-canvas drawer on mobile (closes itself after a selection,
              same as any mobile nav drawer). */}
          {!isFocusMode && (isMobile || !sidebarCollapsed) && (
            <div
              ref={mobileDrawerRef}
              className="no-print"
              role={isMobile && mobileSidebarOpen ? "dialog" : undefined}
              aria-modal={isMobile && mobileSidebarOpen ? true : undefined}
              aria-label={isMobile ? "Course outline drawer" : undefined}
              aria-hidden={isMobile && !mobileSidebarOpen ? true : undefined}
              style={
                isMobile
                  ? {
                      position: "fixed",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: "min(300px, 85vw)",
                      // Matches the app-wide mobile drawer convention (.side,
                      // z-index: 120) so this drawer draws above the
                      // persistent .app-header (z-index: 100) instead of
                      // having its own top content hidden behind it.
                      zIndex: 120,
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
                onClose={() => {
                  if (isMobile) setMobileSidebarOpen(false);
                  else setSidebarCollapsed(true);
                }}
                onCreateSubpage={(parentLessonId) => handleCreateSubpage(parentLessonId)}
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
                onToggleModuleWatched={handleToggleModuleWatched}
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
              if (!currentLesson) return;
              const items = e.clipboardData?.items;
              if (items) {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.startsWith("image/")) {
                    const file = items[i].getAsFile();
                    if (file) {
                      e.preventDefault();
                      const targetIdx = getTargetBlockIdxFromEvent(e.target);
                      const caption = `PASTED IMAGE · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                      insertImageFileIntoBlocks(file, targetIdx, caption);
                      return;
                    }
                  }
                }
              }

              if (currentBlocks.length === 0) {
                const text = e.clipboardData?.getData("text");
                if (text && isHtmlContent(text)) {
                  e.preventDefault();
                  const htmlBlock: Block = {
                    id: generateBlockId(),
                    type: "html",
                    html: text.trim(),
                    title: extractHtmlTitle(text) || "HTML Document",
                    viewMode: "preview",
                    viewport: "responsive",
                  };
                  handleUpdateBlocks([htmlBlock]);
                  playSound.fileIt();
                  return;
                }
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              if (!currentLesson) return;
              const files = e.dataTransfer?.files;
              if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith("image/")) {
                  e.preventDefault();
                  const targetIdx = getTargetBlockIdxFromEvent(e.target);
                  insertImageFileIntoBlocks(file, targetIdx, file.name || "DROPPED IMAGE");
                }
              }
            }}
            className="nb-main-scroll"
          >
            {/* Copied to Clipboard Notification Toast */}
            {copiedMarkdownToast && (
              <div
                role="status"
                aria-live="polite"
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
                minWidth: 0,
              }}
            >
              {currentLesson && currentModule ? (
                <>
                  {/* Page Hero Cover Artwork & Custom Emoji Badge */}
                  <PageCoverBanner
                    coverUrl={currentLesson.coverUrl}
                    icon={currentLesson.icon}
                    theme={paperTheme}
                    onChangeCover={handleUpdateCurrentLessonCover}
                    onChangeIcon={handleUpdateCurrentLessonIcon}
                  />

                  {/* Docked Interactive Media Player & Resource Banner */}
                  {currentLesson.lessonUrl && (
                    <PageEmbeddedMedia
                      lessonUrl={currentLesson.lessonUrl}
                      onEditUrl={() => {
                        setUrlDraft(currentLesson.lessonUrl || "");
                        setUrlError(null);
                        setShowUrlModal(true);
                      }}
                      onRemoveUrl={() => handleSaveLessonUrl("")}
                      onInsertIntoNotes={(url, title) => {
                        const embedBlock: Block = {
                          id: generateBlockId(),
                          type: "embed",
                          url,
                          title,
                        };
                        handleUpdateBlocks([...currentBlocks, embedBlock]);
                      }}
                      theme={paperTheme}
                    />
                  )}

                  {/* Breadcrumb & Navigation */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        color: tokens.textMuted,
                        minWidth: 0,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {currentCourse.title.toUpperCase()} · {currentModule.title.split(" · ")[0]} · PAGE{" "}
                      {currentLessonIdx + 1}
                    </div>

                    {/* Source Lecture Link Badge */}
                    {currentLesson.lessonUrl ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isSafeHttpUrl(currentLesson.lessonUrl) ? (
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
                              border: `1.5px solid ${tokens.borderSubtle}`,
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
                        ) : (
                          <span
                            title="Invalid URL protocol"
                            style={{
                              fontFamily: "var(--mono, monospace)",
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "2px 7px",
                              border: `1.5px solid ${tokens.dangerText}`,
                              color: tokens.dangerText,
                            }}
                          >
                            INVALID SOURCE URL
                          </span>
                        )}
                        <button
                          type="button"
                          className="nb-touch-target"
                          onClick={() => {
                            setUrlDraft(currentLesson.lessonUrl || "");
                            setUrlError(null);
                            setShowUrlModal(true);
                          }}
                          aria-label="Edit source URL"
                          title="Edit source URL"
                          style={{
                            border: "none",
                            background: "transparent",
                            color: tokens.textMuted,
                            cursor: "pointer",
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
                          setUrlError(null);
                          setShowUrlModal(true);
                        }}
                        style={{
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "8.5px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          border: `1px dashed ${tokens.borderSubtle}`,
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
                    <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        autoFocus
                        aria-label="Rename lesson page title"
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameLesson(titleDraft);
                          if (e.key === "Escape") {
                            e.stopPropagation();
                            setIsEditingTitle(false);
                          }
                        }}
                        style={{
                          flex: 1,
                          minWidth: "200px",
                          fontFamily: "var(--display, sans-serif)",
                          fontWeight: 800,
                          fontSize: "clamp(24px, 4.5vw, 44px)",
                          lineHeight: 1.05,
                          letterSpacing: "-0.05em",
                          border: `3px solid ${tokens.borderPrimary}`,
                          background: tokens.cardBg,
                          color: tokens.textPrimary,
                          padding: "6px 12px",
                        }}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleRenameLesson(titleDraft)}
                        style={{
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "10px",
                          fontWeight: 700,
                          border: `2px solid ${tokens.borderPrimary}`,
                          background: "#B8F04A",
                          color: "#0A0A0A",
                          padding: "10px 14px",
                          cursor: "pointer",
                        }}
                      >
                        SAVE
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setIsEditingTitle(false)}
                        style={{
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "10px",
                          fontWeight: 700,
                          border: `2px solid ${tokens.borderPrimary}`,
                          background: tokens.cardBg,
                          color: tokens.textPrimary,
                          padding: "10px 12px",
                          cursor: "pointer",
                        }}
                      >
                        CANCEL
                      </button>
                    </div>
                  ) : (
                    <div
                      className="nb-reveal-parent"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "6px",
                        minWidth: 0,
                      }}
                    >
                      <h1
                        className="nb-page-title"
                        onDoubleClick={() => {
                          setTitleDraft(currentLesson.title);
                          setIsEditingTitle(true);
                        }}
                      >
                        {currentLesson.title}
                      </h1>
                      <button
                        type="button"
                        className="nb-touch-always-visible nb-touch-target"
                        aria-label={`Rename page: ${currentLesson.title}`}
                        title="Rename page title"
                        onClick={() => {
                          setTitleDraft(currentLesson.title);
                          setIsEditingTitle(true);
                        }}
                        style={{
                          background: "transparent",
                          border: "1.5px solid transparent",
                          color: tokens.textMuted,
                          padding: "6px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          opacity: 0.65,
                          transition: "opacity 0.15s ease",
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  )}

              {/* Active AI Progress Indicator / Inline Dismissible Error Banner */}
              {(activeAiTaskLabel || aiError) && (
                <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                  {activeAiTaskLabel && (
                    <div
                      role="status"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        background: tokens.isDark ? "rgba(252, 233, 79, 0.14)" : "#FEF9C3",
                        border: `2px solid ${tokens.borderPrimary}`,
                        color: tokens.isDark ? "#FCE94F" : "#0A0A0A",
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10px",
                        fontWeight: 700,
                      }}
                    >
                      <Sparkles size={13} />
                      <span>{activeAiTaskLabel}</span>
                    </div>
                  )}

                  {renderAiErrorBanner()}
                </div>
              )}

              {/* Meta Row & Productivity Action Buttons */}
              <div
                className="nb-meta-bar"
                style={{
                  borderBottom: isInk ? "1.5px solid rgba(255,255,255,0.12)" : "1.5px solid rgba(10,10,10,0.1)",
                }}
              >
                {/* Stats indicators */}
                <div className="nb-meta-stats" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", color: tokens.textMuted }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={11} />
                    ~{Math.max(1, Math.ceil(wordCount / 200))} MIN READ
                  </span>
                  <span>·</span>
                  <span>{wordCount.toLocaleString()} WORDS</span>
                  <span>·</span>
                  <span>{currentBlocks.length} BLOCKS</span>
                  <span>·</span>
                  <button
                    type="button"
                    className="nb-touch-target"
                    aria-pressed={Boolean(currentLesson.watched)}
                    onClick={() => {
                      playSound.pop();
                      handleToggleWatched(currentModuleIdx, currentLessonIdx);
                    }}
                    title="Toggle lesson watched status"
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "9px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      padding: "3px 8px",
                      border: `1.5px solid ${tokens.borderPrimary}`,
                      background: currentLesson.watched
                        ? lessonState({ wordCount }) === "written"
                          ? "#B8F04A"
                          : "#FF2D8A"
                        : tokens.cardBg,
                      color: currentLesson.watched ? "#0A0A0A" : tokens.textPrimary,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {lessonState({ wordCount }) === "written"
                      ? currentLesson.watched
                        ? "✓ WRITTEN & WATCHED"
                        : "✓ WRITTEN · MARK WATCHED"
                      : currentLesson.watched
                      ? "● WATCHED · UNWRITTEN"
                      : "○ MARK WATCHED"}
                  </button>
                </div>

                {/* Clean Unified Action Controls */}
                <div className="nb-meta-actions no-print" style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                  {/* AI Actions Dropdown Pill */}
                  <div ref={aiMenuRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="nb-touch-target"
                      aria-expanded={showAiMenu}
                      aria-haspopup="menu"
                      onClick={() => {
                        playSound.click();
                        setShowAiMenu(!showAiMenu);
                        setShowPageMoreMenu(false);
                      }}
                      style={{
                        border: isInk ? `1.5px solid ${tokens.borderPrimary}` : "1.5px solid #0A0A0A",
                        background: isInk ? "#242A38" : "#5B3FD9",
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
                        role="menu"
                        aria-label="AI study tools"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          left: isMobile ? 0 : "auto",
                          right: isMobile ? "auto" : 0,
                          maxWidth: "calc(100vw - 24px)",
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
                          role="menuitem"
                          onClick={() => {
                            setShowAiMenu(false);
                            setTopicModalInitialQuery(currentLesson?.title && currentLesson.title !== "Untitled Page" ? currentLesson.title : "");
                            setShowTopicModal(true);
                          }}
                          style={{
                            padding: "8px 14px",
                            background: "transparent",
                            border: "none",
                            borderBottom: `1px solid ${tokens.borderSubtle}`,
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
                          <Sparkles size={12} color="#10B981" />
                          <span>DRAFT FROM QUESTION / TOPIC</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
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
                          role="menuitem"
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
                          role="menuitem"
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
                          role="menuitem"
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
                    className="nb-touch-target"
                    onClick={() => {
                      playSound.click();
                      setIsFocusMode(!isFocusMode);
                    }}
                    title="Toggle Zen Focus Mode (ESC to exit)"
                    style={{
                      border: `1.5px solid ${tokens.borderPrimary}`,
                      background: isFocusMode ? tokens.accentColor : "transparent",
                      color: isFocusMode ? tokens.accentFg : tokens.textPrimary,
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
                      if (!isFocusMode) {
                        e.currentTarget.style.background = tokens.accentColor;
                        e.currentTarget.style.color = tokens.accentFg;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isFocusMode) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = tokens.textPrimary;
                      }
                    }}
                  >
                    <Maximize2 size={11} />
                    FOCUS
                  </button>

                  {/* Flashcards Button */}
                  <button
                    type="button"
                    className="nb-touch-target"
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
                      className="nb-touch-target"
                      aria-label="More page actions"
                      aria-expanded={showPageMoreMenu}
                      aria-haspopup="menu"
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
                        role="menu"
                        aria-label="More page actions"
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
                          role="menuitem"
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
                          role="menuitem"
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
                          role="menuitem"
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
                            role="menuitem"
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
                          role="menuitem"
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
                          role="menuitem"
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
                            role="menuitem"
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
                              color: tokens.textSecondary,
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
                          role="menuitem"
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
                            color: tokens.dangerText,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#B91C1C";
                            e.currentTarget.style.color = "#FFFFFF";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = tokens.dangerText;
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
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            const el = document.getElementById(h.id);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              const el = document.getElementById(h.id);
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
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
                            minWidth: 0,
                            overflowWrap: "anywhere",
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
                  theme={paperTheme}
                  onStartWriting={() => {
                    handleUpdateBlocks([
                      { id: generateBlockId(), type: "paragraph", text: "" },
                    ]);
                  }}
                  onPasteTranscript={() => setShowTranscriptModal(true)}
                  onDraftFromTopic={() => {
                    setTopicModalInitialQuery(currentLesson?.title && currentLesson.title !== "Untitled Page" ? currentLesson.title : "");
                    setShowTopicModal(true);
                  }}
                  onCreateSubpage={() => handleCreateSubpage(currentLesson?.id)}
                />
              ) : (
                <BlockEditor
                  key={currentLesson.id}
                  blocks={currentBlocks}
                  onChange={handleUpdateBlocks}
                  onExplain={handleExplainWithSelection}
                  onCreateSubpage={(targetIdx) => handleCreateSubpage(currentLesson.id, targetIdx)}
                  onNavigateToLesson={navigateToLesson}
                  accentColor={currentCourse.accent}
                  theme={paperTheme}
                />
              )}

              {/* Nested Subpages Directory Gallery Grid */}
              {currentLesson && currentModule && (
                <SubpagesDirectory
                  subpages={getDirectChildLessons(currentModule.lessons, currentLesson.id)}
                  onSelectSubpage={navigateToLesson}
                  onCreateSubpage={() => handleCreateSubpage(currentLesson.id)}
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
                </>
              ) : (
                <div
                  style={{
                    border: `3px solid ${tokens.borderPrimary}`,
                    background: tokens.cardBg,
                    boxShadow: tokens.boxShadow,
                    padding: "36px 28px",
                    textAlign: "center",
                    marginTop: "24px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--mono, monospace)",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.15em",
                      color: tokens.textMuted,
                      marginBottom: "8px",
                    }}
                  >
                    {currentModule ? currentModule.title.toUpperCase() : currentCourse.title.toUpperCase()}
                  </div>
                  <h2
                    style={{
                      margin: "0 0 10px",
                      fontFamily: "var(--display, sans-serif)",
                      fontSize: "24px",
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {currentModule ? "No pages in this section yet" : "No sections in this notebook yet"}
                  </h2>
                  <p
                    style={{
                      margin: "0 0 22px",
                      fontSize: "13.5px",
                      color: tokens.textSecondary,
                      lineHeight: 1.5,
                    }}
                  >
                    {currentModule
                      ? "Create a new page to start capturing structured notes, code snippets, or embeds in this section."
                      : "Add a module section first, then create lesson pages inside it."}
                  </p>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                    {currentModule ? (
                      <button
                        type="button"
                        onClick={() => {
                          playSound.click();
                          setAddPageContext({ modIdx: currentModuleIdx });
                          setShowAddPageModal(true);
                        }}
                        style={{
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "10px",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          background: "#B8F04A",
                          color: "#0A0A0A",
                          border: `2px solid ${tokens.borderPrimary}`,
                          boxShadow: tokens.boxShadow,
                          padding: "9px 16px",
                          cursor: "pointer",
                        }}
                      >
                        ＋ ADD LESSON PAGE
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          playSound.click();
                          setShowAddModuleModal(true);
                        }}
                        style={{
                          fontFamily: "var(--mono, monospace)",
                          fontSize: "10px",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          background: "#FCE94F",
                          color: "#0A0A0A",
                          border: `2px solid ${tokens.borderPrimary}`,
                          boxShadow: tokens.boxShadow,
                          padding: "9px 16px",
                          cursor: "pointer",
                        }}
                      >
                        ＋ ADD MODULE
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setView("index")}
                      style={{
                        fontFamily: "var(--mono, monospace)",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        background: "transparent",
                        color: tokens.textPrimary,
                        border: `2px solid ${tokens.borderPrimary}`,
                        padding: "9px 14px",
                        cursor: "pointer",
                      }}
                    >
                      ← BACK TO NOTEBOOKS
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* ══════════ AI MODALS & SHEETS ══════════ */}
      {/* 1. DiffSheet (Tidy My Notes) */}
      {diffOriginal && diffProposed && (() => {
        const applyAcceptedDiff = (nextBlocks: Block[]) => {
          const pendingNew = pendingNewLessonRef.current;
          const target = diffTargetRef.current;
          const pendingMeta = pendingTopicMetaRef.current;
          if (pendingNew) {
            const newLessonId = generateBlockId();
            const wc = computeWordCount(nextBlocks);
            const newLesson: SeedCourseLesson = {
              id: newLessonId,
              title: pendingNew.title,
              icon: pendingNew.icon,
              coverUrl: pendingNew.coverUrl,
              blocks: nextBlocks,
              watched: false,
              meta: `${wc.toLocaleString()} WORDS · AI DRAFT`,
            };
            const targetCourse = coursesRef.current.find((c) => isSameId(c.id, pendingNew.courseId));
            const targetMod = targetCourse?.modules[pendingNew.moduleIdx];
            const nextLessonIndex = targetMod ? targetMod.lessons.length : 0;

            setCourses((prev) => {
              const next = prev.map((c) =>
                isSameId(c.id, pendingNew.courseId)
                  ? {
                      ...c,
                      modules: c.modules.map((m, mIdx) =>
                        mIdx === pendingNew.moduleIdx
                          ? { ...m, lessons: [...m.lessons, newLesson] }
                          : m
                      ),
                    }
                  : c
              );
              saveStoredCourses(next);
              return next;
            });
            setCurrentModuleIdx(pendingNew.moduleIdx);
            setCurrentLessonIdx(nextLessonIndex);
            createLessonInDbApi(pendingNew.moduleId, pendingNew.title, nextBlocks, undefined, {
              id: newLessonId,
              coverUrl: pendingNew.coverUrl,
              icon: pendingNew.icon,
            });
          } else if (target) {
            handleApplyBlocksForLesson(target.courseId, target.lessonId, nextBlocks);
            if (pendingMeta && isSameId(pendingMeta.lessonId, target.lessonId)) {
              setCourses((prev) => {
                const next = prev.map((c) =>
                  isSameId(c.id, target.courseId)
                    ? {
                        ...c,
                        modules: c.modules.map((m) => ({
                          ...m,
                          lessons: m.lessons.map((l) =>
                            isSameId(l.id, target.lessonId)
                              ? {
                                  ...l,
                                  title: pendingMeta.title,
                                  icon: pendingMeta.icon,
                                  coverUrl: pendingMeta.coverUrl,
                                }
                              : l
                          ),
                        })),
                      }
                    : c
                );
                saveStoredCourses(next);
                return next;
              });
              updateLessonInDbApi(target.lessonId, {
                title: pendingMeta.title,
                coverUrl: pendingMeta.coverUrl,
                icon: pendingMeta.icon,
              });
            }
          } else {
            handleUpdateBlocks(nextBlocks);
          }
          pendingNewLessonRef.current = null;
          pendingTopicMetaRef.current = null;
          diffTargetRef.current = null;
          setDiffOriginal(null);
          setDiffProposed(null);
        };

        return (
          <DiffSheet
            originalBlocks={diffOriginal}
            proposedBlocks={diffProposed}
            summaryOfChanges={diffSummary}
            onApplyAll={() => applyAcceptedDiff(diffProposed)}
            onApplySelected={applyAcceptedDiff}
            onDiscard={() => {
              pendingNewLessonRef.current = null;
              pendingTopicMetaRef.current = null;
              diffTargetRef.current = null;
              setDiffOriginal(null);
              setDiffProposed(null);
            }}
            accentColor={currentCourse?.accent}
            theme={paperTheme}
          />
        );
      })()}

      {/* 2. Quiz Modal */}
      {quizQuestions !== null && (
        <QuizModal
          questions={quizQuestions}
          notEnough={quizNotEnough}
          explanation={quizExplanation}
          onClose={() => setQuizQuestions(null)}
          theme={paperTheme}
        />
      )}

      {/* 3. Explain Side Panel */}
      {explainSelection !== null && (
        <ExplainModal
          selection={explainSelection}
          explanation={explainText}
          error={explainError}
          loading={isExplaining}
          onRetry={
            explainSelection ? () => handleExplainWithSelection(explainSelection) : undefined
          }
          onAddAsToggle={(toggleBlock) => {
            const target =
              explainTargetRef.current ||
              (currentCourse && currentLesson
                ? { courseId: currentCourse.id, lessonId: currentLesson.id }
                : null);
            if (!target) return;
            const latestLesson = coursesRef.current
              .find((c) => isSameId(c.id, target.courseId))
              ?.modules.flatMap((m) => m.lessons)
              .find((l) => isSameId(l.id, target.lessonId));
            const baseBlocks =
              latestLesson?.blocks ||
              (target.lessonId === currentLesson?.id ? currentBlocks : []);
            handleApplyBlocksForLesson(target.courseId, target.lessonId, [
              ...baseBlocks,
              toggleBlock,
            ]);
          }}
          onClose={() => {
            explainTargetRef.current = null;
            setExplainSelection(null);
          }}
          theme={paperTheme}
        />
      )}

      {/* 4. Transcript Modal */}
      {showTranscriptModal && (
        <TranscriptModal
          onConvertToNotes={handleConvertToNotes}
          onAnalyzeGaps={handleAnalyzeTranscript}
          onClose={() => setShowTranscriptModal(false)}
          loading={isAnalyzingGaps}
          theme={paperTheme}
        />
      )}

      {/* 5. Add Course Modal Popup */}
      <AddCourseModal
        isOpen={showAddCourseModal}
        onClose={() => setShowAddCourseModal(false)}
        onSubmit={handleCreateCourse}
        theme={paperTheme}
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
        theme={paperTheme}
      />

      {/* 6. Add Page / Lesson Modal Popup */}
      <AddPageModal
        isOpen={showAddPageModal}
        onClose={() => {
          setShowAddPageModal(false);
          setAddPageContext(null);
        }}
        onSubmit={handleCreatePage}
        onOpenAiDraft={(initialTopic) => {
          setShowAddPageModal(false);
          setTopicModalInitialQuery(initialTopic || "");
          setShowTopicModal(true);
        }}
        courseTitle={currentCourse?.title}
        theme={paperTheme}
      />

      {/* 6b. Add Module Modal Popup */}
      <AddModuleModal
        isOpen={showAddModuleModal}
        onClose={() => setShowAddModuleModal(false)}
        onSubmit={handleCreateModule}
        courseTitle={currentCourse?.title}
        defaultIndex={currentCourse ? currentCourse.modules.length + 1 : 1}
        theme={paperTheme}
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
        theme={paperTheme}
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
          onClick={() => {
            setShowUrlModal(false);
            setUrlError(null);
          }}
        >
          <div
            ref={urlModalDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nb-url-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "480px",
              background: tokens.cardBg,
              border: `3px solid ${tokens.borderPrimary}`,
              boxShadow: tokens.boxShadow,
              padding: "24px",
              color: tokens.textPrimary,
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono, monospace)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.16em",
                color: tokens.textMuted,
                marginBottom: "6px",
              }}
            >
              LECTURE / VIDEO / RESOURCE LINK
            </div>
            <h3
              id="nb-url-modal-title"
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
              aria-invalid={Boolean(urlError)}
              aria-describedby={urlError ? "nb-url-error" : undefined}
              value={urlDraft}
              onChange={(e) => {
                setUrlDraft(e.target.value);
                if (urlError) setUrlError(null);
              }}
              placeholder="https://youtube.com/watch?v=... or https://coursera.org/..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLessonUrl(urlDraft);
                if (e.key === "Escape") {
                  setShowUrlModal(false);
                  setUrlError(null);
                }
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontFamily: "var(--mono, monospace)",
                fontSize: "16px",
                border: `2px solid ${urlError ? tokens.dangerText : tokens.borderPrimary}`,
                background: tokens.sidebarBg,
                color: tokens.textPrimary,
                marginBottom: urlError ? "8px" : "18px",
              }}
            />
            {urlError && (
              <div
                id="nb-url-error"
                role="alert"
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: tokens.dangerText,
                  marginBottom: "14px",
                }}
              >
                {urlError}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setShowUrlModal(false);
                  setUrlError(null);
                }}
                style={{
                  fontFamily: "var(--mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: "transparent",
                  color: tokens.textPrimary,
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
                  border: `2px solid ${tokens.borderPrimary}`,
                  background: "#B8F04A",
                  color: "#0A0A0A",
                  padding: "8px 16px",
                  cursor: "pointer",
                  boxShadow: tokens.boxShadow,
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
        theme={paperTheme}
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
          theme={paperTheme}
        />
      )}

      {/* 11. Autonomous Topic / Question Note Synthesizer Modal */}
      <GenerateTopicModal
        isOpen={showTopicModal}
        onClose={() => setShowTopicModal(false)}
        onGenerated={handleTopicGenerated}
        currentLessonTitle={topicModalInitialQuery || currentLesson?.title}
        courseTitle={currentCourse?.title}
        hasExistingContent={hasCurrentLessonContent}
        theme={paperTheme}
      />
    </div>
  );
}
