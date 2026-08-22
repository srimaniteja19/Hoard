export type AtlasDepth = "tourist" | "working" | "dangerous";
export type AtlasCadence = "weeknights" | "weekends" | "daily";
export type AtlasKind = "read" | "make" | "recall" | "talk" | "ship";
export type AtlasEnergy = "DEEP" | "SHALLOW" | "ERRAND";
export type AtlasStatus = "draft" | "walking" | "archived";
export type AtlasStationState = "OPEN" | "DONE";
export type AtlasResourceKind = "video" | "article";

export type AtlasResource = {
  title: string;
  href: string;
  kind: AtlasResourceKind;
};

export type ParsedAtlas = {
  topic: string;
  weeksPlanned: number;
  minutesPerSession: number;
  cadence: AtlasCadence;
  depth: AtlasDepth;
  antiScope: string[];
};

export type AtlasWeekDraft = {
  id: string;
  label: string;
  estimatedMinutes: number;
};

export type AtlasStationDraft = {
  id: string;
  weekId: string;
  title: string;
  why: string;
  estimatedMinutes: number;
  energy: AtlasEnergy;
  kind: AtlasKind;
  required: boolean;
};

export type AtlasStation = AtlasStationDraft & {
  state: AtlasStationState;
  note: string | null;
  doneAt: string | null;
  resources: AtlasResource[];
};

export type AtlasSyllabus = {
  thin: boolean;
  hoursPerWeek: number;
  weeks: AtlasWeekDraft[];
  stations: AtlasStation[];
};

export type AtlasRecord = {
  id: string;
  serial: string;
  title: string;
  brief: string;
  prompt: string;
  depth: AtlasDepth;
  cadence: AtlasCadence;
  minutesPerSession: number;
  weeksPlanned: number;
  antiScope: string[];
  status: AtlasStatus;
  currentWeekId: string | null;
  syllabus: AtlasSyllabus;
  model: string;
  createdAt: string;
  updatedAt: string;
};
