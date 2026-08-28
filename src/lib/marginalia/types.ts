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
export type PosterSeries = "daylight" | "neon" | "mixed";

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

export type VisualArtifactType =
  | "FLOWCHART"
  | "TIMELINE"
  | "MINDMAP"
  | "COMPARISON"
  | "METRIC_GRID"
  | "QUADRANT";

export interface MetricCardItem {
  label: string;
  value: string;
  subtext: string;
  trend?: "UP" | "DOWN" | "CRITICAL" | "NEUTRAL";
}

export interface ComparisonRow {
  dimension: string;
  left: string;
  right: string;
}

export interface ComparisonMatrix {
  leftHeader: string;
  rightHeader: string;
  rows: ComparisonRow[];
}

export interface VisualArtifact {
  type: VisualArtifactType;
  title: string;
  caption?: string;
  mermaidCode?: string;
  metrics?: MetricCardItem[];
  comparison?: ComparisonMatrix;
  svgMarkup?: string;
}

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
  visualArtifact?: VisualArtifact;
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
  macroInfographic?: VisualArtifact;
  chapters: ChapterSummaryItem[];
  overallTakeaway: string;
  generatedAt: string;
}


