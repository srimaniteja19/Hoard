// HOARD Content Script — runs on https://hoard-ten.vercel.app/* and localhost:3000/*
// Drains pending bookmarks queued in chrome.storage while the tab was closed.
// Runs in ISOLATED world — uses fetch (same-origin cookies included) + postMessage to notify React.

const PENDING_KEY = "hoard_pending_sync";

async function drainPending() {
  return new Promise((resolve) => {
    chrome.storage.local.get([PENDING_KEY], async (res) => {
      const pending = res[PENDING_KEY];
      if (!pending || pending.length === 0) { resolve(); return; }

      // Only re-queue the ones that actually failed — a single failure used
      // to block the whole queue from ever clearing, re-POSTing bookmarks
      // that had already saved successfully on every subsequent page load.
      const remaining = [];
      let syncedCount = 0;
      for (const bm of pending) {
        try {
          const r = await fetch("/api/bookmarks", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bm),
          });
          if (r.ok) syncedCount++;
          else remaining.push(bm);
        } catch {
          remaining.push(bm);
        }
      }

      if (remaining.length === 0) {
        chrome.storage.local.remove(PENDING_KEY, () => {
          console.log(`[HOARD Content] Synced ${syncedCount} pending bookmark(s) to DB.`);
        });
      } else {
        chrome.storage.local.set({ [PENDING_KEY]: remaining }, () => {
          console.log(`[HOARD Content] Synced ${syncedCount}, ${remaining.length} still pending.`);
        });
      }

      // Notify React app to re-fetch from DB
      window.postMessage({ type: "HOARD_BOOKMARKS_UPDATED" }, "*");
      resolve();
    });
  });
}

drainPending();

// Background can also trigger a drain
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "drain_pending") drainPending();
});
