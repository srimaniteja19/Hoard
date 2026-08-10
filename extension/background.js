// HOARD Extension Background Service Worker (Manifest V3)

const HOARD_ORIGIN = "https://hoard-ten.vercel.app";
const PENDING_KEY  = "hoard_pending_sync";

// ─── Context Menus ────────────────────────────────────────────────────────────

function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "hoard-save-page",      title: "Save Page to HOARD (Alt+Shift+H)", contexts: ["page"] });
    chrome.contextMenus.create({ id: "hoard-save-link",      title: "Save Link to HOARD",               contexts: ["link"] });
    chrome.contextMenus.create({ id: "hoard-save-selection", title: "Save Highlight as Note to HOARD",  contexts: ["selection"] });
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

  if (info.menuItemId === "hoard-save-link" && info.linkUrl) {
    url   = info.linkUrl;
    title = `Shared Link: ${info.linkUrl.split("/").pop() || "Link"}`;
  } else if (info.menuItemId === "hoard-save-selection" && info.selectionText) {
    note  = `Highlight: "${info.selectionText}"`;
  }

  saveBookmark(url, title, note);
});

// ─── Keyboard Commands ────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-to-hoard") {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs?.[0]) saveBookmark(tabs[0].url, tabs[0].title, "Saved via keyboard shortcut");
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
  chrome.storage.local.get(["offline_til_queue", "hoard_server_url", "extension_token"], async (res) => {
    const queue = res.offline_til_queue || [];
    if (!queue.length) return;

    const origin = (res.hoard_server_url || HOARD_ORIGIN).replace(/\/$/, "");
    const token = res.extension_token || "";

    const remainingQueue = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const apiRes = await fetch(`${origin}/api/til`, {
          method: "POST",
          credentials: "include",
          headers,
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
