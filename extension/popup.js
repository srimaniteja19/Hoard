// HOARD Browser Extension Popup Logic

const DEFAULT_SERVER_URL = "https://hoard-ten.vercel.app";
const PENDING_KEY = "hoard_pending_sync";
const KIND_COLOR = {
  ART: { bg: "#00F0FF", fg: "#000" },
  VID: { bg: "#FF007A", fg: "#fff" },
  PLY: { bg: "#7C4DFF", fg: "#fff" },
  GIT: { bg: "#B6FF3C", fg: "#000" },
  APP: { bg: "#FFE600", fg: "#000" },
  PPR: { bg: "#FF6B00", fg: "#000" },
  DOC: { bg: "#00E58A", fg: "#000" },
};

// Content Kind Auto-Detection
function detectUrlMeta(u) {
  const urlLower = (u || "").toLowerCase().trim();
  const fallback = { ty: "APP", name: "App Shelf", bg: "#7C4DFF", fg: "#fff", f: "Platform: Web" };
  if (!urlLower) return fallback;

  let hostname = "";
  try {
    hostname = new URL(urlLower.startsWith("http") ? urlLower : `https://${urlLower}`).hostname.replace(/^www\./, "");
  } catch {
    hostname = "";
  }

  if (/youtube\.com\/playlist/.test(urlLower)) {
    return { ty: "PLY", name: "Playlist", bg: "#00E58A", fg: "#000", f: "Source: YouTube · Playlist" };
  }
  if (hostname === "youtube.com" || hostname === "youtu.be") {
    return { ty: "VID", name: "Video", bg: "#FF6B00", fg: "#fff", f: "Source: YouTube · Video" };
  }
  // Exact-host match only — a marketing/portal page hosted on a spotify.com
  // subdomain (e.g. xirp.spotify.com) is not a music link.
  if (hostname === "open.spotify.com" || hostname === "music.apple.com") {
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
  // Unrecognized domain: default to APP, not ART. A tool/site we don't
  // recognize is far more often a tool than a long-form article, and ART
  // carries UI implications (word count, reading time) that mislead here.
  return fallback;
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
  const triageStatus = document.getElementById("triageStatus");
  const itemTypeToggle = document.getElementById("itemTypeToggle");
  const hoardList = document.getElementById("hoardList");
  const searchInHoard = document.getElementById("searchInHoard");
  const filterChips = document.querySelectorAll(".filter-chip");
  const openWebAppBtn = document.getElementById("openWebAppBtn");
  const serverUrlInput = document.getElementById("serverUrl");

  // TIL Elements
  const tilTypeChips = document.querySelectorAll("#tilTypeChips .til-chip");
  const tilBodyInput = document.getElementById("tilBody");
  const tilSnippetGroup = document.getElementById("tilSnippetGroup");
  const tilCodeInput = document.getElementById("tilCode");
  const tilLinkUrlInput = document.getElementById("tilLinkUrl");
  const tilDischargeSelect = document.getElementById("tilDischargeSelect");
  const tilTagsInput = document.getElementById("tilTags");
  const tilSaveToQueueCheckbox = document.getElementById("tilSaveToQueue");
  const commitTilBtn = document.getElementById("commitTilBtn");

  let selectedTilType = "FACT";
  let activeTags = new Set(["ai"]);
  let selectedItemType = "REFERENCE";
  let triageTouched = { folder: false, tags: false, itemType: false, note: false };
  let currentActiveTab = null;
  let selectedText = "";

  // Restore Settings (Server URL)
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.get(["hoard_server_url"], (res) => {
      if (res.hoard_server_url && serverUrlInput) serverUrlInput.value = res.hoard_server_url;
    });
  }

  // Save Settings Changes
  if (serverUrlInput) {
    serverUrlInput.addEventListener("change", () => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ hoard_server_url: serverUrlInput.value.trim() });
      }
    });
  }

  // Load active tab info & selection text from Chrome API
  if (typeof chrome !== "undefined" && chrome.tabs) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        currentActiveTab = tabs[0];
        pageTitleInput.value = currentActiveTab.title || "";
        pageUrlInput.value = currentActiveTab.url || "";
        updateDetectionUI(currentActiveTab.url);
        scheduleTriage();
        loadCollections();

        if (tilLinkUrlInput) tilLinkUrlInput.value = currentActiveTab.url || "";

        // Extract selected text if text was highlighted when opening popup
        try {
          const selResult = await chrome.scripting.executeScript({
            target: { tabId: currentActiveTab.id },
            func: () => window.getSelection()?.toString() || "",
          });
          const text = selResult?.[0]?.result;
          if (text && text.trim()) {
            selectedText = text.trim();
            if (pageNoteInput && !pageNoteInput.value) pageNoteInput.value = selectedText;
            if (tilBodyInput) tilBodyInput.value = `"${selectedText}"`;
            const saveLabel = saveBtn?.querySelector("span");
            if (saveLabel) saveLabel.textContent = "SAVE HIGHLIGHT";
          }
        } catch {
          // ignore selection extraction error
        }
      }
    } catch (err) {
      console.warn("Could not query active tab:", err);
    }
  }

  // Handle URL change detection
  pageUrlInput.addEventListener("input", (e) => {
    updateDetectionUI(e.target.value);
    scheduleTriage();
  });

  function updateDetectionUI(url) {
    const meta = detectUrlMeta(url);
    detectType.textContent = meta.ty;
    detectType.style.background = meta.bg;
    detectType.style.color = meta.fg;
    detectTitle.textContent = meta.name;
    detectDetails.textContent = meta.f;
  }

  function flattenFolders(nodes, depth = 0, out = []) {
    (nodes || []).forEach((node) => {
      if (node.id !== "all") {
        out.push({ id: node.id, name: `${"— ".repeat(depth)}${node.name}` });
      }
      if (node.kids) flattenFolders(node.kids, depth + 1, out);
    });
    return out;
  }

  async function loadCollections() {
    if (!folderSelect) return;
    const serverUrl = (serverUrlInput?.value || DEFAULT_SERVER_URL).replace(/\/$/, "");
    try {
      const res = await fetch(`${serverUrl}/api/collections`, { credentials: "include" });
      if (!res.ok) return;
      const tree = await res.json();
      const folders = flattenFolders(tree);
      if (folders.length === 0) return;
      const current = folderSelect.value;
      folderSelect.innerHTML = folders
        .map((f) => `<option value="${f.id}">${f.name}</option>`)
        .join("");
      if ([...folderSelect.options].some((o) => o.value === current)) {
        folderSelect.value = current;
      }
    } catch (e) {
      console.warn("Could not load collections:", e);
    }
  }

  function setItemType(next) {
    selectedItemType = next === "QUEUED" ? "QUEUED" : "REFERENCE";
    itemTypeToggle?.querySelectorAll(".item-type-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-item-type") === selectedItemType);
    });
  }

  function setPrimaryTag(tag) {
    const next = (tag || "saved").replace(/^#/, "").trim();
    if (!next) return;
    activeTags = new Set([next]);
    tagChips.forEach((chip) => {
      chip.classList.toggle("active", chip.getAttribute("data-tag") === next);
    });
    const existing = document.querySelector(`.tag-chip[data-tag="${next}"]`);
    if (!existing && document.getElementById("tagPicker")) {
      const newChip = document.createElement("button");
      newChip.type = "button";
      newChip.className = "tag-chip active";
      newChip.setAttribute("data-tag", next);
      newChip.textContent = `#${next}`;
      newChip.addEventListener("click", () => {
        if (activeTags.has(next)) {
          activeTags.delete(next);
          newChip.classList.remove("active");
        } else {
          activeTags.add(next);
          newChip.classList.add("active");
        }
      });
      document.getElementById("tagPicker").appendChild(newChip);
    }
  }

  let triageDebounce = null;
  async function runTriage() {
    const url = pageUrlInput?.value?.trim();
    if (!url) return;
    const serverUrl = (serverUrlInput?.value || DEFAULT_SERVER_URL).replace(/\/$/, "");
    const meta = detectUrlMeta(url);
    if (triageStatus) triageStatus.textContent = "TRIAGING…";

    try {
      const res = await fetch(`${serverUrl}/api/bookmarks/triage`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title: pageTitleInput?.value || "",
          description: pageNoteInput?.value || "",
          kind: meta.ty,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!triageTouched.itemType && (data.itemType === "REFERENCE" || data.itemType === "QUEUED")) {
        setItemType(data.itemType);
      }
      if (!triageTouched.tags && Array.isArray(data.tags) && data.tags[0]) {
        setPrimaryTag(data.tags[0]);
      }
      if (!triageTouched.folder && data.suggestedCollection && folderSelect) {
        if (![...folderSelect.options].some((o) => o.value === data.suggestedCollection)) {
          const opt = document.createElement("option");
          opt.value = data.suggestedCollection;
          opt.textContent = data.collectionName || data.suggestedCollection;
          folderSelect.appendChild(opt);
        }
        folderSelect.value = data.suggestedCollection;
      }
      if (!triageTouched.note && data.summary && pageNoteInput && !pageNoteInput.value.trim()) {
        pageNoteInput.value = data.summary;
      }
      if (triageStatus) triageStatus.textContent = "TRIAGED — edit anything that's wrong";
    } catch (e) {
      console.warn("Triage failed:", e);
      if (triageStatus) triageStatus.textContent = "TRIAGE SKIPPED";
    }
  }

  function scheduleTriage() {
    if (triageDebounce) clearTimeout(triageDebounce);
    triageDebounce = setTimeout(runTriage, 400);
  }

  // Load Unread Bookmarks for Discharge Dropdown
  async function loadUnreadBookmarksForDischarge() {
    if (!tilDischargeSelect) return;
    const serverUrl = (serverUrlInput?.value || DEFAULT_SERVER_URL).replace(/\/$/, "");

    try {
      const res = await fetch(`${serverUrl}/api/bookmarks?unread=true`, {
        credentials: "include",
      });

      if (res.ok) {
        const bookmarks = await res.json();
        tilDischargeSelect.innerHTML = `<option value="">-- Optional: Select bookmark to mark read --</option>`;
        bookmarks.forEach((b) => {
          const opt = document.createElement("option");
          opt.value = String(b.id);
          opt.textContent = `[${b.ty}] ${b.title || b.url}`;
          tilDischargeSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn("Could not load unread bookmarks for discharge:", e);
    }
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
      } else if (targetTab === "til") {
        loadUnreadBookmarksForDischarge();
      }
    });
  });

  // TIL Type Chips Selection
  tilTypeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      tilTypeChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      selectedTilType = chip.getAttribute("data-type") || "FACT";

      if (tilSnippetGroup) {
        tilSnippetGroup.style.display = selectedTilType === "SNIPPET" ? "block" : "none";
      }
    });
  });

  // Commit TIL Entry
  if (commitTilBtn) {
    commitTilBtn.addEventListener("click", async () => {
      const bodyText = tilBodyInput.value.trim();
      const codeText = tilCodeInput ? tilCodeInput.value.trim() : "";
      if (!bodyText && (selectedTilType !== "SNIPPET" || !codeText)) {
        showToast("⚠️ PLEASE ENTER LEARNING BODY OR CODE", true);
        return;
      }

      const serverUrl = (serverUrlInput?.value || DEFAULT_SERVER_URL).replace(/\/$/, "");

      const rawTags = tilTagsInput ? tilTagsInput.value : "";
      const tags = rawTags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      const payload = {
        type: selectedTilType,
        body: bodyText,
        code: selectedTilType === "SNIPPET" ? codeText : undefined,
        linkUrl: tilLinkUrlInput ? tilLinkUrlInput.value.trim() || undefined : undefined,
        dischargesBookmarkId: tilDischargeSelect?.value ? parseInt(tilDischargeSelect.value, 10) : undefined,
        tags,
        saveToHoardQueue: tilSaveToQueueCheckbox ? tilSaveToQueueCheckbox.checked : false,
      };

      try {
        const res = await fetch(`${serverUrl}/api/til`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showToast("✓ TIL COMMITTED!");
          tilBodyInput.value = "";
          if (tilCodeInput) tilCodeInput.value = "";
          if (tilTagsInput) tilTagsInput.value = "";
          if (typeof chrome !== "undefined" && chrome.runtime) {
            chrome.runtime.sendMessage({ action: "til_saved" });
          }
          return;
        }
      } catch (err) {
        console.warn("Direct TIL commit failed, saving to offline queue:", err);
      }

      // Offline Queue Fallback
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get(["offline_til_queue"], (res) => {
          const queue = res.offline_til_queue || [];
          queue.push({ ...payload, createdAt: new Date().toISOString() });
          chrome.storage.local.set({ offline_til_queue: queue }, () => {
            showToast("✓ SAVED OFFLINE — will sync");
            if (typeof chrome !== "undefined" && chrome.runtime) {
              chrome.runtime.sendMessage({ action: "trigger_til_sync" });
            }
          });
        });
      } else {
        showToast("✓ TIL SAVED");
      }
    });
  }

  itemTypeToggle?.querySelectorAll(".item-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      triageTouched.itemType = true;
      setItemType(btn.getAttribute("data-item-type"));
    });
  });

  folderSelect?.addEventListener("change", () => {
    triageTouched.folder = true;
  });

  pageNoteInput?.addEventListener("input", () => {
    triageTouched.note = true;
  });
  tagChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const tagName = chip.getAttribute("data-tag");
      triageTouched.tags = true;
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
      triageTouched.tags = true;
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
    try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch {}

    const firstTag = Array.from(activeTags)[0] || "saved";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = new Date();

    const newBookmark = {
      t:      title,
      ty:     meta.ty,
      src:    domain,
      url,
      mins:   meta.ty === "VID" ? 45 : meta.ty === "PPR" ? 40 : 15,
      tag:    firstTag,
      coll:   folderSelect.value || "unsorted",
      unread: true,
      itemType: selectedItemType,
      itemTypeGuessed: false,
      triaged: true,
      ex:     { Source: domain, Type: meta.name },
      note:   pageNoteInput.value.trim() || "",
      source: "Saved via HOARD Extension",
      when:   `${months[d.getMonth()]} ${d.getDate()}`,
      ...(selectedText ? { quote: pageNoteInput.value.trim() || selectedText } : {}),
    };

    if (typeof chrome !== "undefined" && chrome.storage) {
      // 1. Save to extension's local list (for MY HOARD popup tab)
      chrome.storage.local.get(["hoard_bookmarks"], (res) => {
        const list = res.hoard_bookmarks || [];
        list.unshift({ ...newBookmark, id: Date.now() });
        chrome.storage.local.set({ hoard_bookmarks: list });
      });

      // 2. Save to DB via open Hoard tab or backend API
      const queueOffline = () => {
        chrome.storage.local.get([PENDING_KEY], (res) => {
          const pending = res[PENDING_KEY] || [];
          pending.push(newBookmark);
          chrome.storage.local.set({ [PENDING_KEY]: pending }, () => {
            showToast("✓ SAVED — syncs when Hoard opens");
            chrome.runtime.sendMessage({ action: "bookmark_saved" });
          });
        });
      };

      chrome.tabs.query({ url: ["*://*.vercel.app/*", "*://localhost/*"] }, (tabs) => {
        if (tabs && tabs.length > 0) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            world: "MAIN",
            func: async (bm) => {
              try {
                const res = await fetch("/api/bookmarks", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(bm),
                });
                if (res.ok) window.postMessage({ type: "HOARD_BOOKMARKS_UPDATED" }, "*");
                return res.ok;
              } catch (e) {
                console.error("[HOARD Popup] fetch failed:", e);
                return false;
              }
            },
            args: [newBookmark],
          }, (results) => {
            // executeScript's own failure (no matching frame, injection
            // blocked, etc.) leaves results undefined — treat that the same
            // as the injected fetch itself reporting false.
            const succeeded = results?.[0]?.result === true;
            if (succeeded) {
              showToast("✓ SAVED TO HOARD");
              chrome.runtime.sendMessage({ action: "bookmark_saved" });
            } else {
              queueOffline();
            }
          });
        } else {
          // No Hoard tab open — queue for content script to sync on next load
          queueOffline();
        }
      });
    } else {
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

          // Local cache items carry a Date.now() id, not the real DB id — resolve
          // by URL server-side instead (LIBRARY.md §2). Fire-and-forget, must
          // never block or interrupt the tab open.
          const serverUrl = (serverUrlInput?.value || DEFAULT_SERVER_URL).replace(/\/$/, "");
          fetch(`${serverUrl}/api/bookmarks/use-by-url`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: item.url }),
          }).catch((e) => console.warn("[HOARD] recordUse failed:", e));
        });

        hoardList.appendChild(el);
      });
    });
  }

  // Ranked full-text search (LIBRARY.md §4/§5) — reuses the same
  // /api/library/search endpoint the web app's ⌘K palette calls. Falls back
  // to the local-cache substring filter on failure (offline, not logged in)
  // or an empty query.
  let searchDebounce = null;
  function renderRankedSearchResults(query, filter) {
    const serverUrl = (serverUrlInput?.value || DEFAULT_SERVER_URL).replace(/\/$/, "");
    fetch(`${serverUrl}/api/library/search?q=${encodeURIComponent(query)}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((results) => {
        const filtered = filter === "all" ? results : results.filter((r) => r.ty === filter);

        if (filtered.length === 0) {
          hoardList.innerHTML = `<div style="text-align: center; padding: 20px; font-family: var(--mono); font-size: 11px; opacity: .7;">NO MATCHING BOOKMARKS</div>`;
          return;
        }

        hoardList.innerHTML = "";
        filtered.forEach((r) => {
          const el = document.createElement("div");
          el.className = "hoard-item";
          const color = KIND_COLOR[r.ty] || KIND_COLOR.APP;

          el.innerHTML = `
            <div style="flex: 1; overflow: hidden;">
              <div class="hoard-item-title" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${r.title}</div>
              <div class="hoard-item-meta">
                <span style="background: ${color.bg}; color: ${color.fg}; padding: 1px 4px; border: 1px solid #000; font-weight: 800;">${r.ty}</span>
                <span style="margin-left: 4px;">${r.src}</span> · <span>#${r.tag}</span>
                · <span style="font-weight: 800;">${r.useCount}×</span>
              </div>
            </div>
            <div class="hoard-item-actions">
              <button class="icon-btn copy-btn" title="Copy URL">📋</button>
              <button class="icon-btn open-btn" title="Open Link">↗</button>
            </div>
          `;

          el.querySelector(".copy-btn").addEventListener("click", () => {
            navigator.clipboard.writeText(r.url);
            showToast("✓ COPIED LINK");
          });

          el.querySelector(".open-btn").addEventListener("click", () => {
            if (typeof chrome !== "undefined" && chrome.tabs) {
              chrome.tabs.create({ url: r.url });
            } else {
              window.open(r.url, "_blank");
            }
            fetch(`${serverUrl}/api/bookmarks/${r.id}/use`, {
              method: "POST",
              credentials: "include",
            }).catch((e) => console.warn("[HOARD] recordUse failed:", e));
          });

          hoardList.appendChild(el);
        });
      })
      .catch((e) => {
        console.warn("[HOARD] ranked search failed, falling back to local cache:", e);
        renderHoardList(query, filter);
      });
  }

  // Search Filter Input
  searchInHoard.addEventListener("input", (e) => {
    const query = e.target.value;
    const activeFilter = document.querySelector(".filter-chip.active")?.getAttribute("data-filter") || "all";

    if (searchDebounce) clearTimeout(searchDebounce);

    if (!query.trim()) {
      renderHoardList(query, activeFilter);
      return;
    }

    searchDebounce = setTimeout(() => {
      renderRankedSearchResults(query.trim(), activeFilter);
    }, 200);
  });

  // Filter Chips in Search Tab
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.getAttribute("data-filter");
      const query = searchInHoard.value.trim();
      if (query) {
        renderRankedSearchResults(query, filter);
      } else {
        renderHoardList(searchInHoard.value, filter);
      }
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
