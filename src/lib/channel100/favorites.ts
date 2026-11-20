import {
  ChannelMediaItem,
  FavoriteItem,
  FavoriteMediaType,
  FavoritesCuratorProfile,
  FavoritesVault,
  FavoriteVibe,
} from "./types";

export const FAVORITES_MEDIA_ID = "fav_vault";

export const FAVORITE_VIBES: FavoriteVibe[] = [
  "Life-Changing",
  "Pure Cinema",
  "Mind-Bender",
  "Comfort Rewatch",
  "Masterclass",
  "Late Night",
  "Tearjerker",
  "Hidden Gem",
];

export const DEFAULT_FAVORITES_PROFILE: FavoritesCuratorProfile = {
  displayName: "All-Time Canon",
  tagline: "If you ever ask me for my favorite movies & shows, start right here.",
  isPublic: true,
};

export function createDefaultFavoritesVault(): FavoritesVault {
  return {
    items: [],
    profile: { ...DEFAULT_FAVORITES_PROFILE },
    shareId: null,
    updatedAt: 0,
  };
}

export function normalizeFavoriteKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function inferMediaType(item: ChannelMediaItem): FavoriteMediaType {
  if (item.custom) {
    return item.customKind === "film" || item.customKind === "doc"
      ? "movie"
      : "show";
  }
  if (item.kind === "tv") return "show";
  if (item.kind === "film" || item.kind === "vgf") return "movie";
  return item.seasons || item.eps ? "show" : "movie";
}

export function channelItemToFavorite(
  item: ChannelMediaItem,
  overrides?: Partial<FavoriteItem>
): FavoriteItem {
  const mediaType = overrides?.mediaType || inferMediaType(item);
  return {
    id: item.id,
    title: item.title,
    mediaType,
    year: item.years || item.year || item.start || undefined,
    creator: item.director || item.network || undefined,
    genre: item.genre || undefined,
    lang: item.lang || undefined,
    where: item.where || undefined,
    pitch: overrides?.pitch ?? "",
    quote: overrides?.quote ?? "",
    vibe: overrides?.vibe ?? undefined,
    rating: overrides?.rating ?? 5,
    hours: item.hours || (mediaType === "movie" ? 2.1 : 24),
    image: item.image || undefined,
    addedAt: Date.now(),
    ...overrides,
  };
}

export function favoriteToChannelItem(
  fav: FavoriteItem,
  rankIndex: number
): ChannelMediaItem {
  const yearNum =
    typeof fav.year === "number"
      ? fav.year
      : parseInt(String(fav.year || "").slice(0, 4), 10) || 2020;

  return {
    kind: fav.mediaType === "show" ? "tv" : "film",
    id: fav.id,
    rank: rankIndex + 1,
    title: fav.title,
    year: yearNum,
    years: typeof fav.year === "string" ? fav.year : String(yearNum),
    start: yearNum,
    director: fav.mediaType === "movie" ? fav.creator : undefined,
    network: fav.mediaType === "show" ? fav.creator : undefined,
    where: fav.where || "Streaming",
    genre: fav.genre || "Drama",
    imdb: 0,
    icon: fav.mediaType === "show" ? "tv" : "clapper",
    blurb: fav.pitch || "",
    mins: fav.mediaType === "movie" ? Math.round((fav.hours || 2) * 60) : 50,
    sub: fav.vibe || fav.genre || "",
    hours: fav.hours || (fav.mediaType === "movie" ? 2 : 24),
    lang: fav.lang || "English",
    image: fav.image,
    updatedAt: fav.addedAt,
  };
}

export function isItemInFavorites(
  vault: FavoritesVault,
  id: string,
  title?: string
): boolean {
  if (vault.items.some((f) => f.id === id)) return true;
  if (title) {
    const key = normalizeFavoriteKey(title);
    if (key && vault.items.some((f) => normalizeFavoriteKey(f.title) === key)) {
      return true;
    }
  }
  return false;
}

export type ShareFilterScope = "all" | "movie" | "show";
export type ShareTextFormat = "clean" | "markdown" | "compact";

export function filterFavoritesByScope(
  items: FavoriteItem[],
  scope: ShareFilterScope
): FavoriteItem[] {
  if (scope === "all") return items;
  return items.filter((item) => item.mediaType === scope);
}

export function formatFavoritesForShare(
  vault: FavoritesVault,
  scope: ShareFilterScope,
  format: ShareTextFormat,
  shareUrl?: string | null
): string {
  const items = filterFavoritesByScope(vault.items, scope);
  const titleLabel =
    scope === "movie"
      ? `${vault.profile.displayName} — All-Time Favorite Movies`
      : scope === "show"
        ? `${vault.profile.displayName} — All-Time Favorite Shows`
        : `${vault.profile.displayName} — All-Time Favorites`;

  if (items.length === 0) {
    return `${titleLabel}\n(No titles inducted yet)`;
  }

  if (format === "compact") {
    const lines = [
      titleLabel,
      "",
      ...items.map((item, idx) => {
        const yr = item.year ? ` (${item.year})` : "";
        const tag = scope === "all" ? ` [${item.mediaType === "movie" ? "Film" : "TV"}]` : "";
        return `${idx + 1}. ${item.title}${yr}${tag}`;
      }),
    ];
    if (shareUrl) {
      lines.push("", `Full list: ${shareUrl}`);
    }
    return lines.join("\n");
  }

  if (format === "markdown") {
    const movies = items.filter((i) => i.mediaType === "movie");
    const shows = items.filter((i) => i.mediaType === "show");
    const blocks: string[] = [`# ${titleLabel}`];
    if (vault.profile.tagline) {
      blocks.push(`> ${vault.profile.tagline}`);
    }

    const renderGroup = (heading: string, group: FavoriteItem[]) => {
      if (!group.length) return "";
      const lines = [`## ${heading} (${group.length})`, ""];
      group.forEach((item, i) => {
        const yr = item.year ? ` (${item.year})` : "";
        const creator = item.creator ? ` — *${item.creator}*` : "";
        const pitch = item.pitch ? `\n   - ${item.pitch}` : "";
        lines.push(`${i + 1}. **${item.title}**${yr}${creator}${pitch}`);
      });
      return lines.join("\n");
    };

    if (scope === "all") {
      if (movies.length) blocks.push(renderGroup("All-Time Movies", movies));
      if (shows.length) blocks.push(renderGroup("All-Time Shows", shows));
    } else {
      blocks.push(
        renderGroup(scope === "movie" ? "All-Time Movies" : "All-Time Shows", items)
      );
    }

    if (shareUrl) {
      blocks.push(`---\nInteractive gallery: ${shareUrl}`);
    }
    return blocks.join("\n\n");
  }

  // "clean" — ideal for iMessage / WhatsApp / Slack
  const movies = items.filter((i) => i.mediaType === "movie");
  const shows = items.filter((i) => i.mediaType === "show");
  const parts: string[] = [titleLabel];
  if (vault.profile.tagline) {
    parts.push(vault.profile.tagline);
  }

  const formatCleanGroup = (label: string, group: FavoriteItem[]) => {
    if (!group.length) return "";
    const rows = group.map((item, i) => {
      const yr = item.year ? ` (${item.year})` : "";
      const vibe = item.vibe ? ` · ${item.vibe}` : "";
      const pitch = item.pitch ? `\n   "${item.pitch}"` : "";
      return `${i + 1}. ${item.title}${yr}${vibe}${pitch}`;
    });
    return `${label}\n${rows.join("\n")}`;
  };

  if (scope === "all") {
    if (movies.length) parts.push(formatCleanGroup("MOVIES", movies));
    if (shows.length) parts.push(formatCleanGroup("TV SHOWS", shows));
  } else {
    parts.push(
      formatCleanGroup(scope === "movie" ? "MOVIES" : "TV SHOWS", items)
    );
  }

  if (shareUrl) {
    parts.push(`Browse the full collection: ${shareUrl}`);
  }

  return parts.join("\n\n");
}

/**
 * Compact URL-safe base64 codec for stateless fallback sharing (when unauthenticated).
 */
export function encodeVaultToHash(vault: FavoritesVault, scope: ShareFilterScope = "all"): string {
  const payload = {
    p: {
      n: vault.profile.displayName,
      t: vault.profile.tagline,
    },
    i: filterFavoritesByScope(vault.items, scope)
      .slice(0, 40)
      .map((f) => ({
        id: f.id,
        t: f.title,
        m: f.mediaType === "movie" ? 0 : 1,
        y: f.year || "",
        c: f.creator || "",
        g: f.genre || "",
        w: f.where || "",
        p: f.pitch || "",
        v: f.vibe || "",
        r: f.rating || 5,
      })),
  };

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeVaultFromHash(hashPayload: string): FavoritesVault | null {
  try {
    const clean = hashPayload.replace(/^#?d=/, "").trim();
    if (!clean) return null;
    const padded = clean.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((clean.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.i)) return null;

    const items: FavoriteItem[] = parsed.i.map((raw: Record<string, unknown>, idx: number) => ({
      id: String(raw.id || `shared_${idx}`),
      title: String(raw.t || "Untitled"),
      mediaType: raw.m === 0 ? "movie" : "show",
      year: raw.y ? String(raw.y) : undefined,
      creator: raw.c ? String(raw.c) : undefined,
      genre: raw.g ? String(raw.g) : undefined,
      where: raw.w ? String(raw.w) : undefined,
      pitch: raw.p ? String(raw.p) : undefined,
      vibe: raw.v ? String(raw.v) : undefined,
      rating: typeof raw.r === "number" ? raw.r : 5,
      addedAt: Date.now(),
    }));

    return {
      items,
      profile: {
        displayName: String(parsed.p?.n || DEFAULT_FAVORITES_PROFILE.displayName),
        tagline: String(parsed.p?.t || DEFAULT_FAVORITES_PROFILE.tagline),
        isPublic: true,
      },
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}
