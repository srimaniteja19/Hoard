/**
 * Types for the Universal Digest Synthesizer (Summarizer)
 */

export type FigureKind = "relay" | "contrast" | "anatomy" | "flow" | "scale" | "inputs";

export interface RelayStep {
  actor: string; // e.g. "Louis Bachelier", "Paul Samuelson", "Fischer Black"
  year?: string; // e.g. "1900", "1965", "1973"
  action: string; // e.g. "Formulates Brownian motion in stock options"
  baton: string; // What was handed forward
}

export interface ContrastItem {
  attribute: string;
  optionA: { title: string; detail: string };
  optionB: { title: string; detail: string };
}

export interface AnatomyPart {
  number: number;
  name: string;
  role: string;
  orderedDependency?: string;
}

export interface FlowStep {
  id: string;
  label: string;
  detail: string;
  isLoopOrBranch?: boolean;
  branchTo?: string;
}

export interface ScaleQuantity {
  label: string;
  value: number;
  unit: string;
  formatted: string;
}

export interface InputsData {
  included: string[];
  excluded: string[];
  transformation: string;
}

export interface DigestFigure {
  id: string;
  kind: FigureKind;
  title: string;
  caption: string;
  scaleNote?: string; // For scale: whether drawn linear or log and why
  // Structured data matching the specific kind
  relayData?: RelayStep[];
  contrastData?: {
    labelA: string;
    labelB: string;
    items: ContrastItem[];
  };
  anatomyData?: {
    systemName: string;
    parts: AnatomyPart[];
  };
  flowData?: {
    steps: FlowStep[];
    loopDescription?: string;
  };
  scaleData?: {
    axisType: "linear" | "log";
    ratio: string;
    items: ScaleQuantity[];
  };
  inputsData?: InputsData;
}

export interface DigestCastMember {
  name: string;
  contribution: string; // What they contributed, not who they were
}

export interface DigestTerm {
  term: string;
  definition: string; // Defined as used here
}

export interface DigestClaim {
  text: string;
  verified: boolean;
  sourceContext?: string;
}

export interface DigestSection {
  n: number;
  heading: string;
  paragraphs: string[]; // 1-3 paragraphs, load-bearing phrase wrapped in <strong>
  figureId?: string;
}

export interface DigestResult {
  title: string;
  thesis: string; // <20 words, actual insight
  readMinutes: number;
  sections: DigestSection[];
  figures: DigestFigure[];
  cast: DigestCastMember[];
  terms: DigestTerm[];
  takeaway: string; // 1-2 sentences, <30 words
  skipped: string[]; // Deliberately left out (>5% of source)
  claims: DigestClaim[]; // Numbers, stats, or assertions flagged
}

export type SourceFormat = "TRANSCRIPT" | "PAPER" | "ARTICLE" | "ESSAY" | "PROSE";

export interface CandidateFigureProposal {
  kind: FigureKind;
  confidence: number; // 0 to 1
  evidence: string;
}

export interface IntakeAnalysis {
  wordCount: number;
  charCount: number;
  readMinutesSource: number;
  targetWordCount: number;
  targetReadMinutes: number;
  reductionPercentage: number;
  sourceFormat: SourceFormat;
  namedEntities: string[];
  datesFound: string[];
  dateSpanYears?: number;
  numberCount: number;
  candidateFigures: CandidateFigureProposal[];
  hasTimestamps: boolean;
  paragraphsCount: number;
  strategy?: import("./autonomousPrompt").AutonomousStrategy;
}

export interface DigestPlan {
  thesisHypothesis: string;
  targetSectionCount: number;
  proposedHeadings: string[];
  candidateFigures: CandidateFigureProposal[];
  candidateCast: string[];
  candidateTerms: string[];
  claimsToFlagCount: number;
  skippedPredictions: string[];
  // User overrides & switches
  includeCast: boolean;
  includeFigures: boolean;
  includeTerms: boolean;
  includeClaimsAudit: boolean;
  includeSkippedFooter: boolean;
  depth: "concise" | "standard" | "thorough";
  strategy?: import("./autonomousPrompt").AutonomousStrategy;
}
