# HOARD — Contextual Bookmark Manager

A neo-brutalist contextual bookmark manager for articles, videos, repos, papers, and apps.

## 🚀 Features

- **Neo-Brutalist Aesthetic**: Built with Space Grotesk & JetBrains Mono typography, bold color palette (`#FFE600`, `#FF007A`, `#00F0FF`, `#B6FF3C`), 3px solid black borders, and hard shadow cards.
- **Mobile Responsive**: Fully responsive grid/list/masonry/headlines layouts, touch controls, and slide-out mobile navigation drawer (`☰ MENU`).
- **PWA Ready**: Installable as a standalone app on iOS, Android, macOS, and Windows with offline Service Worker caching.
- **Web Share Target**: Share links directly from YouTube, Twitter, Chrome, Safari, or Spotify into HOARD.
- **Browser Extension**: Manifest V3 extension with smart URL auto-detection, keyboard shortcuts (`Alt+Shift+H`), right-click context menu, and popup search.

---

## 🔌 Browser Extension Installation

1. Open your browser extension management page:
   - **Chrome / Brave / Edge**: `chrome://extensions`
   - **Arc**: `arc://extensions`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `extension/` directory in this repository.

### Extension Shortcuts:
- **Save Tab**: `Alt + Shift + H` (or `Cmd + Shift + H` on Mac)
- **Right-Click**: Right-click any web link or highlighted text → **"Save to HOARD"**

---

## 🏃 Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch the web application.

### Build Production Bundle:
```bash
npm run build
```

