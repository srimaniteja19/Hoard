// HOARD Content Script — runs on https://hoard-ten.vercel.app/*
// Bridges pending bookmarks from chrome.storage.local into the web app's localStorage

const STORAGE_KEY = "hoard_bookmarks_v2";
const PENDING_KEY = "hoard_pending_sync";
const BRIDGE_KEY = "hoard_pending_bridge";

function drainPending() {
  chrome.storage.local.get([PENDING_KEY], (res) => {
    const pending = res[PENDING_KEY];
    if (!pending || pending.length === 0) return;

    // Write pending bookmarks directly into hoard_bookmarks_v2
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const maxId = list.reduce((acc, x) => Math.max(acc, x.id ?? -1), -1);
      const toAdd = pending.map((bm, i) => ({ ...bm, id: maxId + 1 + i }));
      const merged = [...toAdd, ...list];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

      // Dispatch StorageEvent so the React app re-renders immediately
      window.dispatchEvent(new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify(merged),
        storageArea: localStorage,
      }));

      // Clear the queue
      chrome.storage.local.remove(PENDING_KEY, () => {
        console.log(`[HOARD Content] Drained ${pending.length} pending bookmark(s) into web app.`);
      });
    } catch (e) {
      console.error("[HOARD Content] Failed to drain pending bookmarks:", e);
    }
  });
}

// Run on page load (covers initial load and navigation)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", drainPending);
} else {
  // Already loaded (e.g. SPA navigation)
  drainPending();
}

// Also listen for messages from the background script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "drain_pending") {
    drainPending();
  }
});
