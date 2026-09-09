export type ReaderBlock =
  | { type: "p"; lede: string; rest: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "fig"; figureId: string; caption: string };

export type ReaderLink = {
  title: string;
  source: string;
  url?: string;
};

export type ReaderCategoryKey =
  | "ai"
  | "eng"
  | "craft"
  | "prod"
  | "mkt"
  | "essay"
  | "unsorted";

export type ReaderCategoryMeta = {
  name: string;
  color: string;
  fg: string;
};

export const READER_CATEGORIES: Record<ReaderCategoryKey, ReaderCategoryMeta> = {
  ai: { name: "AI & MODELS", color: "var(--violet)", fg: "#FFFFFF" },
  eng: { name: "ENGINEERING", color: "var(--cyan)", fg: "#0A0A0A" },
  craft: { name: "CAREER & CRAFT", color: "var(--lime)", fg: "#0A0A0A" },
  prod: { name: "PRODUCT & DESIGN", color: "var(--orange)", fg: "#0A0A0A" },
  mkt: { name: "MARKETS", color: "var(--clay)", fg: "#FFFFFF" },
  essay: { name: "ESSAYS & CULTURE", color: "var(--steel)", fg: "#0A0A0A" },
  unsorted: { name: "UNSORTED", color: "transparent", fg: "inherit" },
};

export type ReaderKeepKind = "CLAIM" | "LINK" | "FIGURE";

export type ReaderIssueStatus = "unread" | "skimmed" | "kept" | "nothing";

export type ReaderDensity = "skim" | "read" | "study";

export type ReaderPaperTheme = "cream" | "ink";

export type ReaderKeep = {
  id: string;
  issueId?: string | null;
  userId: string;
  kind: ReaderKeepKind;
  quote?: string | null;
  reason: string;
  sourceName: string;
  sourceUrl?: string | null;
  color?: string | null;
  createdAt: string;
};

export type ReaderIssue = {
  id: string;
  userId: string;
  messageId?: string | null;
  sender: string;
  senderId?: string | null;
  subject: string;
  dek: string;
  category: ReaderCategoryKey;
  categoryConfidence: number; // 0.0 - 1.0 (below 0.6 is treated as guess / uncertain)
  arrivedAt: string; // ISO string
  closedAt?: string | null;
  density?: ReaderDensity | null;
  deletedAt?: string | null;
  wordCount: number;
  readMinutes: number;
  bodyBlocks: ReaderBlock[] | null;
  links: ReaderLink[];
  status: ReaderIssueStatus;
  keptCount: number;
  createdAt: string;
  updatedAt: string;
  keeps?: ReaderKeep[];
};

export type ReaderSender = {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  issueCount: number;
  hasKept: boolean;
};

export type ReaderSessionKeptItem = {
  issue: {
    id: string;
    sender: string;
    subject: string;
  };
  keep: ReaderKeep;
};

export type ReaderSessionState = {
  readIssueIds: string[];
  startedAt: number;
  activeIssueId?: string;
  density: ReaderDensity;
};
