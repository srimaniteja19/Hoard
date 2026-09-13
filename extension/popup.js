// HOARD Browser Extension Popup Logic — v2.0.0

const DEFAULT_SERVER_URL = "https://hoard-ten.vercel.app";
const PENDING_BM_KEY = "hoard_pending_sync";
const PENDING_TIL_KEY = "offline_til_queue";
const PENDING_TODO_KEY = "offline_todo_queue";

const KIND_COLOR = {
  ART: { bg: "#00F0FF", fg: "#000", name: "Article" },
  VID: { bg: "#FF007A", fg: "#fff", name: "Video" },
  PLY: { bg: "#7C4DFF", fg: "#fff", name: "Playlist" },
  GIT: { bg: "#B6FF3C", fg: "#000", name: "Repository" },
  APP: { bg: "#FFE600", fg: "#000", name: "App" },
  PPR: { bg: "#FF6B00", fg: "#000", name: "Paper" },
  DOC: { bg: "#00E58A", fg: "#000", name: "Docs" },
};

// ─── API Client with Bearer Token & Cookie Fallback ──────────────────────────

async function getStoredConfig() {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["hoard_server_url", "hoard_api_token"], (res) => {
        resolve({
          serverUrl: (res.hoard_server_url || DEFAULT_SERVER_URL).replace(/\/$/, ""),
          apiToken: (res.hoard_api_token || "").trim(),
        });
      });
    } else {
      resolve({
        serverUrl: DEFAULT_SERVER_URL,
        apiToken: "",
      });
    }
  });
}

async function hoardFetch(endpoint, options = {}) {
  const { serverUrl, apiToken } = await getStoredConfig();
  const url = endpoint.startsWith("http") ? endpoint : `${serverUrl}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (apiToken) {
    headers["Authorization"] = `Bearer ${apiToken}`;
  }

  return fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
}

// ─── Content Kind Auto-Detection (2-Pass Heuristic) ──────────────────────────

function detectUrlMeta(u) {
  const urlLower = (u || "").toLowerCase().trim();
  const fallback = { ty: "APP", name: "App Shelf", bg: "#FFE600", fg: "#000", f: "Platform: Web" };
  if (!urlLower) return fallback;

  let hostname = "";
  try {
    hostname = new URL(urlLower.startsWith("http") ? urlLower : `https://${urlLower}`).hostname.replace(/^www\./, "");
  } catch {
    hostname = "";
  }

  if (/youtube\.com\/playlist/.test(urlLower)) {
    return { ty: "PLY", name: "Playlist", bg: "#7C4DFF", fg: "#fff", f: "YouTube · Playlist" };
  }
  if (hostname === "youtube.com" || hostname === "youtu.be") {
    return { ty: "VID", name: "Video", bg: "#FF007A", fg: "#fff", f: "YouTube · Video" };
  }
  if (hostname === "open.spotify.com" || hostname === "music.apple.com") {
    return { ty: "PLY", name: "Audio", bg: "#7C4DFF", fg: "#fff", f: "Spotify / Music" };
  }
  if (/github\.com\/[\w.-]+\/[\w.-]+/.test(urlLower)) {
    return { ty: "GIT", name: "Repository", bg: "#B6FF3C", fg: "#000", f: "GitHub · Repo" };
  }
  if (hostname === "arxiv.org" || /\.acm\.org$/.test(hostname) || /\.ieee\.org$/.test(hostname) || hostname === "ieee.org") {
    return { ty: "PPR", name: "Paper", bg: "#FF6B00", fg: "#000", f: "arXiv / Research Paper" };
  }
  if (/raycast|warp\.dev|excalidraw|apps\.apple|play\.google/.test(urlLower)) {
    return { ty: "APP", name: "App Shelf", bg: "#FFE600", fg: "#000", f: "App / Tool" };
  }
  if (hostname.startsWith("docs.") || hostname.startsWith("developer.") || /\/docs\//.test(urlLower)) {
    return { ty: "DOC", name: "Documentation", bg: "#00E58A", fg: "#000", f: "Reference Docs" };
  }

  const isPublishingHost =
    hostname === "medium.com" ||
    hostname.endsWith(".medium.com") ||
    hostname === "substack.com" ||
    hostname.endsWith(".substack.com") ||
    hostname === "dev.to" ||
    hostname === "hashnode.com" ||
    hostname.endsWith(".hashnode.dev") ||
    hostname === "theverge.com" ||
    hostname === "techcrunch.com" ||
    hostname === "wired.com" ||
    hostname === "arstechnica.com" ||
    hostname === "paulgraham.com" ||
    hostname.startsWith("blog.") ||
    hostname.startsWith("posts.");

  const hasArticlePath = /\/(?:posts?|blogs?|articles?|stories?|essays?|writing|read)\//i.test(urlLower);

  if (isPublishingHost || hasArticlePath) {
    return { ty: "ART", name: "Web Article", bg: "#00F0FF", fg: "#000", f: `${hostname} · Article` };
  }

  return fallback;
}

// ─── Desert Ant Gist 36-Topic Taxonomy & Fallback Classifier ─────────────────

const GIST_TAXONOMY_MAP = [
  { slug: "technology", name: "Technology & Software", keywords: ["git", "worktree", "branch", "repo", "repository", "code", "coding", "software", "dev", "developer", "api", "web", "app", "javascript", "typescript", "python", "react", "nextjs", "node", "ai", "llm", "css", "html", "database", "sql", "postgres", "linux", "cloud", "aws", "docker", "kubernetes", "terminal", "algorithm", "compiler", "frontend", "backend", "fullstack", "server", "system", "tech", "computer", "programming", "bug", "cache", "deploy", "cli", "auth", "oauth", "jwt"] },
  { slug: "education", name: "Education & Learning", keywords: ["learn", "learning", "tutorial", "explained", "explaining", "course", "guide", "lecture", "student", "study", "exam", "school", "university", "lesson", "how to", "how-to", "deep dive", "concept", "intro", "introduction", "basics", "fundamental", "fundamentals", "masterclass", "cheatsheet", "tip", "tips", "tricks"] },
  { slug: "career", name: "Careers & Productivity", keywords: ["productivity", "workflow", "worktree", "career", "job", "interview", "resume", "remote work", "management", "leadership", "freelance", "salary", "hiring", "work", "efficient", "efficiency", "time management", "habits", "focus", "organize", "notes", "second brain", "tools", "automation"] },
  { slug: "creator-economy", name: "Creator Economy", keywords: ["youtube", "creator", "content", "podcast", "video", "subscriber", "channel", "audience", "stream", "streaming", "twitch", "tiktok", "influencer", "monetize", "patreon", "newsletter", "media", "sponsor"] },
  { slug: "self-improvement", name: "Self-Improvement", keywords: ["habits", "mindset", "goal", "goals", "motivation", "discipline", "psychology", "mental", "growth", "routine", "meditation", "stoic", "stoicism", "advice", "wisdom", "reflection", "journal"] },
  { slug: "science", name: "Science & Mathematics", keywords: ["physics", "math", "mathematics", "biology", "chemistry", "neuroscience", "quantum", "astronomy", "research", "paper", "arxiv", "scientific", "experiment", "lab", "genetics", "space", "data science"] },
  { slug: "business", name: "Business & Entrepreneurship", keywords: ["startup", "business", "founder", "saas", "venture", "revenue", "sales", "marketing", "customer", "strategy", "enterprise", "pricing", "b2b", "b2c", "market", "product", "growth", "launch", "scale"] },
  { slug: "finance", name: "Personal Finance & Investing", keywords: ["money", "invest", "investing", "stock", "stocks", "crypto", "bitcoin", "ethereum", "budget", "wealth", "tax", "banking", "finance", "portfolio", "trading", "fund", "dividend"] },
  { slug: "health-fitness", name: "Health & Fitness", keywords: ["health", "fitness", "workout", "gym", "diet", "nutrition", "exercise", "sleep", "wellness", "medical", "doctor", "muscle", "running", "training", "cardio", "lifting"] },
  { slug: "crafts-hobbies", name: "Crafts & Hobbies", keywords: ["craft", "diy", "hobby", "woodworking", "knitting", "crochet", "sewing", "origami", "maker", "electronics", "arduino", "raspberry pi"] },
  { slug: "gaming", name: "Gaming", keywords: ["game", "gaming", "playstation", "xbox", "nintendo", "steam", "gameplay", "esports", "fps", "rpg", "multiplayer", "speedrun", "mod", "videogame", "gamer"] },
  { slug: "film-tv", name: "Film & TV", keywords: ["movie", "film", "cinema", "tv", "series", "episode", "actor", "director", "hollywood", "netflix", "trailer", "season", "show", "documentary"] },
  { slug: "music", name: "Music & Audio", keywords: ["music", "song", "album", "artist", "guitar", "piano", "spotify", "sound", "audio", "track", "concert", "band", "synth", "beats", "composition"] },
  { slug: "books-literature", name: "Books & Literature", keywords: ["book", "books", "novel", "author", "reading", "literature", "chapter", "writer", "poem", "poetry", "essay", "fiction", "nonfiction", "non-fiction"] },
  { slug: "news-politics", name: "News & Politics", keywords: ["news", "politics", "election", "government", "policy", "congress", "senate", "president", "court", "democracy", "global", "crisis", "geopolitics"] },
  { slug: "law", name: "Law & Legal", keywords: ["law", "legal", "court", "attorney", "lawyer", "contract", "license", "copyright", "patent", "rights", "statute", "liability", "regulation"] },
  { slug: "arts-culture", name: "Arts & Culture", keywords: ["art", "artist", "museum", "gallery", "painting", "sculpture", "history", "culture", "cultural", "heritage", "theatre", "exhibit"] },
  { slug: "travel", name: "Travel & Tourism", keywords: ["travel", "flight", "hotel", "destination", "trip", "vacation", "city", "tour", "explore", "journey", "itinerary", "backpacking", "airport"] },
  { slug: "food-drink", name: "Food & Beverage", keywords: ["food", "recipe", "cooking", "cook", "restaurant", "baking", "coffee", "wine", "beer", "meal", "chef", "kitchen", "delicious", "barista"] },
  { slug: "home-garden", name: "Home & Gardening", keywords: ["home", "garden", "plant", "interior", "furniture", "diy", "renovation", "decor", "tools", "repair", "homestead", "backyard"] },
  { slug: "automotive", name: "Automotive", keywords: ["car", "cars", "vehicle", "electric vehicle", "ev", "engine", "driving", "tesla", "toyota", "porsche", "racing", "mechanic", "automotive"] },
  { slug: "photography-video", name: "Photography & Video", keywords: ["photo", "photography", "camera", "lens", "shutter", "lighting", "videography", "editing", "premiere", "cinematic", "film"] },
  { slug: "real-estate", name: "Real Estate", keywords: ["real estate", "property", "housing", "mortgage", "apartment", "rent", "tenant", "landlord", "homebuying", "realtor", "home"] },
  { slug: "relationships", name: "Relationships", keywords: ["relationship", "dating", "marriage", "couple", "family", "friendship", "partner", "communication", "empathy", "love", "interpersonal"] },
  { slug: "parenting-family", name: "Parenting & Family", keywords: ["parent", "parenting", "child", "children", "baby", "toddler", "kids", "family", "mother", "father", "schooling", "infant"] },
  { slug: "pets-animals", name: "Pets & Animals", keywords: ["pet", "pets", "dog", "dogs", "cat", "cats", "puppy", "kitten", "vet", "animal", "wildlife", "rescue", "canine"] },
  { slug: "sports", name: "Sports & Athletics", keywords: ["sport", "sports", "football", "soccer", "basketball", "nba", "nfl", "baseball", "tennis", "olympics", "championship", "athlete", "match"] },
  { slug: "outdoors-nature", name: "Outdoors & Nature", keywords: ["nature", "outdoor", "hiking", "camping", "trail", "mountain", "climbing", "wild", "forest", "national park", "wilderness"] },
  { slug: "beauty", name: "Beauty & Grooming", keywords: ["beauty", "skincare", "makeup", "cosmetics", "hair", "perfume", "grooming", "routine", "salon", "style"] },
  { slug: "comedy", name: "Comedy & Humor", keywords: ["comedy", "funny", "humor", "joke", "meme", "standup", "hilarious", "parody", "satire", "sketch"] },
  { slug: "shopping-deals", name: "Shopping & Deals", keywords: ["deal", "discount", "sale", "shopping", "coupon", "amazon", "bargain", "price", "store", "buy"] },
  { slug: "society-culture", name: "Society & Social Issues", keywords: ["society", "community", "social", "activism", "equality", "ethics", "moral", "human rights", "public"] },
  { slug: "spirituality-religion", name: "Spirituality & Religion", keywords: ["faith", "spirituality", "religion", "church", "prayer", "bible", "buddhism", "meditation", "soul", "god"] },
  { slug: "lifestyle-fashion", name: "Lifestyle & Fashion", keywords: ["fashion", "outfit", "wardrobe", "style", "vintage", "clothing", "trend", "luxury", "aesthetic"] },
  { slug: "true-crime", name: "True Crime", keywords: ["crime", "mystery", "detective", "investigation", "murder", "forensic", "case", "unsolved", "heist"] },
  { slug: "history", name: "History", keywords: ["history", "historical", "war", "ancient", "century", "empire", "civilization", "archaeology", "medieval"] }
];

function getFallbackGistTopics(rawText, topK = 4) {
  const text = (rawText || "").toLowerCase();
  if (!text.trim()) return [];

  const scores = GIST_TAXONOMY_MAP.map((topic) => {
    let score = 0;
    for (const kw of topic.keywords) {
      if (kw.includes(" ")) {
        if (text.includes(kw)) score += 3;
      } else {
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        if (regex.test(text)) score += 2;
      }
    }
    return { slug: topic.slug, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const positive = scores.filter((s) => s.score > 0);
  if (positive.length > 0) {
    return positive.slice(0, topK).map((s) => s.slug);
  }

  return ["technology", "education", "career"].slice(0, topK);
}

// ─── Natural Language Todo Parser (Client-Side) ──────────────────────────────

const WEEKDAY_FULL = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};
const MINUTE_VERBS = ["email", "reply", "call", "text", "book", "read", "review"];
const ERRAND_TOKENS = ["call", "buy", "pick up", "errand", "book"];
const DEEP_TOKENS = ["deep", "focus", "research", "architecture", "refactor"];

function parseTodoInput(input) {
  let text = input || "";
  let estimatedMinutes = null;
  let energy = null;
  let dueOffsetDays = null;
  let dueDateStr = null;
  let remindAtLocal = null;
  let recurrenceRule = null;
  const tags = [];
  let urgent = false;

  // 1. Estimate — ~30m, ~2h, !15m
  text = text.replace(/(?:~|!)(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/gi, (full, num, unit) => {
    const n = Number(num);
    const isHours = /^h/i.test(unit);
    estimatedMinutes = isHours ? n * 60 : n;
    return " ";
  });

  // 2. Tags — #tag
  text = text.replace(/#([\w-]+)/g, (full, tag) => {
    tags.push(tag);
    return " ";
  });

  // 3. Urgency — !, !!, !!!, @urgent
  if (/@urgent\b/i.test(text)) {
    urgent = true;
    text = text.replace(/@urgent\b/gi, " ");
  }
  text = text.replace(/(^|\s)(!{1,3})(?=\s|$)/g, (full, pre) => {
    urgent = true;
    return pre === "" ? "" : pre;
  });

  // 4. Recurrence — every day/weekday/week/month/<weekday>
  text = text.replace(/\bevery\s+(day|weekday|week|month|sun|mon|tue|wed|thu|fri|sat)\b/gi, (full, unit) => {
    const u = unit.toLowerCase();
    recurrenceRule = `every ${u}`;
    return " ";
  });

  // 5. Due date — today/tomorrow/tmrw/<weekday>/next week
  const dueWordPattern = "(today|tomorrow|tmrw|next\\s+week|sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)";
  const prepositionLed = new RegExp(`\\b(on|by|due|for)\\s+${dueWordPattern}\\b`, "i");
  const trailingDue = new RegExp(`\\b${dueWordPattern}\\s*$`, "i");

  const today = new Date();
  const currentDow = today.getDay();

  const applyDue = (word) => {
    const w = word.toLowerCase();
    if (w === "today") { dueOffsetDays = 0; dueDateStr = "Today"; return; }
    if (w === "tomorrow" || w === "tmrw") { dueOffsetDays = 1; dueDateStr = "Tomorrow"; return; }
    if (w === "next week") { dueOffsetDays = 7; dueDateStr = "Next Week"; return; }
    const targetDow = WEEKDAY_FULL[w];
    if (targetDow !== undefined) {
      dueOffsetDays = (targetDow - currentDow + 7) % 7 || 7;
      dueDateStr = w.slice(0, 3).toUpperCase();
    }
  };

  let m = text.match(prepositionLed);
  if (m) {
    applyDue(m[2]);
    text = text.slice(0, m.index) + text.slice((m.index || 0) + m[0].length);
  } else {
    m = text.match(trailingDue);
    if (m) {
      applyDue(m[1]);
      text = text.slice(0, m.index);
    }
  }

  // 6. Reminder time — 3pm, at 15:00, 9:30am
  const timePattern = "(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)|(\\d{1,2}):(\\d{2})";
  const atLed = new RegExp(`\\bat\\s+(?:${timePattern})\\b`, "i");
  const trailingTime = new RegExp(`\\b(?:${timePattern})\\s*$`, "i");

  const toHHmm = (h12, min12, ampm, h24, min24) => {
    if (h24 !== undefined) return `${h24.padStart(2, "0")}:${min24}`;
    let h = Number(h12);
    const min = min12 || "00";
    const isPm = ampm.toLowerCase() === "pm";
    if (isPm && h !== 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  };

  m = text.match(atLed);
  if (m) {
    remindAtLocal = toHHmm(m[1], m[2], m[3], m[4], m[5]);
    text = text.slice(0, m.index) + text.slice((m.index || 0) + m[0].length);
  } else {
    m = text.match(trailingTime);
    if (m) {
      remindAtLocal = toHHmm(m[1], m[2], m[3], m[4], m[5]);
      text = text.slice(0, m.index);
    }
  }

  // 7. Energy
  for (const word of DEEP_TOKENS) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
      energy = "DEEP";
      break;
    }
  }
  if (!energy) {
    for (const word of ERRAND_TOKENS) {
      if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
        energy = "ERRAND";
        break;
      }
    }
  }

  const title = text.replace(/\s+/g, " ").trim();
  const leadingWord = title.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || "";

  if (estimatedMinutes === null) {
    estimatedMinutes = MINUTE_VERBS.includes(leadingWord) ? 15 : 25;
  }
  if (!energy) {
    energy = estimatedMinutes >= 40 ? "DEEP" : "SHALLOW";
  }

  return {
    title,
    estimatedMinutes,
    energy,
    dueOffsetDays,
    dueDateStr,
    remindAtLocal,
    recurrenceRule,
    tags,
    urgent,
  };
}

// ─── DOM Ready Initializer ───────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Navigation elements
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  const syncStatus = document.getElementById("syncStatus");

  // Tab 1: Bookmark elements
  const pageTitleInput = document.getElementById("pageTitle");
  const pageUrlInput = document.getElementById("pageUrl");
  const pageNoteInput = document.getElementById("pageNote");
  const pageMinsInput = document.getElementById("pageMins");
  const folderSelect = document.getElementById("folderSelect");
  const tagChips = document.querySelectorAll(".tag-chip");
  const customTagInput = document.getElementById("customTag");
  const saveBtn = document.getElementById("saveBtn");
  const detectType = document.getElementById("detectType");
  const detectTitle = document.getElementById("detectTitle");
  const detectDetails = document.getElementById("detectDetails");
  const triageStatus = document.getElementById("triageStatus");
  const itemTypeToggle = document.getElementById("itemTypeToggle");

  // Tab 2: TIL elements
  const tilSubNavCapture = document.getElementById("tilSubNavCapture");
  const tilSubNavReview = document.getElementById("tilSubNavReview");
  const tilCaptureView = document.getElementById("tilCaptureView");
  const tilReviewView = document.getElementById("tilReviewView");
  const tilDueCount = document.getElementById("tilDueCount");
  const tilTypeChips = document.querySelectorAll("#tilTypeChips .til-chip");
  const tilBodyInput = document.getElementById("tilBody");
  const tilSnippetGroup = document.getElementById("tilSnippetGroup");
  const tilCodeInput = document.getElementById("tilCode");
  const tilLinkUrlInput = document.getElementById("tilLinkUrl");
  const tilDischargeSelect = document.getElementById("tilDischargeSelect");
  const tilTagsInput = document.getElementById("tilTags");
  const tilSaveToQueue = document.getElementById("tilSaveToQueue");
  const commitTilBtn = document.getElementById("commitTilBtn");

  // Spaced Review elements
  const reviewCard = document.getElementById("reviewCard");
  const reviewTypeBadge = document.getElementById("reviewTypeBadge");
  const reviewFront = document.getElementById("reviewFront");
  const reviewBack = document.getElementById("reviewBack");
  const reviewCodeBlock = document.getElementById("reviewCodeBlock");
  const reviewMetaInfo = document.getElementById("reviewMetaInfo");
  const revealAnswerBtn = document.getElementById("revealAnswerBtn");
  const reviewActions = document.getElementById("reviewActions");
  const reviewEmpty = document.getElementById("reviewEmpty");

  // Tab 3: Todos elements
  const todoInput = document.getElementById("todoInput");
  const addTodoBtn = document.getElementById("addTodoBtn");
  const addTabAsTodoBtn = document.getElementById("addTabAsTodoBtn");
  const todoList = document.getElementById("todoList");
  const todoOpenCount = document.getElementById("todoOpenCount");
  const todoTodayCount = document.getElementById("todoTodayCount");
  const todoFilterBtns = document.querySelectorAll("[data-todo-filter]");

  // Parsed pills
  const pillEnergy = document.getElementById("pillEnergy");
  const pillEstimate = document.getElementById("pillEstimate");
  const pillDue = document.getElementById("pillDue");
  const pillRemind = document.getElementById("pillRemind");
  const pillUrgent = document.getElementById("pillUrgent");
  const pillRecur = document.getElementById("pillRecur");

  // Tab 4: Search elements
  const searchInHoard = document.getElementById("searchInHoard");
  const hoardList = document.getElementById("hoardList");
  const filterChips = document.querySelectorAll(".filter-chip");

  // Tab 5: Settings elements
  const serverUrlInput = document.getElementById("serverUrl");
  const apiTokenInput = document.getElementById("apiToken");
  const toggleTokenVisibilityBtn = document.getElementById("toggleTokenVisibilityBtn");
  const testConnectionBtn = document.getElementById("testConnectionBtn");
  const testConnResult = document.getElementById("testConnResult");
  const offlineQueueCount = document.getElementById("offlineQueueCount");
  const forceSyncBtn = document.getElementById("forceSyncBtn");
  const openWebAppBtn = document.getElementById("openWebAppBtn");

  // ─── State Declarations (Placed before usage) ─────────────────────────────
  let currentActiveTab = null;
  let selectedText = "";
  let selectedTilType = "FACT";
  let activeTags = new Set(["ai"]);
  let selectedItemType = "REFERENCE";
  let triageTouched = { folder: false, tags: false, itemType: false, note: false };
  let currentTodoFilter = "open";
  let allTodos = [];
  let dueReviewItems = [];
  let currentReviewIndex = 0;
  let triageDebounce = null;
  let searchDebounce = null;

  // ─── Settings Setup ──────────────────────────────────────────────────────────

  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get(["hoard_server_url", "hoard_api_token"], (res) => {
      if (res.hoard_server_url && serverUrlInput) serverUrlInput.value = res.hoard_server_url;
      if (res.hoard_api_token && apiTokenInput) apiTokenInput.value = res.hoard_api_token;
      updateSyncStatusBadge();
    });
  }

  if (serverUrlInput) {
    serverUrlInput.addEventListener("change", () => {
      const url = serverUrlInput.value.trim();
      chrome.storage?.local.set({ hoard_server_url: url });
    });
  }

  if (apiTokenInput) {
    apiTokenInput.addEventListener("change", () => {
      const token = apiTokenInput.value.trim();
      chrome.storage?.local.set({ hoard_api_token: token });
    });
  }

  if (toggleTokenVisibilityBtn && apiTokenInput) {
    toggleTokenVisibilityBtn.addEventListener("click", () => {
      apiTokenInput.type = apiTokenInput.type === "password" ? "text" : "password";
    });
  }

  // ─── Functions for Triage & Detection ──────────────────────────────────────

  function updateDetectionUI(url) {
    const meta = detectUrlMeta(url);
    if (detectType) {
      detectType.textContent = meta.ty;
      detectType.style.background = meta.bg;
      detectType.style.color = meta.fg;
    }
    if (detectTitle) detectTitle.textContent = meta.name;
    if (detectDetails) detectDetails.textContent = meta.f;
    if (pageMinsInput) {
      pageMinsInput.value = meta.ty === "VID" ? "45" : meta.ty === "PPR" ? "40" : "15";
    }
  }

  function flattenFolders(nodes, depth = 0, out = []) {
    (nodes || []).forEach((node) => {
      if (node.id !== "all") {
        out.push({ id: node.id, name: `${"— ".repeat(depth)}${node.name}` });
      }
      if (node.kids) flattenFolders(node.kids, depth + 1, out);
    });
    return out;
  }

  async function loadCollections() {
    if (!folderSelect) return;
    try {
      const res = await hoardFetch("/api/collections");
      if (!res.ok) return;
      const tree = await res.json();
      const folders = flattenFolders(tree);
      if (folders.length === 0) return;
      const current = folderSelect.value;
      folderSelect.innerHTML = folders
        .map((f) => `<option value="${f.id}">${f.name}</option>`)
        .join("");
      if ([...folderSelect.options].some((o) => o.value === current)) {
        folderSelect.value = current;
      }
    } catch (e) {
      console.warn("Could not load collections:", e);
    }
  }

  async function runTriage() {
    const url = pageUrlInput?.value?.trim();
    if (!url) return;
    const meta = detectUrlMeta(url);
    if (triageStatus) triageStatus.textContent = "TRIAGING…";

    // Immediate client-side fallback tags while network call runs
    const fallbackText = `${pageTitleInput?.value || ""} ${pageNoteInput?.value || ""} ${url}`;
    const fallbackTags = getFallbackGistTopics(fallbackText, 4);
    if (fallbackTags.length > 0) {
      renderBookmarkSuggestions(fallbackTags);
      if (!triageTouched.tags && fallbackTags[0] && activeTags.size === 0) {
        setPrimaryTag(fallbackTags[0]);
      }
    }

    try {
      const res = await hoardFetch("/api/bookmarks/triage", {
        method: "POST",
        body: JSON.stringify({
          url,
          title: pageTitleInput?.value || "",
          description: pageNoteInput?.value || "",
          kind: meta.ty,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!triageTouched.itemType && (data.itemType === "REFERENCE" || data.itemType === "QUEUED")) {
        setItemType(data.itemType);
      }
      if (!triageTouched.tags && Array.isArray(data.tags) && data.tags[0]) {
        setPrimaryTag(data.tags[0]);
      }
      const combinedSuggestions = [
        ...(Array.isArray(data.tags) ? data.tags : []),
        ...(Array.isArray(data.gistTopics) ? data.gistTopics.map((t) => t.tag || t.slug) : []),
        ...fallbackTags,
      ];
      renderBookmarkSuggestions(Array.from(new Set(combinedSuggestions)).filter(Boolean));
      if (!triageTouched.folder && data.suggestedCollection && folderSelect) {
        if (![...folderSelect.options].some((o) => o.value === data.suggestedCollection)) {
          const opt = document.createElement("option");
          opt.value = data.suggestedCollection;
          opt.textContent = data.collectionName || data.suggestedCollection;
          folderSelect.appendChild(opt);
        }
        folderSelect.value = data.suggestedCollection;
      }
      if (!triageTouched.note && data.summary && pageNoteInput && !pageNoteInput.value.trim()) {
        pageNoteInput.value = data.summary;
      }
      if (triageStatus) triageStatus.textContent = "TRIAGED ✓";
    } catch {
      if (triageStatus) triageStatus.textContent = "TRIAGE IDLE";
      if (fallbackTags.length > 0) {
        renderBookmarkSuggestions(fallbackTags);
      }
    }
  }

  const bookmarkSuggestedRow = document.getElementById("suggestedTagsRow");
  const bookmarkSuggestedList = document.getElementById("suggestedTagsList");

  function renderBookmarkSuggestions(suggestedList) {
    if (!bookmarkSuggestedRow || !bookmarkSuggestedList) return;
    bookmarkSuggestedList.innerHTML = "";
    if (!suggestedList || suggestedList.length === 0) {
      bookmarkSuggestedRow.style.display = "none";
      return;
    }

    suggestedList.forEach((raw) => {
      const tag = (raw || "").replace(/^#/, "").trim();
      if (!tag) return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `suggested-chip ${activeTags.has(tag) ? "selected" : ""}`;
      chip.textContent = `+#${tag}`;
      chip.addEventListener("click", () => {
        triageTouched.tags = true;
        if (activeTags.has(tag)) {
          activeTags.delete(tag);
          chip.classList.remove("selected");
        } else {
          activeTags.add(tag);
          chip.classList.add("selected");
        }
        tagChips.forEach((tc) => {
          if (tc.getAttribute("data-tag") === tag) {
            tc.classList.toggle("active", activeTags.has(tag));
          }
        });
      });
      bookmarkSuggestedList.appendChild(chip);
    });

    bookmarkSuggestedRow.style.display = bookmarkSuggestedList.children.length > 0 ? "flex" : "none";
  }

  function scheduleTriage() {
    if (triageDebounce) clearTimeout(triageDebounce);
    triageDebounce = setTimeout(runTriage, 400);
  }

  function setItemType(next) {
    selectedItemType = next === "QUEUED" ? "QUEUED" : "REFERENCE";
    itemTypeToggle?.querySelectorAll(".item-type-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-item-type") === selectedItemType);
    });
  }

  function setPrimaryTag(tag) {
    const next = (tag || "saved").replace(/^#/, "").trim();
    if (!next) return;
    activeTags = new Set([next]);
    tagChips.forEach((chip) => {
      chip.classList.toggle("active", chip.getAttribute("data-tag") === next);
    });
  }

  // ─── Active Tab Query ───────────────────────────────────────────────────────

  if (typeof chrome !== "undefined" && chrome.tabs) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        currentActiveTab = tabs[0];
        if (pageTitleInput) pageTitleInput.value = currentActiveTab.title || "";
        if (pageUrlInput) pageUrlInput.value = currentActiveTab.url || "";
        if (tilLinkUrlInput) tilLinkUrlInput.value = currentActiveTab.url || "";

        updateDetectionUI(currentActiveTab.url);
        scheduleTriage();
        loadCollections();

        // Extract selected text
        try {
          const selResult = await chrome.scripting.executeScript({
            target: { tabId: currentActiveTab.id },
            func: () => window.getSelection()?.toString() || "",
          });
          const text = selResult?.[0]?.result;
          if (text && text.trim()) {
            selectedText = text.trim();
            if (pageNoteInput) pageNoteInput.value = selectedText;
            if (tilBodyInput) tilBodyInput.value = `"${selectedText}"`;
            const saveLabel = saveBtn?.querySelector("span");
            if (saveLabel) saveLabel.textContent = "SAVE HIGHLIGHT";
          }
        } catch {}

        fetchTilSuggestions(true);
      }
    } catch (err) {
      console.warn("Could not query active tab:", err);
    }
  }

  // URL Input Detection
  pageUrlInput?.addEventListener("input", (e) => {
    updateDetectionUI(e.target.value);
    scheduleTriage();
  });

  itemTypeToggle?.querySelectorAll(".item-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      triageTouched.itemType = true;
      setItemType(btn.getAttribute("data-item-type"));
    });
  });

  folderSelect?.addEventListener("change", () => {
    triageTouched.folder = true;
  });

  pageNoteInput?.addEventListener("input", () => {
    triageTouched.note = true;
  });

  tagChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const tagName = chip.getAttribute("data-tag");
      triageTouched.tags = true;
      if (activeTags.has(tagName)) {
        activeTags.delete(tagName);
        chip.classList.remove("active");
      } else {
        activeTags.add(tagName);
        chip.classList.add("active");
      }
    });
  });

  customTagInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && customTagInput.value.trim()) {
      e.preventDefault();
      const rawTag = customTagInput.value.trim().replace(/^#/, "");
      triageTouched.tags = true;
      activeTags.add(rawTag);

      const newChip = document.createElement("button");
      newChip.type = "button";
      newChip.className = "tag-chip active";
      newChip.setAttribute("data-tag", rawTag);
      newChip.textContent = `#${rawTag}`;
      newChip.addEventListener("click", () => {
        if (activeTags.has(rawTag)) {
          activeTags.delete(rawTag);
          newChip.classList.remove("active");
        } else {
          activeTags.add(rawTag);
          newChip.classList.add("active");
        }
      });
      document.getElementById("tagPicker")?.appendChild(newChip);
      customTagInput.value = "";
    }
  });

  // ─── TAB 1: SAVE BOOKMARK ──────────────────────────────────────────────────

  saveBtn?.addEventListener("click", async () => {
    const url = pageUrlInput.value.trim();
    const title = pageTitleInput.value.trim() || "New Bookmark";
    if (!url) {
      showToast("⚠️ PLEASE ENTER A VALID URL", true);
      return;
    }

    const meta = detectUrlMeta(url);
    let domain = "web";
    try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch {}

    const firstTag = Array.from(activeTags)[0] || "saved";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = new Date();

    const newBookmark = {
      t: title,
      ty: meta.ty,
      src: domain,
      url,
      mins: parseInt(pageMinsInput?.value || "15", 10),
      tag: firstTag,
      coll: folderSelect.value || "unsorted",
      unread: selectedItemType === "QUEUED",
      itemType: selectedItemType,
      itemTypeGuessed: false,
      triaged: true,
      ex: { Source: domain, Type: meta.name },
      note: pageNoteInput.value.trim() || "",
      source: "Saved via HOARD Extension",
      when: `${months[d.getMonth()]} ${d.getDate()}`,
      ...(selectedText ? { quote: pageNoteInput.value.trim() || selectedText } : {}),
    };

    // Save to extension's local cache
    chrome.storage?.local.get(["hoard_bookmarks"], (res) => {
      const list = res.hoard_bookmarks || [];
      list.unshift({ ...newBookmark, id: Date.now() });
      chrome.storage.local.set({ hoard_bookmarks: list });
    });

    try {
      const res = await hoardFetch("/api/bookmarks", {
        method: "POST",
        body: JSON.stringify(newBookmark),
      });

      if (res.ok) {
        showToast("✓ SAVED TO HOARD");
        chrome.runtime?.sendMessage({ action: "bookmark_saved" });
        return;
      }
    } catch {}

    // Offline Queue
    chrome.storage?.local.get([PENDING_BM_KEY], (res) => {
      const pending = res[PENDING_BM_KEY] || [];
      pending.push(newBookmark);
      chrome.storage.local.set({ [PENDING_BM_KEY]: pending }, () => {
        showToast("✓ SAVED OFFLINE — will sync");
        chrome.runtime?.sendMessage({ action: "bookmark_saved" });
      });
    });
  });

  // ─── TAB 2: TIL CAPTURE & REVIEWS ──────────────────────────────────────────

  tilTypeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      tilTypeChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      selectedTilType = chip.getAttribute("data-type") || "FACT";
      if (tilSnippetGroup) {
        tilSnippetGroup.style.display = selectedTilType === "SNIPPET" ? "block" : "none";
      }
    });
  });

  async function loadUnreadBookmarksForDischarge() {
    if (!tilDischargeSelect) return;
    try {
      const res = await hoardFetch("/api/bookmarks?unread=true");
      if (res.ok) {
        const bookmarks = await res.json();
        tilDischargeSelect.innerHTML = `<option value="">-- Optional: Mark an unread bookmark as finished --</option>`;
        bookmarks.forEach((b) => {
          const opt = document.createElement("option");
          opt.value = String(b.id);
          opt.textContent = `[${b.ty}] ${b.title || b.url}`;
          tilDischargeSelect.appendChild(opt);
        });
      }
    } catch {}
  }

  const tilSuggestedRow = document.getElementById("tilSuggestedTagsRow");
  const tilSuggestedList = document.getElementById("tilSuggestedTagsList");
  let tilSuggestDebounce = null;

  function fetchTilSuggestions(immediate = false) {
    if (tilSuggestDebounce) clearTimeout(tilSuggestDebounce);

    const run = async () => {
      const text = `${tilBodyInput?.value || ""} ${tilLinkUrlInput?.value || ""} ${currentActiveTab?.title || ""}`.trim();
      if (!text || text.length < 3) {
        if (tilSuggestedRow) tilSuggestedRow.style.display = "none";
        return;
      }

      // 1. Instant local Gist classification across 36-topic taxonomy
      const fallbackTags = getFallbackGistTopics(text, 4);
      if (fallbackTags.length > 0) {
        renderTilSuggestions(fallbackTags);
      }

      // 2. Query API / on-device Gist model for deeper server inferences
      try {
        const res = await hoardFetch("/api/suggest-tags", {
          method: "POST",
          body: JSON.stringify({ text, topK: 4 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tags) && data.tags.length > 0) {
            renderTilSuggestions(data.tags);
          }
        }
      } catch {
        // Fallback is already displayed
      }
    };

    if (immediate) {
      run();
    } else {
      tilSuggestDebounce = setTimeout(run, 200);
    }
  }

  function renderTilSuggestions(tags) {
    if (!tilSuggestedRow || !tilSuggestedList) return;
    tilSuggestedList.innerHTML = "";
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      tilSuggestedRow.style.display = "none";
      return;
    }

    const currentTags = (tilTagsInput?.value || "")
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean);

    let count = 0;
    tags.forEach((rawTag) => {
      const tag = (rawTag || "").trim().toLowerCase().replace(/^#/, "");
      if (!tag || currentTags.includes(tag)) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggested-chip";
      btn.textContent = `+#${tag}`;
      btn.addEventListener("click", () => {
        const existing = (tilTagsInput?.value || "").trim();
        if (!existing) {
          if (tilTagsInput) tilTagsInput.value = tag;
        } else {
          const parts = existing.split(",").map((p) => p.trim()).filter(Boolean);
          if (!parts.includes(tag)) {
            parts.push(tag);
            if (tilTagsInput) tilTagsInput.value = parts.join(", ");
          }
        }
        btn.remove();
        if (tilSuggestedList.children.length === 0) {
          tilSuggestedRow.style.display = "none";
        }
      });
      tilSuggestedList.appendChild(btn);
      count++;
    });

    tilSuggestedRow.style.display = count > 0 ? "flex" : "none";
  }

  tilBodyInput?.addEventListener("input", () => fetchTilSuggestions(false));
  tilBodyInput?.addEventListener("change", () => fetchTilSuggestions(true));
  tilBodyInput?.addEventListener("paste", () => setTimeout(() => fetchTilSuggestions(true), 50));
  tilLinkUrlInput?.addEventListener("input", () => fetchTilSuggestions(false));
  tilLinkUrlInput?.addEventListener("change", () => fetchTilSuggestions(true));
  tilLinkUrlInput?.addEventListener("paste", () => setTimeout(() => fetchTilSuggestions(true), 50));
  tilTagsInput?.addEventListener("input", () => fetchTilSuggestions(false));
  tilDischargeSelect?.addEventListener("change", () => fetchTilSuggestions(true));

  commitTilBtn?.addEventListener("click", async () => {
    const bodyText = tilBodyInput.value.trim();
    const codeText = tilCodeInput ? tilCodeInput.value.trim() : "";
    if (!bodyText && (selectedTilType !== "SNIPPET" || !codeText)) {
      showToast("⚠️ PLEASE ENTER LEARNING BODY OR CODE", true);
      return;
    }

    const rawTags = tilTagsInput ? tilTagsInput.value : "";
    const tags = rawTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const payload = {
      type: selectedTilType,
      body: bodyText,
      code: selectedTilType === "SNIPPET" ? codeText : undefined,
      linkUrl: tilLinkUrlInput ? tilLinkUrlInput.value.trim() || undefined : undefined,
      dischargesBookmarkId: tilDischargeSelect?.value ? parseInt(tilDischargeSelect.value, 10) : undefined,
      tags,
      saveToHoardQueue: tilSaveToQueue ? tilSaveToQueue.checked : false,
    };

    try {
      const res = await hoardFetch("/api/til", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("✓ TIL COMMITTED!");
        tilBodyInput.value = "";
        if (tilCodeInput) tilCodeInput.value = "";
        if (tilTagsInput) tilTagsInput.value = "";
        if (tilSuggestedRow) tilSuggestedRow.style.display = "none";
        if (tilSuggestedList) tilSuggestedList.innerHTML = "";
        chrome.runtime?.sendMessage({ action: "til_saved" });
        return;
      }
    } catch {}

    // Offline Queue
    chrome.storage?.local.get([PENDING_TIL_KEY], (res) => {
      const queue = res[PENDING_TIL_KEY] || [];
      queue.push({ ...payload, createdAt: new Date().toISOString() });
      chrome.storage.local.set({ [PENDING_TIL_KEY]: queue }, () => {
        showToast("✓ TIL SAVED OFFLINE — will sync");
        chrome.runtime?.sendMessage({ action: "til_saved" });
      });
    });
  });

  // Spaced Review Sub-Nav
  tilSubNavCapture?.addEventListener("click", () => {
    tilSubNavCapture.classList.add("active");
    tilSubNavReview.classList.remove("active");
    tilCaptureView.style.display = "flex";
    tilReviewView.style.display = "none";
  });

  tilSubNavReview?.addEventListener("click", () => {
    tilSubNavReview.classList.add("active");
    tilSubNavCapture.classList.remove("active");
    tilCaptureView.style.display = "none";
    tilReviewView.style.display = "flex";
    loadDueReviewCards();
  });

  async function loadDueReviewCards() {
    try {
      const res = await hoardFetch("/api/til?limit=30");
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        dueReviewItems = items;
        currentReviewIndex = 0;
        if (tilDueCount) tilDueCount.textContent = String(dueReviewItems.length);
        renderCurrentReviewCard();
      }
    } catch {
      renderCurrentReviewCard();
    }
  }

  function renderCurrentReviewCard() {
    if (!dueReviewItems || dueReviewItems.length === 0 || currentReviewIndex >= dueReviewItems.length) {
      if (reviewCard) reviewCard.style.display = "none";
      if (reviewEmpty) reviewEmpty.style.display = "block";
      return;
    }

    const item = dueReviewItems[currentReviewIndex];
    if (reviewCard) reviewCard.style.display = "flex";
    if (reviewEmpty) reviewEmpty.style.display = "none";

    if (reviewTypeBadge) {
      reviewTypeBadge.textContent = item.type;
      reviewTypeBadge.style.background = KIND_COLOR[item.type]?.bg || "var(--cyan)";
    }

    if (reviewFront) {
      reviewFront.textContent = item.body || (item.tags ? `#${item.tags.join(" #")}` : "Learning concept");
    }
    if (reviewBack) reviewBack.style.display = "none";
    if (revealAnswerBtn) revealAnswerBtn.style.display = "block";
    if (reviewActions) reviewActions.style.display = "none";

    if (item.code && reviewCodeBlock) {
      reviewCodeBlock.textContent = item.code;
      reviewCodeBlock.style.display = "block";
    } else if (reviewCodeBlock) {
      reviewCodeBlock.style.display = "none";
    }

    if (reviewMetaInfo) {
      const tagStr = (item.tags || []).map((t) => `#${t}`).join(" ");
      let host = "";
      try { if (item.linkUrl) host = new URL(item.linkUrl).hostname; } catch {}
      reviewMetaInfo.textContent = `${item.loggedFor || ""} ${tagStr} ${host ? `· ↗ ${host}` : ""}`;
    }
  }

  revealAnswerBtn?.addEventListener("click", () => {
    if (reviewBack) reviewBack.style.display = "block";
    if (revealAnswerBtn) revealAnswerBtn.style.display = "none";
    if (reviewActions) reviewActions.style.display = "grid";
  });

  document.querySelectorAll(".rating-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const rating = parseInt(btn.getAttribute("data-rating"), 10);
      const item = dueReviewItems[currentReviewIndex];
      if (item) {
        hoardFetch(`/api/til/${item.id}/review`, {
          method: "POST",
          body: JSON.stringify({ rating }),
        }).catch(() => {});
      }

      currentReviewIndex++;
      if (tilDueCount) {
        tilDueCount.textContent = String(Math.max(0, dueReviewItems.length - currentReviewIndex));
      }
      renderCurrentReviewCard();
      showToast("✓ RATING RECORDED");
    });
  });

  // ─── TAB 3: TODOS INBOX & CAPTURE ──────────────────────────────────────────

  function updateParsedPills(parsed) {
    if (!todoInput || !todoInput.value.trim()) {
      [pillEnergy, pillEstimate, pillDue, pillRemind, pillUrgent, pillRecur].forEach((p) => {
        if (p) p.style.display = "none";
      });
      return;
    }

    if (pillEnergy) {
      pillEnergy.textContent = `⚡ ${parsed.energy}`;
      pillEnergy.style.display = "inline-block";
    }
    if (pillEstimate) {
      pillEstimate.textContent = `⏱️ ${parsed.estimatedMinutes}m`;
      pillEstimate.style.display = "inline-block";
    }
    if (pillDue) {
      if (parsed.dueDateStr) {
        pillDue.textContent = `📅 ${parsed.dueDateStr}`;
        pillDue.style.display = "inline-block";
      } else {
        pillDue.style.display = "none";
      }
    }
    if (pillRemind) {
      if (parsed.remindAtLocal) {
        pillRemind.textContent = `⏰ ${parsed.remindAtLocal}`;
        pillRemind.style.display = "inline-block";
      } else {
        pillRemind.style.display = "none";
      }
    }
    if (pillUrgent) {
      pillUrgent.style.display = parsed.urgent ? "inline-block" : "none";
    }
    if (pillRecur) {
      if (parsed.recurrenceRule) {
        pillRecur.textContent = `🔁 ${parsed.recurrenceRule}`;
        pillRecur.style.display = "inline-block";
      } else {
        pillRecur.style.display = "none";
      }
    }
  }

  todoInput?.addEventListener("input", () => {
    const parsed = parseTodoInput(todoInput.value);
    updateParsedPills(parsed);
  });

  todoInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTodo();
    }
  });

  addTodoBtn?.addEventListener("click", handleAddTodo);

  async function handleAddTodo() {
    const rawText = todoInput.value.trim();
    if (!rawText) return;

    try {
      const res = await hoardFetch("/api/todos", {
        method: "POST",
        body: JSON.stringify({ text: rawText }),
      });

      if (res.ok) {
        showToast("✓ TASK CREATED");
        todoInput.value = "";
        if (todoSuggestedRow) todoSuggestedRow.style.display = "none";
        if (todoSuggestedList) todoSuggestedList.innerHTML = "";
        updateParsedPills(parseTodoInput(""));
        loadTodos();
        chrome.runtime?.sendMessage({ action: "todo_saved" });
        return;
      }
    } catch {}

    // Offline queue fallback
    chrome.storage?.local.get([PENDING_TODO_KEY], (res) => {
      const queue = res[PENDING_TODO_KEY] || [];
      queue.push({ text: rawText, createdAt: new Date().toISOString() });
      chrome.storage.local.set({ [PENDING_TODO_KEY]: queue }, () => {
        showToast("✓ TASK SAVED OFFLINE — will sync");
        todoInput.value = "";
        if (todoSuggestedRow) todoSuggestedRow.style.display = "none";
        if (todoSuggestedList) todoSuggestedList.innerHTML = "";
        updateParsedPills(parseTodoInput(""));
        chrome.runtime?.sendMessage({ action: "todo_saved" });
      });
    });
  }

  const todoSuggestedRow = document.getElementById("todoSuggestedTagsRow");
  const todoSuggestedList = document.getElementById("todoSuggestedTagsList");
  let todoSuggestDebounce = null;

  function fetchTodoSuggestions(immediate = false) {
    if (todoSuggestDebounce) clearTimeout(todoSuggestDebounce);

    const run = async () => {
      const text = todoInput?.value?.trim() || "";
      if (!text || text.length < 3) {
        if (todoSuggestedRow) todoSuggestedRow.style.display = "none";
        return;
      }

      // 1. Instant client-side fallback using Desert Ant Gist 36-topic taxonomy
      const fallbackTags = getFallbackGistTopics(text, 4);
      if (fallbackTags.length > 0) {
        renderTodoSuggestions(fallbackTags);
      }

      // 2. Query API / on-device Gist model
      try {
        const res = await hoardFetch("/api/suggest-tags", {
          method: "POST",
          body: JSON.stringify({ text, topK: 4 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tags) && data.tags.length > 0) {
            renderTodoSuggestions(data.tags);
          }
        }
      } catch {}
    };

    if (immediate) {
      run();
    } else {
      todoSuggestDebounce = setTimeout(run, 200);
    }
  }

  function renderTodoSuggestions(tags) {
    if (!todoSuggestedRow || !todoSuggestedList) return;
    todoSuggestedList.innerHTML = "";
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      todoSuggestedRow.style.display = "none";
      return;
    }

    const currentText = (todoInput?.value || "").toLowerCase();
    let count = 0;
    tags.forEach((rawTag) => {
      const tag = (rawTag || "").trim().toLowerCase().replace(/^#/, "");
      if (!tag || currentText.includes(`#${tag}`)) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "suggested-chip";
      btn.textContent = `+#${tag}`;
      btn.addEventListener("click", () => {
        if (todoInput) {
          todoInput.value = `${todoInput.value.trim()} #${tag}`;
          updateParsedPills(parseTodoInput(todoInput.value));
        }
        btn.remove();
        if (todoSuggestedList.children.length === 0) {
          todoSuggestedRow.style.display = "none";
        }
      });
      todoSuggestedList.appendChild(btn);
      count++;
    });

    todoSuggestedRow.style.display = count > 0 ? "flex" : "none";
  }

  todoInput?.addEventListener("input", () => fetchTodoSuggestions(false));
  todoInput?.addEventListener("change", () => fetchTodoSuggestions(true));
  todoInput?.addEventListener("paste", () => setTimeout(() => fetchTodoSuggestions(true), 50));

  addTabAsTodoBtn?.addEventListener("click", () => {
    if (currentActiveTab) {
      const title = currentActiveTab.title || "Web Resource";
      const cleanTitle = title.length > 50 ? `${title.slice(0, 47)}...` : title;
      todoInput.value = `Read: ${cleanTitle} ~25m #reading`;
      updateParsedPills(parseTodoInput(todoInput.value));
      todoInput.focus();
      fetchTodoSuggestions();
    }
  });

  async function loadTodos() {
    if (!todoList) return;
    try {
      const res = await hoardFetch("/api/todos");
      if (res.ok) {
        const data = await res.json();
        allTodos = data.items || [];
        renderTodoList();
      }
    } catch {
      renderTodoList();
    }
  }

  function renderTodoList() {
    if (!todoList) return;
    todoList.innerHTML = "";

    const todayStr = new Date().toISOString().slice(0, 10);
    const openTodos = allTodos.filter((t) => t.state !== "DONE");
    const todayTodos = allTodos.filter((t) => t.dueDate === todayStr || (t.state !== "DONE" && !t.dueDate));

    if (todoOpenCount) todoOpenCount.textContent = String(openTodos.length);
    if (todoTodayCount) todoTodayCount.textContent = String(todayTodos.length);

    let filtered = allTodos;
    if (currentTodoFilter === "open") {
      filtered = allTodos.filter((t) => t.state !== "DONE");
    } else if (currentTodoFilter === "today") {
      filtered = todayTodos;
    } else if (currentTodoFilter === "done") {
      filtered = allTodos.filter((t) => t.state === "DONE");
    }

    if (filtered.length === 0) {
      todoList.innerHTML = `
        <div style="text-align: center; padding: 20px; font-family: var(--mono); font-size: 10.5px; opacity: .7;">
          NO ${currentTodoFilter.toUpperCase()} TASKS<br/>Add one with natural language!
        </div>`;
      return;
    }

    filtered.forEach((todo) => {
      const itemEl = document.createElement("div");
      const isDone = todo.state === "DONE";
      itemEl.className = `todo-item ${isDone ? "done" : ""}`;

      const energyBadge = todo.energy ? `<span class="todo-badge" style="background: var(--yel);">${todo.energy}</span>` : "";
      const minsBadge = todo.estimatedMinutes ? `<span class="todo-badge" style="background: var(--cyan);">${todo.estimatedMinutes}m</span>` : "";
      const dueBadge = todo.dueDate ? `<span class="todo-badge" style="background: var(--lime);">${todo.dueDate}</span>` : "";
      const tagsBadges = (todo.tags || []).map((tg) => `<span class="todo-badge">#${tg}</span>`).join(" ");

      itemEl.innerHTML = `
        <input type="checkbox" class="todo-checkbox" ${isDone ? "checked" : ""} />
        <div class="todo-content">
          <div class="todo-title">${todo.title}</div>
          <div class="todo-tags-row">
            ${energyBadge}
            ${minsBadge}
            ${dueBadge}
            ${tagsBadges}
          </div>
        </div>
        <button class="todo-delete-btn" title="Delete Todo">✕</button>
      `;

      // Checkbox toggle
      const chk = itemEl.querySelector(".todo-checkbox");
      chk.addEventListener("change", async () => {
        const nextState = chk.checked ? "DONE" : "OPEN";
        itemEl.classList.toggle("done", chk.checked);

        try {
          await hoardFetch(`/api/todos/${todo.id}`, {
            method: "PATCH",
            body: JSON.stringify({ state: nextState }),
          });
          todo.state = nextState;
          renderTodoList();
        } catch {
          showToast("⚠️ Could not update todo", true);
        }
      });

      // Delete button
      const delBtn = itemEl.querySelector(".todo-delete-btn");
      delBtn.addEventListener("click", async () => {
        try {
          await hoardFetch(`/api/todos/${todo.id}`, { method: "DELETE" });
          allTodos = allTodos.filter((t) => t.id !== todo.id);
          renderTodoList();
          showToast("✓ TODO DELETED");
        } catch {
          showToast("⚠️ Could not delete todo", true);
        }
      });

      todoList.appendChild(itemEl);
    });
  }

  todoFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      todoFilterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTodoFilter = btn.getAttribute("data-todo-filter") || "open";
      renderTodoList();
    });
  });

  // ─── TAB 4: MY HOARD (RANKED SEARCH) ───────────────────────────────────────

  function renderHoardList(query = "", filter = "all") {
    if (!hoardList) return;
    hoardList.innerHTML = "";

    const getItems = (callback) => {
      chrome.storage?.local.get(["hoard_bookmarks"], (res) => {
        callback(res.hoard_bookmarks || []);
      });
    };

    getItems((items) => {
      if (items.length === 0) {
        hoardList.innerHTML = `<div style="text-align: center; padding: 20px; font-family: var(--mono); font-size: 11px; opacity: .7;">YOUR HOARD IS EMPTY.<br/>Save your first tab!</div>`;
        return;
      }

      const filtered = items.filter((item) => {
        const matchesQuery =
          !query ||
          item.t.toLowerCase().includes(query.toLowerCase()) ||
          item.url.toLowerCase().includes(query.toLowerCase()) ||
          (item.tag && item.tag.toLowerCase().includes(query.toLowerCase()));

        const matchesFilter =
          filter === "all" ||
          (filter === "unread" && item.unread) ||
          item.ty === filter;

        return matchesQuery && matchesFilter;
      });

      if (filtered.length === 0) {
        hoardList.innerHTML = `<div style="text-align: center; padding: 20px; font-family: var(--mono); font-size: 11px; opacity: .7;">NO MATCHING BOOKMARKS</div>`;
        return;
      }

      filtered.forEach((item) => {
        const el = document.createElement("div");
        el.className = "hoard-item";
        const meta = KIND_COLOR[item.ty] || detectUrlMeta(item.url);

        el.innerHTML = `
          <div style="flex: 1; overflow: hidden;">
            <div class="hoard-item-title" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.t}</div>
            <div class="hoard-item-meta">
              <span style="background: ${meta.bg}; color: ${meta.fg}; padding: 1px 4px; border: 1px solid #000; font-weight: 800;">${item.ty}</span>
              <span style="margin-left: 4px;">${item.src}</span> · <span>#${item.tag}</span>
            </div>
          </div>
          <div class="hoard-item-actions">
            <button class="icon-btn copy-btn" title="Copy URL">📋</button>
            <button class="icon-btn open-btn" title="Open Link">↗</button>
          </div>
        `;

        el.querySelector(".copy-btn").addEventListener("click", () => {
          navigator.clipboard.writeText(item.url);
          showToast("✓ COPIED LINK");
        });

        el.querySelector(".open-btn").addEventListener("click", () => {
          chrome.tabs?.create({ url: item.url });
          hoardFetch("/api/bookmarks/use-by-url", {
            method: "POST",
            body: JSON.stringify({ url: item.url }),
          }).catch(() => {});
        });

        hoardList.appendChild(el);
      });
    });
  }

  function renderRankedSearchResults(query, filter) {
    hoardFetch(`/api/library/search?q=${encodeURIComponent(query)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((results) => {
        const filtered = filter === "all" ? results : results.filter((r) => r.ty === filter);
        if (filtered.length === 0) {
          hoardList.innerHTML = `<div style="text-align: center; padding: 20px; font-family: var(--mono); font-size: 11px; opacity: .7;">NO MATCHING BOOKMARKS</div>`;
          return;
        }

        hoardList.innerHTML = "";
        filtered.forEach((r) => {
          const el = document.createElement("div");
          el.className = "hoard-item";
          const color = KIND_COLOR[r.ty] || KIND_COLOR.APP;

          el.innerHTML = `
            <div style="flex: 1; overflow: hidden;">
              <div class="hoard-item-title" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${r.title}</div>
              <div class="hoard-item-meta">
                <span style="background: ${color.bg}; color: ${color.fg}; padding: 1px 4px; border: 1px solid #000; font-weight: 800;">${r.ty}</span>
                <span style="margin-left: 4px;">${r.src}</span> · <span>#${r.tag}</span>
                · <span style="font-weight: 800;">${r.useCount}×</span>
              </div>
            </div>
            <div class="hoard-item-actions">
              <button class="icon-btn copy-btn" title="Copy URL">📋</button>
              <button class="icon-btn open-btn" title="Open Link">↗</button>
            </div>
          `;

          el.querySelector(".copy-btn").addEventListener("click", () => {
            navigator.clipboard.writeText(r.url);
            showToast("✓ COPIED LINK");
          });

          el.querySelector(".open-btn").addEventListener("click", () => {
            chrome.tabs?.create({ url: r.url });
            hoardFetch(`/api/bookmarks/${r.id}/use`, { method: "POST" }).catch(() => {});
          });

          hoardList.appendChild(el);
        });
      })
      .catch(() => {
        renderHoardList(query, filter);
      });
  }

  searchInHoard?.addEventListener("input", (e) => {
    const query = e.target.value;
    const activeFilter = document.querySelector(".filter-chip.active")?.getAttribute("data-filter") || "all";
    if (searchDebounce) clearTimeout(searchDebounce);
    if (!query.trim()) {
      renderHoardList(query, activeFilter);
      return;
    }
    searchDebounce = setTimeout(() => {
      renderRankedSearchResults(query.trim(), activeFilter);
    }, 200);
  });

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.getAttribute("data-filter");
      const query = searchInHoard?.value.trim();
      if (query) renderRankedSearchResults(query, filter);
      else renderHoardList(searchInHoard?.value, filter);
    });
  });

  // ─── TAB 5: SETTINGS & CONNECTION TEST ──────────────────────────────────────

  testConnectionBtn?.addEventListener("click", async () => {
    testConnResult.style.display = "block";
    testConnResult.textContent = "Testing connection...";
    testConnResult.style.color = "#000";

    const startTime = Date.now();
    try {
      const res = await hoardFetch("/api/bookmarks?limit=1");
      const elapsed = Date.now() - startTime;
      if (res.ok) {
        testConnResult.textContent = `✓ CONNECTED (${elapsed}ms) — Authorized`;
        testConnResult.style.color = "#008744";
      } else if (res.status === 401) {
        testConnResult.textContent = `⚠️ AUTH REQUIRED — Please log in to Hoard or provide API Token`;
        testConnResult.style.color = "#FF007A";
      } else {
        testConnResult.textContent = `⚠️ HTTP ${res.status} (${elapsed}ms)`;
        testConnResult.style.color = "#FF6B00";
      }
    } catch (e) {
      testConnResult.textContent = `✕ CONNECTION FAILED — ${e.message || "Network error"}`;
      testConnResult.style.color = "#FF007A";
    }
  });

  function updateSyncStatusBadge() {
    chrome.runtime?.sendMessage({ action: "get_sync_status" }, (res) => {
      if (res && res.total > 0) {
        if (syncStatus) {
          syncStatus.textContent = `⚡ ${res.total} PENDING`;
          syncStatus.style.color = "#FF6B00";
        }
        if (offlineQueueCount) {
          offlineQueueCount.textContent = `${res.total} items (${res.bookmarks} bm, ${res.til} til, ${res.todos} todo)`;
        }
      } else {
        if (syncStatus) {
          syncStatus.textContent = "● LIVE";
          syncStatus.style.color = "#008744";
        }
        if (offlineQueueCount) {
          offlineQueueCount.textContent = "0 items pending";
        }
      }
    });
  }

  forceSyncBtn?.addEventListener("click", () => {
    showToast("🔄 SYNCING QUEUE...");
    chrome.runtime?.sendMessage({ action: "trigger_sync" }, (res) => {
      showToast(`✓ SYNC COMPLETE (+${res?.syncedCount || 0})`);
      updateSyncStatusBadge();
    });
  });

  openWebAppBtn?.addEventListener("click", () => {
    const serverUrl = serverUrlInput.value.trim() || DEFAULT_SERVER_URL;
    chrome.tabs?.create({ url: serverUrl });
  });

  // ─── TAB NAVIGATION SWITCHER ───────────────────────────────────────────────

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => (c.style.display = "none"));

      btn.classList.add("active");
      const targetEl = document.getElementById(`tab-${targetTab}`);
      if (targetEl) targetEl.style.display = "flex";

      if (targetTab === "hoard") {
        renderHoardList();
      } else if (targetTab === "til") {
        loadUnreadBookmarksForDischarge();
        fetchTilSuggestions(true);
      } else if (targetTab === "todos") {
        loadTodos();
        fetchTodoSuggestions(true);
      } else if (targetTab === "settings") {
        updateSyncStatusBadge();
      }
    });
  });

  // ─── Toast Banner Helper ───────────────────────────────────────────────────

  function showToast(msg, isError = false) {
    toastMsg.textContent = msg;
    toast.style.background = isError ? "#FF007A" : "#B6FF3C";
    toast.style.color = isError ? "#fff" : "#000";
    toast.style.display = "block";

    setTimeout(() => {
      toast.style.display = "none";
    }, 2400);
  }
});
