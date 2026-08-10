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

// ─── Messages from popup ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "bookmark_saved") {
    showBadge();
    sendResponse({ status: "success" });
  }
});

// ─── Build bookmark payload (UI shape) ───────────────────────────────────────

function buildBookmark(url, title, note) {
  if (!url?.startsWith("http")) return null;
  let domain = "web";
  try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch {}
  const isVideo    = /youtube\.com|youtu\.be/.test(url);
  const isRepo     = /github\.com/.test(url);
  const isPaper    = /arxiv\.org/.test(url);
  const isPlaylist = /youtube\.com\/playlist/.test(url);
  const ty = isPlaylist ? "PLY" : isVideo ? "VID" : isRepo ? "GIT" : isPaper ? "PPR" : "ART";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date();
  return {
    t: title || "New Bookmark", ty, src: domain, url,
    mins: isVideo ? 45 : isPaper ? 40 : 15,
    tag: isRepo ? "craft" : isVideo ? "ai" : "systems",
    coll: "unsorted", unread: true,
    ex: { Source: domain },
    note: note || "",
    source: "Saved via HOARD Extension",
    when: `${months[d.getMonth()]} ${d.getDate()}`,
  };
}

// ─── Save: inject fetch into open Hoard tab (same-origin → cookie auth) ──────

async function saveIntoHoardTab(bm) {
  try {
    const tabs = await chrome.tabs.query({ url: `${HOARD_ORIGIN}/*` });
    if (!tabs?.length) return false;

    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      world: "MAIN",
      func: async (bookmark) => {
        try {
          const res = await fetch("/api/bookmarks", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bookmark),
          });
          if (res.ok) {
            // Tell the React app to re-fetch
            window.postMessage({ type: "HOARD_BOOKMARKS_UPDATED" }, "*");
          }
        } catch (e) {
          console.error("[HOARD Inject] fetch failed:", e);
        }
      },
      args: [bm],
    });
    return true;
  } catch (err) {
    console.warn("[HOARD Background] Could not inject into Hoard tab:", err);
    return false;
  }
}

// ─── Main save flow ───────────────────────────────────────────────────────────

async function saveBookmark(url, title, note) {
  const bm = buildBookmark(url, title, note);
  if (!bm) return;

  // Always save to extension's local list for popup "MY HOARD" tab
  chrome.storage.local.get(["hoard_bookmarks"], (res) => {
    const list = res.hoard_bookmarks || [];
    list.unshift({ ...bm, id: Date.now() });
    chrome.storage.local.set({ hoard_bookmarks: list });
  });

  // Try to save directly to DB via the open Hoard tab
  const injected = await saveIntoHoardTab(bm);

  if (!injected) {
    // Hoard tab not open — queue for content script to pick up on next load
    chrome.storage.local.get([PENDING_KEY], (res) => {
      const pending = res[PENDING_KEY] || [];
      pending.push(bm);
      chrome.storage.local.set({ [PENDING_KEY]: pending }, () => {
        console.log("[HOARD Background] Queued for next Hoard load:", bm.t);
      });
    });
  }

  showBadge();
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function showBadge() {
  chrome.action.setBadgeText({ text: "✓" });
  chrome.action.setBadgeBackgroundColor({ color: "#FFE600" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2800);
}
