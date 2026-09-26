export type ShowStatus = "seen" | "watching" | "want" | "";
export type MediaKind = "tv" | "film" | "tracker";
export type CustomMediaKind = "tv" | "film" | "anime" | "mini" | "doc";

export interface CustomMediaItem {
  id: string; // "c_..."
  title: string;
  kind: CustomMediaKind;
  lang: string; // "Korean", "Japanese", "Telugu", "Hindi", "Spanish", "French", "English", etc.
  langFlag?: string; // e.g. "🇰🇷", "🇯🇵", "🇮🇳", "🇪🇸"
  status: ShowStatus;
  rating: number; // 0 to 5
  year?: number;
  where: string; // "Netflix", "Crunchyroll", "Prime Video", "Cinema", etc.
  genre: string;
  season?: number;
  episode?: number;
  totalEpisodes?: number;
  runtimeMins?: number;
  notes?: string;
  icon?: string; // motif icon
  color?: string; // hex color
  updatedAt: number;
}

export interface ChannelMediaItem {
  kind: MediaKind;
  id: string; // "s1".."s100" for TV, "f1".."f100" for Film, "c_..." for custom
  rank: number;
  title: string;
  years?: string; // TV: "2008–2013"
  year?: number; // Film: 2019
  start: number; // for sorting by year
  network?: string; // TV
  director?: string; // Film
  where: string; // Streamer / Rent / Buy
  genre: string;
  imdb: number;
  icon: string;
  blurb: string;
  limited?: boolean;
  seasons?: number; // TV
  eps?: number; // TV
  mins: number; // typical ep mins (TV) or film runtime (Film)
  sub: string; // sub-genres
  approx?: boolean; // TV
  hours: number;
  lang?: string; // "Korean", "French", "English", "Telugu", "Japanese", etc.
  langFlag?: string;
  custom?: boolean;
  customKind?: CustomMediaKind;
  season?: number;
  episode?: number;
  totalEpisodes?: number;
}

export interface ShowUserRecord {
  s?: ShowStatus;
  r?: number; // 1-5 rating
  n?: string; // personal notes
  updatedAt?: number;
}

export interface Channel100Store {
  shows: Record<string, ShowUserRecord>; // keys are "s1".."s100", "f1".."f100", "c_..."
  custom?: Record<string, CustomMediaItem>; // custom logged entertainment
  updated: number;
}

export type ViewSort =
  | "rank"
  | "imdb"
  | "short"
  | "long"
  | "new"
  | "old"
  | "az"
  | "mine"
  | "recent"
  | "progress";

export type ViewLayout = "grid" | "list";

export type StatusFilter = "all" | "seen" | "watching" | "want" | "none";

export interface ViewFilterState {
  cat: MediaKind;
  status: StatusFilter;
  genre: string;
  where: string;
  len: string;
  lang?: string; // Filter by any language
  customKind?: string; // Filter by custom media kind
  sort: ViewSort;
  q: string;
  layout: ViewLayout;
}

export interface ArtMeta {
  bg: string;
  pat: string;
  svg: string;
  stripHtml?: string;
}

export interface Channel100StatsData {
  seen: number;
  watching: number;
  want: number;
  untouched: number;
  percentSeen: number;
  hoursSeen: number;
  hoursWant: number;
  hoursTotal: number;
}

export interface CatalogConfig {
  items: ChannelMediaItem[];
  noun: string;
  one: string;
  eyebrow: string;
  h1: string;
  lede: string;
  set: string;
  rankPre: string;
  icon: string;
  search: string;
  band: (item: ChannelMediaItem) => string;
  bands: [string, string][];
}
