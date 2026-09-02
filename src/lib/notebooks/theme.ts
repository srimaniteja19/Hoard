export type NotebookTheme = "cream" | "ink" | "matcha" | "midnight";

export type TypographyStyle = "sans" | "serif" | "mono";

export const TYPOGRAPHY_FONTS: Record<TypographyStyle, { id: TypographyStyle; label: string; fontStack: string; glyph: string }> = {
  sans: {
    id: "sans",
    label: "Sans",
    glyph: "Ag",
    fontStack: "var(--body, 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif)",
  },
  serif: {
    id: "serif",
    label: "Serif",
    glyph: "Ag",
    fontStack: "'Newsreader', 'Merriweather', 'Georgia', 'Times New Roman', serif",
  },
  mono: {
    id: "mono",
    label: "Mono",
    glyph: "</>",
    fontStack: "var(--mono, 'JetBrains Mono', 'Fira Code', monospace)",
  },
};

export interface ThemeTokens {
  id: NotebookTheme;
  label: string;
  emoji: string;
  isDark: boolean;

  // Base backgrounds
  canvasBg: string;
  sidebarBg: string;
  cardBg: string;
  popoverBg: string;
  popoverHoverBg: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  borderPrimary: string;
  borderSubtle: string;
  boxShadow: string;
  popoverShadow: string;

  // Highlights & Accents
  accentColor: string;
  accentFg: string;
  highlightYellow: string;
  highlightBg: string;
  highlightFg: string;
  highlightBorder: string;
  activeRowBg: string;
  activeRowBorder: string;

  // Code & Tags
  codeBg: string;
  codeBorder: string;
  codeFg: string;

  // Callouts
  calloutGotchaBg: string;
  calloutQuestionBg: string;
  calloutFactBg: string;
  calloutConnectsBg: string;
}

export const THEME_TOKENS: Record<NotebookTheme, ThemeTokens> = {
  cream: {
    id: "cream",
    label: "CREAM",
    emoji: "📜",
    isDark: false,
    canvasBg: "#F3F0E8",
    sidebarBg: "#EBE7DC",
    cardBg: "#FFFFFF",
    popoverBg: "#FFFFFF",
    popoverHoverBg: "#FCE94F",
    textPrimary: "#0A0A0A",
    textSecondary: "rgba(10, 10, 10, 0.7)",
    textMuted: "rgba(10, 10, 10, 0.45)",
    borderPrimary: "#0A0A0A",
    borderSubtle: "rgba(10, 10, 10, 0.15)",
    boxShadow: "3px 3px 0 #0A0A0A",
    popoverShadow: "4px 4px 0 #0A0A0A",
    accentColor: "#FCE94F",
    accentFg: "#0A0A0A",
    highlightYellow: "#FCE94F",
    highlightBg: "rgba(139, 92, 246, 0.16)",
    highlightFg: "#5B21B6",
    highlightBorder: "#8B5CF6",
    activeRowBg: "#FFFFFF",
    activeRowBorder: "#0A0A0A",
    codeBg: "#EBE7DC",
    codeBorder: "#0A0A0A",
    codeFg: "#0A0A0A",
    calloutGotchaBg: "#FFE4E6",
    calloutQuestionBg: "#FEF3C7",
    calloutFactBg: "#DCFCE7",
    calloutConnectsBg: "#E0F2FE",
  },
  ink: {
    id: "ink",
    label: "INK",
    emoji: "🖋️",
    isDark: true,
    canvasBg: "#121212",
    sidebarBg: "#0D0D0D",
    cardBg: "#18181A",
    popoverBg: "#1C1C1F",
    popoverHoverBg: "#28282C",
    textPrimary: "#F5F5F7",
    textSecondary: "rgba(245, 245, 247, 0.65)",
    textMuted: "rgba(245, 245, 247, 0.4)",
    borderPrimary: "rgba(255, 255, 255, 0.14)",
    borderSubtle: "rgba(255, 255, 255, 0.08)",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.8)",
    popoverShadow: "4px 4px 0 rgba(0,0,0,0.9)",
    accentColor: "#FCE94F",
    accentFg: "#0A0A0A",
    highlightYellow: "#FCE94F",
    highlightBg: "rgba(139, 92, 246, 0.28)",
    highlightFg: "#F5F3FF",
    highlightBorder: "#A78BFA",
    activeRowBg: "#222226",
    activeRowBorder: "#F5F5F7",
    codeBg: "#161618",
    codeBorder: "rgba(255, 255, 255, 0.15)",
    codeFg: "#F5F5F7",
    calloutGotchaBg: "#231518",
    calloutQuestionBg: "#241E14",
    calloutFactBg: "#152219",
    calloutConnectsBg: "#131F28",
  },
  matcha: {
    id: "matcha",
    label: "MATCHA",
    emoji: "🍵",
    isDark: false,
    canvasBg: "#F0F4ED",
    sidebarBg: "#E2E9DE",
    cardBg: "#F7FAF5",
    popoverBg: "#F7FAF5",
    popoverHoverBg: "#DCE8D5",
    textPrimary: "#16261B",
    textSecondary: "rgba(22, 38, 27, 0.7)",
    textMuted: "rgba(22, 38, 27, 0.45)",
    borderPrimary: "rgba(22, 38, 27, 0.3)",
    borderSubtle: "rgba(22, 38, 27, 0.12)",
    boxShadow: "3px 3px 0 #16261B",
    popoverShadow: "4px 4px 0 #16261B",
    accentColor: "#2E6B47",
    accentFg: "#F5FDF7",
    highlightYellow: "#A7F3D0",
    highlightBg: "rgba(139, 92, 246, 0.16)",
    highlightFg: "#4C1D95",
    highlightBorder: "#8B5CF6",
    activeRowBg: "#D4E1CE",
    activeRowBorder: "#2E6B47",
    codeBg: "#E0E9DC",
    codeBorder: "rgba(22, 38, 27, 0.35)",
    codeFg: "#16261B",
    calloutGotchaBg: "#FCEAE8",
    calloutQuestionBg: "#FEF6E0",
    calloutFactBg: "#E3F8EB",
    calloutConnectsBg: "#E5F4F7",
  },
  midnight: {
    id: "midnight",
    label: "MIDNIGHT",
    emoji: "🌌",
    isDark: true,
    canvasBg: "#0B0E17",
    sidebarBg: "#111625",
    cardBg: "#171D30",
    popoverBg: "#171D30",
    popoverHoverBg: "#232B45",
    textPrimary: "#F1F5F9",
    textSecondary: "rgba(241, 245, 249, 0.65)",
    textMuted: "rgba(241, 245, 249, 0.4)",
    borderPrimary: "rgba(139, 92, 246, 0.3)",
    borderSubtle: "rgba(255, 255, 255, 0.08)",
    boxShadow: "3px 3px 0 rgba(0,0,0,0.8)",
    popoverShadow: "4px 4px 0 rgba(0,0,0,0.9)",
    accentColor: "#8B5CF6",
    accentFg: "#FFFFFF",
    highlightYellow: "#C084FC",
    highlightBg: "rgba(139, 92, 246, 0.35)",
    highlightFg: "#FFFFFF",
    highlightBorder: "#C084FC",
    activeRowBg: "#1D243D",
    activeRowBorder: "#8B5CF6",
    codeBg: "#141A2D",
    codeBorder: "rgba(139, 92, 246, 0.35)",
    codeFg: "#E2E8F0",
    calloutGotchaBg: "#2B1425",
    calloutQuestionBg: "#261B33",
    calloutFactBg: "#0F292B",
    calloutConnectsBg: "#122438",
  },
};

export function getThemeTokens(theme?: NotebookTheme): ThemeTokens {
  return THEME_TOKENS[theme || "cream"] || THEME_TOKENS.cream;
}
