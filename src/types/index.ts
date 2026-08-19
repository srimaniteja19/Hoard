import { CoverData } from "@/lib/cover-data";

export type KindType = 'ART' | 'VID' | 'PLY' | 'GIT' | 'APP' | 'PPR' | 'DOC';

export type ItemType = 'REFERENCE' | 'QUEUED';

export type ContextType = 'all' | 'desk' | 'commute' | 'wind';

export type ViewMode = 'masonry' | 'grid' | 'list' | 'heads' | 'archive';

export type SortMode = 'recent' | 'short' | 'az' | 'mostUsed' | 'recentlyUsed';

export interface KindMeta {
  name: string;
  c: string; // Background color hex
  fg: string; // Text color hex
  verb: string;
  icon: string;
}

export interface Collection {
  id: string;
  name: string;
  ic: string;
  c: string;
  query?: string | null;
  kids?: Collection[];
}

export type DriftStatusType = 'clean' | 'changed' | '404_preserved';

export interface Bookmark {
  id: number;
  t: string; // Title
  ty: KindType;
  src: string; // Domain source
  url: string;
  mins: number;
  tag: string;
  coll: string;
  when: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isDeleted?: boolean;
  unread: boolean;
  itemType?: ItemType;
  itemTypeGuessed?: boolean;
  useCount?: number;
  lastUsedAt?: string | null; // ISO string, same convention as lastFetchedAt
  ex: Record<string, string>;
  note: string;
  source?: string;
  coverData?: CoverData | null;
  coverImage?: string | null;

  // Chapter decomposition
  parentId?: number | null;
  parentTitle?: string | null;
  startTimeSec?: number | null;
  chapterIndex?: number | null;
  chapters?: Bookmark[];

  // Content drift & link-rot
  archivedText?: string | null;
  lastFetchedAt?: string | null;
  driftStatus?: DriftStatusType | null;
  driftPercent?: number | null;

  // Topic cluster cross-referencing
  clusterId?: string | null;
  clusterTitle?: string | null;

  // OG Cover & Favicon Metadata
  coverSource?: 'og' | 'generated' | null;
  ogImageKey?: string | null;
  ogImageWidth?: number | null;
  ogImageHeight?: number | null;
  ogDominantColor?: string | null;
  ogLqip?: string | null;
  ogStatus?: 'PENDING' | 'READY' | 'REJECTED' | 'FAILED' | null;
  ogRejectReason?: string | null;
  faviconKey?: string | null;
  excerptSource?: 'og' | 'first-paragraph' | 'user-note' | null;
}

export interface SearchFilter {
  text: string[];
  ty: KindType | null;
  under: number | null;
  tag: string | null;
  lang: string | null;
  unread: boolean;
}

export interface DetectionResult {
  ty: KindType;
  f: Record<string, string>;
  n: string;
}

export interface TopicCluster {
  id: string;
  title: string;
  surfaces: Bookmark[];
}

export interface SessionQueueItem {
  bookmark: Bookmark;
  allocatedMins: number;
}
