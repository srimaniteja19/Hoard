import { SavedDigestItem } from "./storage";
import { DigestResult } from "./types";

export type FolderItemType = "DIGEST" | "NOTE" | "ASK" | "LINK";

export interface FolderNoteItem {
  id: string;
  folderId: string;
  type: "NOTE";
  title: string;
  content: string; // Markdown or code
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FolderAskItem {
  id: string;
  folderId: string;
  type: "ASK";
  question: string;
  answer: string;
  tags: string[];
  createdAt: string;
}

export interface CourseFolder {
  id: string;
  name: string; // e.g. "Agentic AI (DeepLearning.AI)"
  icon: string; // e.g. "🤖", "🧠", "⚡", "🎓", "🔬"
  color: string; // e.g. "#FFE600", "#00F0FF", "#A855F7", "#10B981", "#F43F5E"
  description: string; // e.g. "Multi-agent systems, tool calling, memory architectures, and evaluation"
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const FOLDERS_STORAGE_KEY = "hoard_course_folders_v1";
const FOLDER_NOTES_STORAGE_KEY = "hoard_folder_notes_v1";
const FOLDER_ASKS_STORAGE_KEY = "hoard_folder_asks_v1";

const DEFAULT_FOLDERS: CourseFolder[] = [
  {
    id: "folder-agentic-ai",
    name: "Agentic AI (DeepLearning.AI)",
    icon: "🤖",
    color: "#00F0FF",
    description: "Multi-agent workflows, autonomous tool calling, planning loops, memory architectures, and human-in-the-loop oversight.",
    tags: ["COURSE", "AGENTS", "DEEPLEARNING.AI", "LLMs"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "folder-quant-finance",
    name: "Quantitative Finance & Risk",
    icon: "📈",
    color: "#FFE600",
    description: "Options pricing, volatility surfaces, delta hedging, and algorithmic market making.",
    tags: ["FINANCE", "MATH", "DERIVATIVES"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Get all course / project folders
 */
export function getCourseFolders(): CourseFolder[] {
  if (typeof window === "undefined") return DEFAULT_FOLDERS;
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(DEFAULT_FOLDERS));
      return DEFAULT_FOLDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FOLDERS;
  } catch (err) {
    console.error("Failed to load course folders:", err);
    return DEFAULT_FOLDERS;
  }
}

/**
 * Create or update a course folder
 */
export function saveCourseFolder(folder: Omit<CourseFolder, "id" | "createdAt" | "updatedAt"> & { id?: string }): CourseFolder {
  const folders = getCourseFolders();
  const now = new Date().toISOString();

  if (folder.id) {
    const idx = folders.findIndex((f) => f.id === folder.id);
    if (idx >= 0) {
      const updated: CourseFolder = {
        ...folders[idx],
        ...folder,
        updatedAt: now,
      };
      folders[idx] = updated;
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
      return updated;
    }
  }

  const newFolder: CourseFolder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: folder.name.trim(),
    icon: folder.icon || "📁",
    color: folder.color || "#FFE600",
    description: folder.description?.trim() || "",
    tags: folder.tags || [],
    createdAt: now,
    updatedAt: now,
  };

  folders.unshift(newFolder);
  localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  return newFolder;
}

/**
 * Delete a course folder
 */
export function deleteCourseFolder(folderId: string): CourseFolder[] {
  const folders = getCourseFolders().filter((f) => f.id !== folderId);
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch (err) {
    console.error("Failed to delete folder:", err);
  }
  return folders;
}

/**
 * Get notes inside a folder
 */
export function getFolderNotes(folderId: string): FolderNoteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FOLDER_NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : []).filter((n: FolderNoteItem) => n.folderId === folderId);
  } catch (err) {
    console.error("Failed to get folder notes:", err);
    return [];
  }
}

/**
 * Save note into a folder
 */
export function saveFolderNote(folderId: string, title: string, content: string, tags: string[] = []): FolderNoteItem {
  const allNotesRaw = localStorage.getItem(FOLDER_NOTES_STORAGE_KEY);
  const allNotes: FolderNoteItem[] = allNotesRaw ? JSON.parse(allNotesRaw) : [];
  const now = new Date().toISOString();

  const note: FolderNoteItem = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    folderId,
    type: "NOTE",
    title: title.trim() || "Untitled Note",
    content: content.trim(),
    tags,
    createdAt: now,
    updatedAt: now,
  };

  allNotes.unshift(note);
  localStorage.setItem(FOLDER_NOTES_STORAGE_KEY, JSON.stringify(allNotes));
  return note;
}

/**
 * Delete a folder note
 */
export function deleteFolderNote(noteId: string): void {
  const allNotesRaw = localStorage.getItem(FOLDER_NOTES_STORAGE_KEY);
  if (!allNotesRaw) return;
  const allNotes: FolderNoteItem[] = JSON.parse(allNotesRaw);
  const filtered = allNotes.filter((n) => n.id !== noteId);
  localStorage.setItem(FOLDER_NOTES_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get Q&As inside a folder
 */
export function getFolderAsks(folderId: string): FolderAskItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FOLDER_ASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : []).filter((a: FolderAskItem) => a.folderId === folderId);
  } catch (err) {
    console.error("Failed to get folder asks:", err);
    return [];
  }
}

/**
 * Save a Q&A session into a folder
 */
export function saveFolderAsk(folderId: string, question: string, answer: string, tags: string[] = []): FolderAskItem {
  const allAsksRaw = localStorage.getItem(FOLDER_ASKS_STORAGE_KEY);
  const allAsks: FolderAskItem[] = allAsksRaw ? JSON.parse(allAsksRaw) : [];
  const now = new Date().toISOString();

  const ask: FolderAskItem = {
    id: `ask-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    folderId,
    type: "ASK",
    question: question.trim(),
    answer: answer.trim(),
    tags,
    createdAt: now,
  };

  allAsks.unshift(ask);
  localStorage.setItem(FOLDER_ASKS_STORAGE_KEY, JSON.stringify(allAsks));
  return ask;
}

/**
 * Export complete Folder as a Markdown Study Dossier
 */
export function exportFolderDossierMarkdown(
  folder: CourseFolder,
  digests: SavedDigestItem[],
  notes: FolderNoteItem[],
  asks: FolderAskItem[]
): string {
  let md = `# 📁 ${folder.icon} ${folder.name.toUpperCase()} — COURSE DOSSIER\n\n`;
  if (folder.description) {
    md += `> **Overview**: ${folder.description}\n\n`;
  }
  md += `**Tags**: ${folder.tags.map((t) => `#${t}`).join(" ")}  \n`;
  md += `**Generated from Hoard Shelf**: ${new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}\n\n`;
  md += `---\n\n`;

  // 1. Synthesized Digests
  md += `## 📑 COURSE DIGESTS (${digests.length})\n\n`;
  if (digests.length === 0) {
    md += `*No digests added to this folder yet.*\n\n`;
  } else {
    digests.forEach((item, idx) => {
      md += `### ${idx + 1}. ${item.title}\n\n`;
      md += `> **Thesis**: ${item.thesis}\n\n`;
      md += `*Read time: ~${item.readMinutes} mins*\n\n`;
      item.digest.sections.forEach((sec) => {
        md += `#### ${sec.heading}\n\n`;
        sec.paragraphs.forEach((p) => {
          md += `${p.replace(/<strong>/g, "**").replace(/<\/strong>/g, "**")}\n\n`;
        });
      });
      if (item.digest.takeaway) {
        md += `**Core Takeaway**: ${item.digest.takeaway}\n\n`;
      }
      md += `---\n\n`;
    });
  }

  // 2. Scratch Notes & Snippets
  md += `## 📝 LAB & SCRATCHPAD NOTES (${notes.length})\n\n`;
  if (notes.length === 0) {
    md += `*No notes added yet.*\n\n`;
  } else {
    notes.forEach((note, idx) => {
      md += `### Note ${idx + 1}: ${note.title}\n\n`;
      md += `${note.content}\n\n`;
      md += `*Created: ${new Date(note.createdAt).toLocaleString()}*\n\n`;
    });
  }

  // 3. Ask Q&A Sessions
  if (asks.length > 0) {
    md += `## 💬 ASK SESSIONS & CONCEPTUAL DEEP-DIVES (${asks.length})\n\n`;
    asks.forEach((ask, idx) => {
      md += `### Q: ${ask.question}\n\n`;
      md += `${ask.answer}\n\n`;
    });
  }

  return md;
}
