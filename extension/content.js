// HOARD Content Script — runs on https://hoard-ten.vercel.app/* and localhost:3000/*
// Bridges pending bookmarks from chrome.storage.local into the web app's localStorage.
//
// KEY DETAIL: Content scripts run in an isolated JS world.
// window.dispatchEvent() here does NOT reach the React app's event listeners.
// We use window.postMessage() which DOES cross the isolation boundary.

const STORAGE_KEY = "hoard_bookmarks_v2";
const PENDING_KEY = "hoard_pending_sync";

function drainPending() {
  chrome.storage.local.get([PENDING_KEY], (res) => {
    const pending = res[PENDING_KEY];
    if (!pending || pending.length === 0) return;

    try {
      // Write directly into the shared localStorage (content scripts share it with the page)
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const maxId = list.reduce((acc, x) => Math.max(acc, x.id ?? -1), -1);
      const toAdd = pending.map((bm, i) => ({ ...bm, id: maxId + 1 + i }));
      const merged = [...toAdd, ...list];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

      // postMessage crosses the isolation boundary — the React app receives this
      window.postMessage(
        { type: "HOARD_BOOKMARKS_UPDATED", bookmarks: merged },
        "*"
      );

      // Clear the pending queue
      chrome.storage.local.remove(PENDING_KEY, () => {
        console.log(`[HOARD Content] Synced ${pending.length} pending bookmark(s) to board.`);
      });
    } catch (e) {
      console.error("[HOARD Content] Failed to drain pending bookmarks:", e);
    }
  });
}

// Run as early as possible so bookmarks are in localStorage before React reads it.
// Also send a postMessage in case React has already hydrated.
drainPending();

// Listen for background script signals (e.g. if background saved while tab was loading)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "drain_pending") {
    drainPending();
  }
});
