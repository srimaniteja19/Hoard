// HOARD Content Script — runs on https://hoard-ten.vercel.app/* and localhost:3000/*
// Drains pending bookmarks queued in chrome.storage while the tab was closed.
// Runs in ISOLATED world — uses fetch (same-origin cookies included) + postMessage to notify React.

const PENDING_KEY = "hoard_pending_sync";

async function drainPending() {
  return new Promise((resolve) => {
    chrome.storage.local.get([PENDING_KEY], async (res) => {
      const pending = res[PENDING_KEY];
      if (!pending || pending.length === 0) { resolve(); return; }

      let anyFailed = false;
      for (const bm of pending) {
        try {
          const r = await fetch("/api/bookmarks", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bm),
          });
          if (!r.ok) { anyFailed = true; }
        } catch {
          anyFailed = true;
        }
      }

      if (!anyFailed) {
        chrome.storage.local.remove(PENDING_KEY, () => {
          console.log(`[HOARD Content] Synced ${pending.length} pending bookmark(s) to DB.`);
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
