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

export interface BookMetadataLookup {
  pageCount?: number | null;
  chapterCount?: number | null;
  audioDuration?: string | null;
  suggestedAuthor?: string | null;
  suggestedIsbn?: string | null;
  suggestedTitle?: string | null;
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
