// HOARD Content Script — runs on https://hoard-ten.vercel.app/* and localhost:3000/*
// Drains pending bookmarks, TILs, and todos queued in chrome.storage while the web app was closed.
// Runs in ISOLATED world — uses fetch (same-origin cookies included) + postMessage to notify React.

const PENDING_BM_KEY = "hoard_pending_sync";
const PENDING_TIL_KEY = "offline_til_queue";
const PENDING_TODO_KEY = "offline_todo_queue";

async function drainAllPending() {
  chrome.storage.local.get([PENDING_BM_KEY, PENDING_TIL_KEY, PENDING_TODO_KEY], async (res) => {
    // 1. Drain Bookmarks
    const pendingBm = res[PENDING_BM_KEY] || [];
    if (pendingBm.length > 0) {
      const remainingBm = [];
      let syncedBm = 0;
      for (const bm of pendingBm) {
        try {
          const r = await fetch("/api/bookmarks", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bm),
          });
          if (r.ok) syncedBm++;
          else remainingBm.push(bm);
        } catch {
          remainingBm.push(bm);
        }
      }
      chrome.storage.local.set({ [PENDING_BM_KEY]: remainingBm });
      if (syncedBm > 0) {
        console.log(`[HOARD Content] Synced ${syncedBm} pending bookmark(s).`);
        window.postMessage({ type: "HOARD_BOOKMARKS_UPDATED" }, "*");
      }
    }

    // 2. Drain TIL Entries
    const pendingTil = res[PENDING_TIL_KEY] || [];
    if (pendingTil.length > 0) {
      const remainingTil = [];
      let syncedTil = 0;
      for (const item of pendingTil) {
        try {
          const r = await fetch("/api/til", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (r.ok) syncedTil++;
          else remainingTil.push(item);
        } catch {
          remainingTil.push(item);
        }
      }
      chrome.storage.local.set({ [PENDING_TIL_KEY]: remainingTil });
      if (syncedTil > 0) {
        console.log(`[HOARD Content] Synced ${syncedTil} pending TIL(s).`);
        window.postMessage({ type: "HOARD_TIL_UPDATED" }, "*");
      }
    }

    // 3. Drain Todos
    const pendingTodos = res[PENDING_TODO_KEY] || [];
    if (pendingTodos.length > 0) {
      const remainingTodos = [];
      let syncedTodos = 0;
      for (const item of pendingTodos) {
        try {
          const r = await fetch("/api/todos", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (r.ok) syncedTodos++;
          else remainingTodos.push(item);
        } catch {
          remainingTodos.push(item);
        }
      }
      chrome.storage.local.set({ [PENDING_TODO_KEY]: remainingTodos });
      if (syncedTodos > 0) {
        console.log(`[HOARD Content] Synced ${syncedTodos} pending Todo(s).`);
        window.postMessage({ type: "HOARD_TODOS_UPDATED" }, "*");
      }
    }
  });
}

// Drain on load
drainAllPending();

// Background or popup can also trigger a drain
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "drain_pending") drainAllPending();
});
