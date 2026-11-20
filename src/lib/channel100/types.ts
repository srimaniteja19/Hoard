export type ShowStatus = "seen" | "watching" | "want" | "";
export type MediaKind = "tv" | "film" | "vgf" | "releases" | "tracker" | "favorites";
export type CustomMediaKind = "tv" | "film" | "anime" | "mini" | "doc";
export type ReleasePeriod = "all" | "day" | "week" | "month" | "year";
export type FavoriteMediaType = "movie" | "show";

export type FavoriteVibe =
  | "Life-Changing"
  | "Pure Cinema"
  | "Mind-Bender"
  | "Comfort Rewatch"
  | "Masterclass"
  | "Late Night"
  | "Tearjerker"
  | "Hidden Gem";

export interface FavoriteItem {
  id: string; // canonical media id or "fav_..."
  title: string;
  mediaType: FavoriteMediaType;
  year?: number | string;
  creator?: string; // director or network/creator
  genre?: string;
  lang?: string;
  where?: string;
  pitch?: string; // Personal "why you have to watch this" pitch
  quote?: string; // Optional favorite quote or scene note
  vibe?: FavoriteVibe | string;
  rating?: number; // 1-5 personal rating (default 5)
  hours?: number; // Estimated runtime hours
  image?: string; // Cached poster URL
  addedAt: number;
}

export interface FavoritesCuratorProfile {
  displayName: string; // e.g., "My All-Time Canon"
  tagline: string; // e.g., "If you ever ask me what to watch, start here."
  isPublic: boolean;
}

export interface FavoritesVault {
  items: FavoriteItem[];
  profile: FavoritesCuratorProfile;
  shareId?: string | null;
  updatedAt: number;
}

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
  updatedAt?: number;
  releaseDate?: string; // YYYY-MM-DD
  releasePeriod?: Exclude<ReleasePeriod, "all">;
  image?: string; // Poster / show artwork URL
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
  favoritesVault?: FavoritesVault;
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
  releasePeriod?: ReleasePeriod; // Filter releases by day / week / month / year
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
