// HOARD Extension Background Service Worker (Manifest V3)

// Register Context Menus on Install
chrome.runtime.onInstalled.addListener(() => {
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

  console.log("[HOARD Background] Context menus registered successfully.");
});

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
        saveBookmarkFromBackground(tabs[0].url, tabs[0].title, "Saved via keyboard shortcut (Alt+Shift+H)");
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

// Helper: Save item to local extension storage & show badge
function saveBookmarkFromBackground(url, title, note) {
  if (!url || !url.startsWith("http")) return;

  let domain = "web";
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    domain = "web";
  }

  const isVideo = /youtube\.com|youtu\.be/.test(url);
  const isRepo = /github\.com/.test(url);
  const isPaper = /arxiv\.org/.test(url);

  const ty = isVideo ? "VID" : isRepo ? "GIT" : isPaper ? "PPR" : "ART";

  const newBookmark = {
    id: Date.now(),
    t: title || "New Bookmark",
    ty: ty,
    src: domain,
    url: url,
    mins: isVideo ? 45 : isPaper ? 40 : 15,
    tag: isRepo ? "craft" : isVideo ? "ai" : "systems",
    coll: "unsorted",
    unread: true,
    ex: { Source: domain },
    note: note,
    when: "Just now",
  };

  chrome.storage.local.get(["hoard_bookmarks"], (res) => {
    const list = res.hoard_bookmarks || [];
    list.unshift(newBookmark);
    chrome.storage.local.set({ hoard_bookmarks: list }, () => {
      showBadgeConfirmation();
      console.log("[HOARD Background] Saved item:", newBookmark.t);
    });
  });
}

// Badge notification confirmation
function showBadgeConfirmation() {
  chrome.action.setBadgeText({ text: "✓" });
  chrome.action.setBadgeBackgroundColor({ color: "#FFE600" });
  
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
  }, 2800);
}
