// HOARD Browser Extension Popup Logic

const DEFAULT_SERVER_URL = "https://hoard-ten.vercel.app";
const STORAGE_KEY = "hoard_bookmarks_v2";
const PENDING_KEY = "hoard_pending_sync";

// Content Kind Auto-Detection
function detectUrlMeta(u) {
  const urlLower = (u || "").toLowerCase().trim();
  if (!urlLower) return { ty: "ART", name: "Article", bg: "#00F0FF", fg: "#000", f: "Web Article" };

  if (/youtube\.com\/playlist/.test(urlLower)) {
    return { ty: "PLY", name: "Playlist", bg: "#00E58A", fg: "#000", f: "Source: YouTube · Playlist" };
  }
  if (/youtube\.com|youtu\.be/.test(urlLower)) {
    return { ty: "VID", name: "Video", bg: "#FF6B00", fg: "#fff", f: "Source: YouTube · Video" };
  }
  if (/spotify|music\.apple/.test(urlLower)) {
    return { ty: "PLY", name: "Audio", bg: "#00E58A", fg: "#000", f: "Source: Spotify · Audio" };
  }
  if (/github\.com\/[\w.-]+\/[\w.-]+/.test(urlLower)) {
    return { ty: "GIT", name: "Repository", bg: "#B6FF3C", fg: "#000", f: "Source: GitHub · Code Repo" };
  }
  if (/arxiv|acm\.org|ieee/.test(urlLower)) {
    return { ty: "PPR", name: "Paper", bg: "#FF007A", fg: "#fff", f: "Source: arXiv · PDF Paper" };
  }
  if (/raycast|warp\.dev|excalidraw|apps\.apple|play\.google/.test(urlLower)) {
    return { ty: "APP", name: "App Shelf", bg: "#7C4DFF", fg: "#fff", f: "Platform: Desktop / Mobile App" };
  }
  if (/docs\.|developer\.|\/docs\//.test(urlLower)) {
    return { ty: "DOC", name: "Documentation", bg: "#FFE600", fg: "#000", f: "Type: Reference Docs" };
  }
  return { ty: "ART", name: "Article", bg: "#00F0FF", fg: "#000", f: "Type: Web Article" };
}

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const pageTitleInput = document.getElementById("pageTitle");
  const pageUrlInput = document.getElementById("pageUrl");
  const pageNoteInput = document.getElementById("pageNote");
  const folderSelect = document.getElementById("folderSelect");
  const tagChips = document.querySelectorAll(".tag-chip");
  const customTagInput = document.getElementById("customTag");
  const saveBtn = document.getElementById("saveBtn");
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  const detectType = document.getElementById("detectType");
  const detectTitle = document.getElementById("detectTitle");
  const detectDetails = document.getElementById("detectDetails");
  const hoardList = document.getElementById("hoardList");
  const searchInHoard = document.getElementById("searchInHoard");
  const filterChips = document.querySelectorAll(".filter-chip");
  const openWebAppBtn = document.getElementById("openWebAppBtn");
  const serverUrlInput = document.getElementById("serverUrl");

  let activeTags = new Set(["ai"]);
  let currentActiveTab = null;

  // Load active tab info from Chrome API
  if (typeof chrome !== "undefined" && chrome.tabs) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        currentActiveTab = tabs[0];
        pageTitleInput.value = currentActiveTab.title || "";
        pageUrlInput.value = currentActiveTab.url || "";
        updateDetectionUI(currentActiveTab.url);
      }
    } catch (err) {
      console.warn("Could not query active tab:", err);
    }
  }

  // Handle URL change detection
  pageUrlInput.addEventListener("input", (e) => {
    updateDetectionUI(e.target.value);
  });

  function updateDetectionUI(url) {
    const meta = detectUrlMeta(url);
    detectType.textContent = meta.ty;
    detectType.style.background = meta.bg;
    detectType.style.color = meta.fg;
    detectTitle.textContent = meta.name;
    detectDetails.textContent = meta.f;
  }

  // Tab Navigation Switching
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => (c.style.display = "none"));

      btn.classList.add("active");
      const targetEl = document.getElementById(`tab-${targetTab}`);
      if (targetEl) targetEl.style.display = "block";

      if (targetTab === "hoard") {
        renderHoardList();
      }
    });
  });

  // Tag Chips Handler
  tagChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const tagName = chip.getAttribute("data-tag");
      if (activeTags.has(tagName)) {
        activeTags.delete(tagName);
        chip.classList.remove("active");
      } else {
        activeTags.add(tagName);
        chip.classList.add("active");
      }
    });
  });

  // Custom Tag Input
  customTagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && customTagInput.value.trim()) {
      e.preventDefault();
      const rawTag = customTagInput.value.trim().replace(/^#/, "");
      activeTags.add(rawTag);

      // Create new tag chip dynamically
      const newChip = document.createElement("button");
      newChip.type = "button";
      newChip.className = "tag-chip active";
      newChip.setAttribute("data-tag", rawTag);
      newChip.textContent = `#${rawTag}`;
      newChip.addEventListener("click", () => {
        if (activeTags.has(rawTag)) {
          activeTags.delete(rawTag);
          newChip.classList.remove("active");
        } else {
          activeTags.add(rawTag);
          newChip.classList.add("active");
        }
      });
      document.getElementById("tagPicker").appendChild(newChip);
      customTagInput.value = "";
    }
  });

  // Save Bookmark
  saveBtn.addEventListener("click", async () => {
    const url = pageUrlInput.value.trim();
    const title = pageTitleInput.value.trim() || "New Bookmark";
    if (!url) {
      showToast("⚠️ PLEASE ENTER A VALID URL", true);
      return;
    }

    const meta = detectUrlMeta(url);
    let domain = "web";
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      domain = "web";
    }

    const firstTag = Array.from(activeTags)[0] || "saved";

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = new Date();
    const when = `${months[d.getMonth()]} ${d.getDate()}`;

    // Shape matches hoard_bookmarks_v2 used by the web app
    const newBookmark = {
      t: title,
      ty: meta.ty,
      src: domain,
      url: url,
      mins: meta.ty === "VID" ? 45 : meta.ty === "PPR" ? 40 : 15,
      tag: firstTag,
      coll: folderSelect.value || "unsorted",
      unread: true,
      ex: { Source: domain, Type: meta.name },
      note: pageNoteInput.value.trim() || "Saved via HOARD Extension",
      when,
    };

    if (typeof chrome !== "undefined" && chrome.storage) {
      // 1. Save to extension's local storage (for MY HOARD tab in popup)
      chrome.storage.local.get(["hoard_bookmarks"], (res) => {
        const list = res.hoard_bookmarks || [];
        list.unshift({ ...newBookmark, id: Date.now() });
        chrome.storage.local.set({ hoard_bookmarks: list });
      });

      // 2. Try to inject directly into an open Hoard tab via background script
      chrome.tabs.query({ url: `${DEFAULT_SERVER_URL}/*` }, (tabs) => {
        if (tabs && tabs.length > 0) {
          // Hoard tab is open — inject directly into its localStorage
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            world: "MAIN",
            func: (bm, storageKey) => {
              try {
                const raw = localStorage.getItem(storageKey);
                const list = raw ? JSON.parse(raw) : [];
                const maxId = list.reduce((acc, x) => Math.max(acc, x.id ?? -1), -1);
                list.unshift({ ...bm, id: maxId + 1 });
                localStorage.setItem(storageKey, JSON.stringify(list));
                window.dispatchEvent(new StorageEvent("storage", {
                  key: storageKey,
                  newValue: JSON.stringify(list),
                  storageArea: localStorage,
                }));
              } catch (e) {
                console.error("[HOARD Popup] Inject failed:", e);
              }
            },
            args: [newBookmark, STORAGE_KEY],
          }, () => {
            showToast("✓ SAVED TO HOARD");
            chrome.runtime.sendMessage({ action: "bookmark_saved" });
          });
        } else {
          // Hoard tab not open — queue for next load
          chrome.storage.local.get([PENDING_KEY], (res) => {
            const pending = res[PENDING_KEY] || [];
            pending.push(newBookmark);
            chrome.storage.local.set({ [PENDING_KEY]: pending }, () => {
              showToast("✓ SAVED — will sync when Hoard opens");
              chrome.runtime.sendMessage({ action: "bookmark_saved" });
            });
          });
        }
      });
    } else {
      // Dev fallback: write directly to localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const maxId = list.reduce((acc, x) => Math.max(acc, x.id ?? -1), -1);
        list.unshift({ ...newBookmark, id: maxId + 1 });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {}
      showToast("✓ SAVED TO HOARD");
    }
  });

  // Render Saved Items in "MY HOARD" Tab
  function renderHoardList(query = "", filter = "all") {
    hoardList.innerHTML = "";

    const getItems = (callback) => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get(["hoard_bookmarks"], (res) => {
          callback(res.hoard_bookmarks || []);
        });
      } else {
        callback(JSON.parse(localStorage.getItem("hoard_bookmarks") || "[]"));
      }
    };

    getItems((items) => {
      if (items.length === 0) {
        hoardList.innerHTML = `<div style="text-align: center; padding: 20px; font-family: var(--mono); font-size: 11px; opacity: .7;">YOUR HOARD IS EMPTY.<br/>Save your first tab!</div>`;
        return;
      }

      const filtered = items.filter((item) => {
        const matchesQuery =
          !query ||
          item.t.toLowerCase().includes(query.toLowerCase()) ||
          item.url.toLowerCase().includes(query.toLowerCase()) ||
          (item.tag && item.tag.toLowerCase().includes(query.toLowerCase()));

        const matchesFilter =
          filter === "all" ||
          (filter === "unread" && item.unread) ||
          item.ty === filter;

        return matchesQuery && matchesFilter;
      });

      if (filtered.length === 0) {
        hoardList.innerHTML = `<div style="text-align: center; padding: 20px; font-family: var(--mono); font-size: 11px; opacity: .7;">NO MATCHING BOOKMARKS</div>`;
        return;
      }

      filtered.forEach((item) => {
        const el = document.createElement("div");
        el.className = "hoard-item";
        const meta = detectUrlMeta(item.url);

        el.innerHTML = `
          <div style="flex: 1; overflow: hidden;">
            <div class="hoard-item-title" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.t}</div>
            <div class="hoard-item-meta">
              <span style="background: ${meta.bg}; color: ${meta.fg}; padding: 1px 4px; border: 1px solid #000; font-weight: 800;">${item.ty}</span>
              <span style="margin-left: 4px;">${item.src}</span> · <span>#${item.tag}</span>
            </div>
          </div>
          <div class="hoard-item-actions">
            <button class="icon-btn copy-btn" title="Copy URL">📋</button>
            <button class="icon-btn open-btn" title="Open Link">↗</button>
          </div>
        `;

        el.querySelector(".copy-btn").addEventListener("click", () => {
          navigator.clipboard.writeText(item.url);
          showToast("✓ COPIED LINK");
        });

        el.querySelector(".open-btn").addEventListener("click", () => {
          if (typeof chrome !== "undefined" && chrome.tabs) {
            chrome.tabs.create({ url: item.url });
          } else {
            window.open(item.url, "_blank");
          }
        });

        hoardList.appendChild(el);
      });
    });
  }

  // Search Filter Input
  searchInHoard.addEventListener("input", (e) => {
    const activeFilter = document.querySelector(".filter-chip.active")?.getAttribute("data-filter") || "all";
    renderHoardList(e.target.value, activeFilter);
  });

  // Filter Chips in Search Tab
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.getAttribute("data-filter");
      renderHoardList(searchInHoard.value, filter);
    });
  });

  // Open Web App Button
  openWebAppBtn.addEventListener("click", () => {
    const serverUrl = serverUrlInput.value.trim() || DEFAULT_SERVER_URL;
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: serverUrl });
    } else {
      window.open(serverUrl, "_blank");
    }
  });

  // Toast Banner Helper
  function showToast(msg, isError = false) {
    toastMsg.textContent = msg;
    toast.style.background = isError ? "#FF007A" : "#B6FF3C";
    toast.style.color = isError ? "#fff" : "#000";
    toast.style.display = "block";

    setTimeout(() => {
      toast.style.display = "none";
    }, 2400);
  }
});
