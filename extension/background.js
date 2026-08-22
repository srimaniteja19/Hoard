// HOARD Extension Background Service Worker (Manifest V3) — v2.0.0

const DEFAULT_HOARD_ORIGIN = "https://hoard-ten.vercel.app";
const PENDING_BOOKMARKS_KEY = "hoard_pending_sync";
const PENDING_TIL_KEY = "offline_til_queue";
const PENDING_TODOS_KEY = "offline_todo_queue";

// ─── Helpers: Config & Auth ──────────────────────────────────────────────────

async function getHoardConfig() {
  const data = await chrome.storage.local.get(["hoard_server_url", "hoard_api_token"]);
  const origin = (data.hoard_server_url || DEFAULT_HOARD_ORIGIN).replace(/\/$/, "");
  const token = (data.hoard_api_token || "").trim();
  return { origin, token };
}

function makeHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ─── Kind Detection ──────────────────────────────────────────────────────────

function detectKindForSave(u) {
  const urlLower = (u || "").toLowerCase().trim();
  if (!urlLower) return "APP";

  let hostname = "";
  try {
    hostname = new URL(urlLower.startsWith("http") ? urlLower : `https://${urlLower}`).hostname.replace(/^www\./, "");
  } catch {
    hostname = "";
  }

  if (/youtube\.com\/playlist/.test(urlLower)) return "PLY";
  if (hostname === "youtube.com" || hostname === "youtu.be") return "VID";
  if (hostname === "open.spotify.com" || hostname === "music.apple.com") return "PLY";
  if (/github\.com\/[\w.-]+\/[\w.-]+/.test(urlLower)) return "GIT";
  if (hostname === "arxiv.org" || /\.acm\.org$/.test(hostname) || /\.ieee\.org$/.test(hostname) || hostname === "ieee.org") return "PPR";
  if (
    hostname === "raycast.com" ||
    hostname === "warp.dev" ||
    hostname === "excalidraw.com" ||
    hostname === "apps.apple.com" ||
    hostname === "play.google.com"
  ) {
    return "APP";
  }
  if (hostname.startsWith("docs.") || hostname.startsWith("developer.") || /\/docs\//.test(urlLower)) return "DOC";

  const isArticle =
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

  if (isArticle) return "ART";
  return "APP";
}

// ─── Save Bookmark (Context menu / Shortcut / Service worker) ────────────────

async function saveBookmark(url, title, note = "", quote = "") {
  if (!url) return;

  const { origin, token } = await getHoardConfig();
  const ty = detectKindForSave(url);
  let domain = "web";
  try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch {}

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date();

  // If quote is provided, optionally generate TextFragment URL
  let targetUrl = url;
  if (quote && !url.includes("#:~:text=")) {
    try {
      const cleanQ = quote.slice(0, 100).trim();
      if (cleanQ) {
        targetUrl = `${url.split("#")[0]}#:~:text=${encodeURIComponent(cleanQ)}`;
      }
    } catch {}
  }

  const bookmark = {
    t:      title || "Captured Bookmark",
    ty,
    src:    domain,
    url:    targetUrl,
    mins:   ty === "VID" ? 45 : ty === "PPR" ? 40 : 15,
    tag:    "saved",
    coll:   "unsorted",
    unread: true,
    ex:     { Source: domain },
    note:   quote ? `"${quote}"` : note,
    source: "Saved via HOARD Extension",
    when:   `${months[d.getMonth()]} ${d.getDate()}`,
    ...(quote ? { quote } : {}),
  };

  try {
    const res = await fetch(`${origin}/api/bookmarks`, {
      method: "POST",
      credentials: "include",
      headers: makeHeaders(token),
      body: JSON.stringify(bookmark),
    });
    if (res.ok) {
      showBadge("✓");
      return;
    }
  } catch (err) {
    console.warn("[HOARD Background] Save bookmark failed, queueing offline:", err);
  }

  const { [PENDING_BOOKMARKS_KEY]: pending = [] } = await chrome.storage.local.get([PENDING_BOOKMARKS_KEY]);
  pending.push(bookmark);
  await chrome.storage.local.set({ [PENDING_BOOKMARKS_KEY]: pending });
  showBadge("…");
}

// ─── Save TIL Entry ──────────────────────────────────────────────────────────

async function saveTilEntry(payload) {
  if (!payload || !payload.body) return;

  const { origin, token } = await getHoardConfig();

  try {
    const res = await fetch(`${origin}/api/til`, {
      method: "POST",
      credentials: "include",
      headers: makeHeaders(token),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showBadge("✓");
      return;
    }
  } catch (err) {
    console.warn("[HOARD Background] Save TIL failed, queueing offline:", err);
  }

  const { [PENDING_TIL_KEY]: pending = [] } = await chrome.storage.local.get([PENDING_TIL_KEY]);
  pending.push({ ...payload, createdAt: new Date().toISOString() });
  await chrome.storage.local.set({ [PENDING_TIL_KEY]: pending });
  showBadge("…");
}

// ─── Save Todo ───────────────────────────────────────────────────────────────

async function saveTodoEntry(text, contextUrl = "") {
  if (!text || !text.trim()) return;

  const { origin, token } = await getHoardConfig();
  const rawText = contextUrl && !text.includes(contextUrl) ? `${text.trim()} (${contextUrl})` : text.trim();

  try {
    const res = await fetch(`${origin}/api/todos`, {
      method: "POST",
      credentials: "include",
      headers: makeHeaders(token),
      body: JSON.stringify({ text: rawText }),
    });
    if (res.ok) {
      showBadge("✓");
      return;
    }
  } catch (err) {
    console.warn("[HOARD Background] Save todo failed, queueing offline:", err);
  }

  const { [PENDING_TODOS_KEY]: pending = [] } = await chrome.storage.local.get([PENDING_TODOS_KEY]);
  pending.push({ text: rawText, createdAt: new Date().toISOString() });
  await chrome.storage.local.set({ [PENDING_TODOS_KEY]: pending });
  showBadge("…");
}

// ─── Unified Offline Queue Draining ──────────────────────────────────────────

async function drainAllQueues() {
  const { origin, token } = await getHoardConfig();
  const headers = makeHeaders(token);
  let syncedCount = 0;

  // 1. Drain Bookmarks
  const { [PENDING_BOOKMARKS_KEY]: pendingBm = [] } = await chrome.storage.local.get([PENDING_BOOKMARKS_KEY]);
  if (pendingBm.length > 0) {
    const remainingBm = [];
    for (const bm of pendingBm) {
      try {
        const res = await fetch(`${origin}/api/bookmarks`, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify(bm),
        });
        if (res.ok) syncedCount++;
        else remainingBm.push(bm);
      } catch {
        remainingBm.push(bm);
      }
    }
    await chrome.storage.local.set({ [PENDING_BOOKMARKS_KEY]: remainingBm });
  }

  // 2. Drain TILs
  const { [PENDING_TIL_KEY]: pendingTil = [] } = await chrome.storage.local.get([PENDING_TIL_KEY]);
  if (pendingTil.length > 0) {
    const remainingTil = [];
    for (const til of pendingTil) {
      try {
        const res = await fetch(`${origin}/api/til`, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify(til),
        });
        if (res.ok) syncedCount++;
        else remainingTil.push(til);
      } catch {
        remainingTil.push(til);
      }
    }
    await chrome.storage.local.set({ [PENDING_TIL_KEY]: remainingTil });
  }

  // 3. Drain Todos
  const { [PENDING_TODOS_KEY]: pendingTodos = [] } = await chrome.storage.local.get([PENDING_TODOS_KEY]);
  if (pendingTodos.length > 0) {
    const remainingTodos = [];
    for (const todo of pendingTodos) {
      try {
        const res = await fetch(`${origin}/api/todos`, {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify(todo),
        });
        if (res.ok) syncedCount++;
        else remainingTodos.push(todo);
      } catch {
        remainingTodos.push(todo);
      }
    }
    await chrome.storage.local.set({ [PENDING_TODOS_KEY]: remainingTodos });
  }

  if (syncedCount > 0) {
    showBadge(`+${syncedCount}`);
    console.log(`[HOARD Background] Synced ${syncedCount} offline items to server.`);
  }

  return { syncedCount };
}

// ─── Context Menus ────────────────────────────────────────────────────────────

function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // 1. Page Context
    chrome.contextMenus.create({
      id: "hoard-save-page",
      title: "🔖 Save Page to HOARD",
      contexts: ["page"],
    });
    chrome.contextMenus.create({
      id: "hoard-save-page-todo",
      title: "✅ Add Page as TODO",
      contexts: ["page"],
    });

    // 2. Link Context
    chrome.contextMenus.create({
      id: "hoard-save-link",
      title: "🔗 Save Link to HOARD",
      contexts: ["link"],
    });

    // 3. Selection Context
    chrome.contextMenus.create({
      id: "hoard-save-selection-bookmark",
      title: "📑 Save Highlight as Bookmark",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "hoard-save-selection-til",
      title: "💡 Capture Selection as TIL",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "hoard-save-selection-todo",
      title: "✅ Create Task from Selection",
      contexts: ["selection"],
    });

    console.log("[HOARD Background] v2.0 Context menus registered.");
  });
}

chrome.runtime.onInstalled.addListener(registerContextMenus);
chrome.runtime.onStartup.addListener(registerContextMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = tab?.url || "";
  const pageTitle = tab?.title || "Web Resource";
  const selection = (info.selectionText || "").trim();

  switch (info.menuItemId) {
    case "hoard-save-page":
      saveBookmark(url, pageTitle, "Saved from page context menu");
      break;

    case "hoard-save-link":
      if (info.linkUrl) {
        const linkTitle = info.linkUrl.split("/").pop() || "Link";
        saveBookmark(info.linkUrl, `Shared Link: ${linkTitle}`, "Saved from link context menu");
      }
      break;

    case "hoard-save-selection-bookmark":
      saveBookmark(url, pageTitle, "", selection);
      break;

    case "hoard-save-selection-til":
      saveTilEntry({
        type: "QUOTE",
        body: selection.startsWith('"') ? selection : `"${selection}"`,
        linkUrl: url,
        tags: ["quote", "web"],
      });
      break;

    case "hoard-save-page-todo":
      saveTodoEntry(`Read ${pageTitle} ~25m #reading`, url);
      break;

    case "hoard-save-selection-todo":
      saveTodoEntry(selection, url);
      break;
  }
});

// ─── Keyboard Commands ────────────────────────────────────────────────────────

async function getTabSelection(tabId) {
  if (!tabId) return "";
  try {
    const sel = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection()?.toString() || "",
    });
    return (sel?.[0]?.result || "").trim();
  } catch {
    return "";
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0]) return;
    const tab = tabs[0];
    const quote = await getTabSelection(tab.id);

    if (command === "save-to-hoard") {
      saveBookmark(tab.url, tab.title, "Saved via keyboard shortcut", quote);
    } else if (command === "capture-til") {
      saveTilEntry({
        type: quote ? "QUOTE" : "FACT",
        body: quote ? `"${quote}"` : `Learned from ${tab.title}`,
        linkUrl: tab.url,
        tags: ["web"],
      });
    } else if (command === "capture-todo") {
      const taskText = quote ? quote : `Review: ${tab.title} ~25m #reading`;
      saveTodoEntry(taskText, tab.url);
    }
  } catch (err) {
    console.error("[HOARD Background] Command handler failed:", err);
  }
});

// ─── Messages & Sync Triggers ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "bookmark_saved" || request.action === "til_saved" || request.action === "todo_saved") {
    showBadge();
    sendResponse({ status: "success" });
  } else if (request.action === "trigger_sync") {
    drainAllQueues().then((res) => sendResponse(res));
    return true; // async
  } else if (request.action === "get_sync_status") {
    chrome.storage.local.get([PENDING_BOOKMARKS_KEY, PENDING_TIL_KEY, PENDING_TODOS_KEY], (res) => {
      const pendingBm = (res[PENDING_BOOKMARKS_KEY] || []).length;
      const pendingTil = (res[PENDING_TIL_KEY] || []).length;
      const pendingTodos = (res[PENDING_TODOS_KEY] || []).length;
      sendResponse({
        total: pendingBm + pendingTil + pendingTodos,
        bookmarks: pendingBm,
        til: pendingTil,
        todos: pendingTodos,
      });
    });
    return true; // async
  }
});

// ─── Alarms for Background Sync ───────────────────────────────────────────────

chrome.alarms.create("hoard_sync_alarm", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "hoard_sync_alarm") {
    drainAllQueues();
  }
});

// ─── Badge ────────────────────────────────────────────────────────────────────

function showBadge(text = "✓") {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#FFE600" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
}
