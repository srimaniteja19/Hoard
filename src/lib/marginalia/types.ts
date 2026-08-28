import { BookRow, MarginaliaRow, MarginaliaPendingMarkRow, BookFormat, BookStatus, BookMotif, MarginaliaKind } from "@/db/schema";

export type {
  BookRow,
  MarginaliaRow,
  MarginaliaPendingMarkRow,
  BookFormat,
  BookStatus,
  BookMotif,
  MarginaliaKind,
};

export type CoverSource = "UPLOAD" | "OPEN_LIBRARY" | "GOOGLE_BOOKS" | "ITUNES" | "HOUSE";
export type CoverViewMode = "jackets" | "poster" | "house";
export type PaperTheme = "cream" | "sand" | "ink";

export interface ChapterItem {
  number: number;
  title: string;
  page?: number;
  duration?: string;
}

export interface BookMetadataLookup {
  pageCount?: number | null;
  chapterCount?: number | null;
  audioDuration?: string | null;
  suggestedAuthor?: string | null;
  suggestedIsbn?: string | null;
  suggestedTitle?: string | null;
  chapters?: ChapterItem[] | null;
}

export interface ResolvedCoverResult {
  coverUrl: string | null;
  coverSource: CoverSource;
  accentColor: string;
  fgColor: string;
  motif: BookMotif;
  provenanceLabel: string;
  metadata?: BookMetadataLookup;
  allCandidates?: Array<{
    source: CoverSource;
    url: string;
    label: string;
  }>;
}

export interface BookStatsSummary {
  totalVolumes: number;
  totalNotes: number;
  totalPromoted: number;
  readingCount: number;
  finishedCount: number;
}

export type PointCategory =
  | "CORE_IDEA"
  | "MENTAL_MODEL"
  | "TACTIC"
  | "PROVOCATION"
  | "HISTORICAL"
  | "EVIDENCE";

export interface ChapterSummaryPoint {
  category: PointCategory;
  point: string;
  detail?: string;
}

export interface ChapterSummaryItem {
  chapterNumber: number;
  chapterTitle: string;
  thesis: string;
  points: ChapterSummaryPoint[];
  keyQuote?: string;
  takeaway: string;
}

export interface BookSummaryData {
  bookTitle: string;
  author: string;
  oneLiner: string;
  executiveSummary: string;
  readingTimeMinutes?: number;
  coreThemes: string[];
  chapters: ChapterSummaryItem[];
  overallTakeaway: string;
  generatedAt: string;
}

