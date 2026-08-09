export type KindType = 'ART' | 'VID' | 'PLY' | 'GIT' | 'APP' | 'PPR' | 'DOC';

export type ContextType = 'all' | 'desk' | 'commute' | 'wind';

export type ViewMode = 'masonry' | 'grid' | 'list' | 'heads';

export type SortMode = 'recent' | 'short' | 'az';

export interface KindMeta {
  name: string;
  c: string; // Background color hex
  fg: string; // Text color hex
  verb: string;
}

export interface Collection {
  id: string;
  name: string;
  ic: string;
  c: string;
  kids?: Collection[];
}

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
  unread: boolean;
  ex: Record<string, string>;
  note: string;
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
