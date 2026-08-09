// HOARD Extension Background Service Worker (Manifest V3)

const HOARD_ORIGIN = "https://hoard-ten.vercel.app";
const STORAGE_KEY = "hoard_bookmarks_v2";
const PENDING_KEY = "hoard_pending_sync";

// Register Context Menus — always clear first to avoid duplicate ID errors
// on service worker restarts (MV3 workers restart frequently)
function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "hoard-save-page",
      title: "Save Page to HOARD (Alt+Shift+H)",
      contexts: ["page"],
    });

    chrome.contextMenus.create({
      id: "hoard-save-link",
      title: "Save Link to HOARD",
      contexts: ["link"],
    });

    chrome.contextMenus.create({
      id: "hoard-save-selection",
      title: "Save Highlight as Note to HOARD",
      contexts: ["selection"],
    });

    console.log("[HOARD Background] Context menus registered.");
  });
}

chrome.runtime.onInstalled.addListener(registerContextMenus);
chrome.runtime.onStartup.addListener(registerContextMenus);

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let targetUrl = tab?.url || "";
  let targetTitle = tab?.title || "Captured Bookmark";
  let noteText = "Saved from context menu";

  if (info.menuItemId === "hoard-save-link" && info.linkUrl) {
    targetUrl = info.linkUrl;
    targetTitle = `Shared Link: ${info.linkUrl.split('/').pop() || 'Link'}`;
  } else if (info.menuItemId === "hoard-save-selection" && info.selectionText) {
    noteText = `Highlight: "${info.selectionText}"`;
  }

  saveBookmarkFromBackground(targetUrl, targetTitle, noteText);
});

// Handle Keyboard Commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-to-hoard") {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        saveBookmarkFromBackground(tabs[0].url, tabs[0].title, "Saved via keyboard shortcut");
      }
    } catch (err) {
      console.error("[HOARD Background] Keyboard command failed:", err);
    }
  }
});

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "bookmark_saved") {
    showBadgeConfirmation();
    sendResponse({ status: "success" });
  }
});

// Build a Bookmark object in the shape the web app expects
function buildWebAppBookmark(url, title, note) {
  if (!url || !url.startsWith("http")) return null;

  let domain = "web";
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    domain = "web";
  }

  const isVideo = /youtube\.com|youtu\.be/.test(url);
  const isRepo = /github\.com/.test(url);
  const isPaper = /arxiv\.org/.test(url);
  const isPlaylist = /youtube\.com\/playlist/.test(url);

  const ty = isPlaylist ? "PLY" : isVideo ? "VID" : isRepo ? "GIT" : isPaper ? "PPR" : "ART";

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date();
  const when = `${months[d.getMonth()]} ${d.getDate()}`;

  return {
    // id will be assigned when inserting into the array
    t: title || "New Bookmark",
    ty,
    src: domain,
    url,
    mins: isVideo ? 45 : isPaper ? 40 : 15,
    tag: isRepo ? "craft" : isVideo ? "ai" : "systems",
    coll: "unsorted",
    unread: true,
    ex: { Source: domain },
    note: note || "Saved via HOARD Extension",
    when,
  };
}

// Inject bookmark directly into the Hoard web app's localStorage
// Returns true if successfully injected into an open tab
async function injectIntoHoardTab(bookmark) {
  try {
    const tabs = await chrome.tabs.query({ url: `${HOARD_ORIGIN}/*` });
    if (!tabs || tabs.length === 0) return false;

    const tabId = tabs[0].id;
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (bm, storageKey) => {
        try {
          const raw = localStorage.getItem(storageKey);
          const list = raw ? JSON.parse(raw) : [];
          // Assign an id that won't collide
          const maxId = list.reduce((acc, x) => Math.max(acc, x.id ?? -1), -1);
          const created = { ...bm, id: maxId + 1 };
          list.unshift(created);
          localStorage.setItem(storageKey, JSON.stringify(list));
          // Dispatch storage event so the web app re-reads without a refresh
          window.dispatchEvent(new StorageEvent("storage", {
            key: storageKey,
            newValue: JSON.stringify(list),
            storageArea: localStorage,
          }));
          return true;
        } catch (e) {
          console.error("[HOARD Inject] Failed to write to localStorage:", e);
          return false;
        }
      },
      args: [bookmark, STORAGE_KEY],
    });
    return true;
  } catch (err) {
    console.warn("[HOARD Background] Could not inject into Hoard tab:", err);
    return false;
  }
}

// Save bookmark: try to inject into open Hoard tab, fallback to pending queue
async function saveBookmarkFromBackground(url, title, note) {
  if (!url || !url.startsWith("http")) return;

  const bookmark = buildWebAppBookmark(url, title, note);
  if (!bookmark) return;

  // Save to chrome.storage.local for "MY HOARD" tab in the extension popup
  chrome.storage.local.get(["hoard_bookmarks"], (res) => {
    const list = res.hoard_bookmarks || [];
    list.unshift({ ...bookmark, id: Date.now() });
    chrome.storage.local.set({ hoard_bookmarks: list });
  });

  // Try injecting directly into an open Hoard tab
  const injected = await injectIntoHoardTab(bookmark);

  if (!injected) {
    // Hoard tab not open — queue for next time it loads
    chrome.storage.local.get([PENDING_KEY], (res) => {
      const pending = res[PENDING_KEY] || [];
      pending.push(bookmark);
      chrome.storage.local.set({ [PENDING_KEY]: pending }, () => {
        console.log("[HOARD Background] Queued bookmark for next Hoard load:", bookmark.t);
      });
    });
  } else {
    console.log("[HOARD Background] Injected bookmark into Hoard tab:", bookmark.t);
  }

  showBadgeConfirmation();
}

// Badge notification confirmation
function showBadgeConfirmation() {
  chrome.action.setBadgeText({ text: "✓" });
  chrome.action.setBadgeBackgroundColor({ color: "#FFE600" });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
  }, 2800);
}
