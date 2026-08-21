// HOARD Extension Background Service Worker (Manifest V3)

const HOARD_ORIGIN = "https://hoard-ten.vercel.app";
const PENDING_KEY = "hoard_pending_sync";

// ─── Kind Detection (minimal — kept in sync with src/lib/detectKind.ts) ───────

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
  if (/arxiv|acm\.org|ieee/.test(urlLower)) return "PPR";
  if (/raycast|warp\.dev|excalidraw|apps\.apple|play\.google/.test(urlLower)) return "APP";
  if (/docs\.|developer\.|\/docs\//.test(urlLower)) return "DOC";
  return "APP";
}

// ─── Save Bookmark (context menu + keyboard shortcut) ─────────────────────────
//
// Runs in the service worker, so it can't rely on an open HOARD tab the way
// the popup's own save button does — it POSTs directly. The request only
// succeeds if the browser already holds a valid HOARD session cookie for the
// target origin (i.e. the user is logged in in some tab); on any failure it
// falls back to the same offline queue content.js drains on next page load.
async function saveBookmark(url, title, note, quote) {
  if (!url) return;

  const { hoard_server_url } = await chrome.storage.local.get(["hoard_server_url"]);
  const origin = (hoard_server_url || HOARD_ORIGIN).replace(/\/$/, "");

  const ty = detectKindForSave(url);
  let domain = "web";
  try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch {}

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date();

  const bookmark = {
    t:      title || "Captured Bookmark",
    ty,
    src:    domain,
    url,
    mins:   ty === "VID" ? 45 : ty === "PPR" ? 40 : 15,
    tag:    "saved",
    coll:   "unsorted",
    unread: true,
    ex:     { Source: domain },
    note:   quote || note || "",
    source: "Saved via HOARD Extension",
    when:   `${months[d.getMonth()]} ${d.getDate()}`,
    ...(quote ? { quote } : {}),
  };

  try {
    const res = await fetch(`${origin}/api/bookmarks`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookmark),
    });
    if (res.ok) {
      showBadge();
      return;
    }
    console.warn("[HOARD Background] Save failed with status", res.status);
  } catch (err) {
    console.warn("[HOARD Background] Save request failed, queueing offline:", err);
  }

  const { [PENDING_KEY]: pending = [] } = await chrome.storage.local.get([PENDING_KEY]);
  pending.push(bookmark);
  await chrome.storage.local.set({ [PENDING_KEY]: pending });
  showBadge("…");
}

// ─── Context Menus ────────────────────────────────────────────────────────────

function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "hoard-save-page",      title: "Save Page to HOARD (Alt+Shift+H)", contexts: ["page"] });
    chrome.contextMenus.create({ id: "hoard-save-link",      title: "Save Link to HOARD",               contexts: ["link"] });
    chrome.contextMenus.create({ id: "hoard-save-selection", title: "Save Highlight to HOARD",      contexts: ["selection"] });
    console.log("[HOARD Background] Context menus registered.");
  });
}

chrome.runtime.onInstalled.addListener(registerContextMenus);
chrome.runtime.onStartup.addListener(registerContextMenus);

// ─── Context Menu Clicks ──────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let url   = tab?.url   || "";
  let title = tab?.title || "Captured Bookmark";
  let note  = "Saved from context menu";
  let quote = "";

  if (info.menuItemId === "hoard-save-link" && info.linkUrl) {
    url   = info.linkUrl;
    title = `Shared Link: ${info.linkUrl.split("/").pop() || "Link"}`;
  } else if (info.menuItemId === "hoard-save-selection" && info.selectionText) {
    quote = info.selectionText;
    note  = "";
  }

  saveBookmark(url, title, note, quote);
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
  if (command === "save-to-hoard") {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs?.[0]) {
        const quote = await getTabSelection(tabs[0].id);
        saveBookmark(tabs[0].url, tabs[0].title, "Saved via keyboard shortcut", quote);
      }
    } catch (err) {
      console.error("[HOARD Background] Keyboard command failed:", err);
    }
  }
});

// ─── Messages & Sync Triggers ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "bookmark_saved" || request.action === "til_saved") {
    showBadge();
    sendResponse({ status: "success" });
  } else if (request.action === "trigger_til_sync") {
    processOfflineTilQueue();
    sendResponse({ status: "sync_started" });
  }
});

// ─── Background Sync for Offline TIL Queue ────────────────────────────────────

async function processOfflineTilQueue() {
  chrome.storage.local.get(["offline_til_queue", "hoard_server_url"], async (res) => {
    const queue = res.offline_til_queue || [];
    if (!queue.length) return;

    const origin = (res.hoard_server_url || HOARD_ORIGIN).replace(/\/$/, "");

    const remainingQueue = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const apiRes = await fetch(`${origin}/api/til`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });

        if (apiRes.ok) {
          syncedCount++;
        } else {
          remainingQueue.push(item);
        }
      } catch (err) {
        console.warn("[HOARD Sync] Offline sync item failed:", err);
        remainingQueue.push(item);
      }
    }

    chrome.storage.local.set({ offline_til_queue: remainingQueue });

    if (syncedCount > 0) {
      showBadge(`+${syncedCount}`);
      console.log(`[HOARD Sync] Successfully synced ${syncedCount} offline TIL entries.`);
    }
  });
}

// ─── Alarms for Background Sync ───────────────────────────────────────────────

chrome.alarms.create("til_sync_alarm", { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "til_sync_alarm") {
    processOfflineTilQueue();
  }
});

// ─── Badge ────────────────────────────────────────────────────────────────────

function showBadge(text = "✓") {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#FFE600" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
}
