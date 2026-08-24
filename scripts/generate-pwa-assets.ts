import sharp from "sharp";
import fs from "fs";
import path from "path";

const publicDir = path.join(process.cwd(), "public");

// SVG definitions
const standardIconSvg = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" fill="#F4F0EA"/>
  <!-- Neobrutalist Shadow -->
  <rect x="88" y="88" width="360" height="360" rx="20" fill="#000000"/>
  <!-- Main Badge -->
  <rect x="64" y="64" width="360" height="360" rx="20" fill="#FFE600" stroke="#000000" stroke-width="28"/>
  <!-- H letter mark -->
  <path d="M160 140V372M352 140V372M160 256H352" stroke="#000000" stroke-width="52" stroke-linecap="square" stroke-linejoin="miter"/>
</svg>`;

// Maskable icon with 20% safe zone padding around the graphic
const maskableIconSvg = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" fill="#FFE600"/>
  <!-- Safe zone inner content (centered with plenty of margin) -->
  <g transform="translate(56, 56) scale(0.78)">
    <rect x="88" y="88" width="360" height="360" rx="24" fill="#000000"/>
    <rect x="64" y="64" width="360" height="360" rx="24" fill="#F4F0EA" stroke="#000000" stroke-width="28"/>
    <path d="M160 140V372M352 140V372M160 256H352" stroke="#000000" stroke-width="52" stroke-linecap="square" stroke-linejoin="miter"/>
  </g>
</svg>`;

// Apple Touch Icon (180x180) with rounded badge styling
const appleTouchIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" fill="#FFE600"/>
  <rect x="26" y="26" width="128" height="128" rx="16" fill="#000000"/>
  <rect x="20" y="20" width="128" height="128" rx="16" fill="#F4F0EA" stroke="#000000" stroke-width="10"/>
  <path d="M52 48V132M128 48V132M52 90H128" stroke="#000000" stroke-width="18" stroke-linecap="square"/>
</svg>`;

// Wide Screenshot Preview (1280x720) in Neo-brutalist HOARD style
const wideScreenshotSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <rect width="1280" height="720" fill="#F4F0EA"/>
  <!-- Header Bar -->
  <rect x="32" y="24" width="1216" height="64" fill="#FFE600" stroke="#000000" stroke-width="4"/>
  <text x="64" y="64" font-family="monospace" font-size="24" font-weight="900" fill="#000000">HOARD // CONTEXTUAL BOOKMARK MANAGER</text>
  <rect x="1080" y="36" width="136" height="40" fill="#000000"/>
  <text x="1108" y="62" font-family="monospace" font-size="16" font-weight="800" fill="#FFE600">STASH [⌘K]</text>

  <!-- Sidebar Column -->
  <rect x="32" y="112" width="280" height="576" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
  <rect x="48" y="132" width="248" height="44" fill="#00F0FF" stroke="#000000" stroke-width="3"/>
  <text x="68" y="160" font-family="monospace" font-size="16" font-weight="900" fill="#000000">📚 LIBRARY (1,420)</text>
  
  <rect x="48" y="192" width="248" height="40" fill="#F4F0EA" stroke="#000000" stroke-width="2"/>
  <text x="68" y="218" font-family="monospace" font-size="14" font-weight="700" fill="#000000">⚡ TODAY I LEARNED</text>

  <rect x="48" y="244" width="248" height="40" fill="#F4F0EA" stroke="#000000" stroke-width="2"/>
  <text x="68" y="270" font-family="monospace" font-size="14" font-weight="700" fill="#000000">☑ AGENDA / TODOS</text>

  <rect x="48" y="296" width="248" height="40" fill="#F4F0EA" stroke="#000000" stroke-width="2"/>
  <text x="68" y="322" font-family="monospace" font-size="14" font-weight="700" fill="#000000">🗺 ATLAS ROADMAP</text>

  <rect x="48" y="348" width="248" height="40" fill="#B6FF3C" stroke="#000000" stroke-width="3"/>
  <text x="68" y="374" font-family="monospace" font-size="14" font-weight="800" fill="#000000">📰 SUNDAY GAZETTE</text>

  <!-- Main Content Grid -->
  <!-- Card 1 -->
  <g transform="translate(344, 112)">
    <rect x="8" y="8" width="280" height="260" fill="#000000"/>
    <rect x="0" y="0" width="280" height="260" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
    <rect x="0" y="0" width="280" height="36" fill="#FFE600" stroke="#000000" stroke-width="3"/>
    <text x="16" y="24" font-family="monospace" font-size="14" font-weight="900" fill="#000000">ARTICLE · #AI</text>
    <text x="16" y="70" font-family="sans-serif" font-size="18" font-weight="900" fill="#000000">Attention Is All You Need</text>
    <text x="16" y="100" font-family="monospace" font-size="12" fill="#555555">arxiv.org · 12 min read</text>
    <rect x="16" y="120" width="248" height="90" fill="#F4F0EA" stroke="#000000" stroke-width="2"/>
    <text x="28" y="148" font-family="monospace" font-size="12" fill="#000000">"The dominant sequence</text>
    <text x="28" y="168" font-family="monospace" font-size="12" fill="#000000">transduction models are</text>
    <text x="28" y="188" font-family="monospace" font-size="12" fill="#000000">based on complex RNNs..."</text>
    <rect x="16" y="222" width="70" height="24" fill="#00F0FF" stroke="#000000" stroke-width="2"/>
    <text x="26" y="238" font-family="monospace" font-size="11" font-weight="800" fill="#000000">GHOST</text>
  </g>

  <!-- Card 2 -->
  <g transform="translate(656, 112)">
    <rect x="8" y="8" width="280" height="260" fill="#000000"/>
    <rect x="0" y="0" width="280" height="260" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
    <rect x="0" y="0" width="280" height="36" fill="#FF5C00" stroke="#000000" stroke-width="3"/>
    <text x="16" y="24" font-family="monospace" font-size="14" font-weight="900" fill="#FFFFFF">GITHUB REPO</text>
    <text x="16" y="70" font-family="sans-serif" font-size="18" font-weight="900" fill="#000000">drizzle-team/drizzle-orm</text>
    <text x="16" y="100" font-family="monospace" font-size="12" fill="#555555">github.com · TypeScript</text>
    <rect x="16" y="120" width="248" height="90" fill="#F4F0EA" stroke="#000000" stroke-width="2"/>
    <text x="28" y="150" font-family="monospace" font-size="12" fill="#000000">★ 36.2k stars · TypeScript</text>
    <text x="28" y="174" font-family="monospace" font-size="12" fill="#000000">Next generation ORM for SQL</text>
    <rect x="16" y="222" width="90" height="24" fill="#B6FF3C" stroke="#000000" stroke-width="2"/>
    <text x="24" y="238" font-family="monospace" font-size="11" font-weight="800" fill="#000000">REFERENCE</text>
  </g>

  <!-- Card 3 -->
  <g transform="translate(968, 112)">
    <rect x="8" y="8" width="280" height="260" fill="#000000"/>
    <rect x="0" y="0" width="280" height="260" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
    <rect x="0" y="0" width="280" height="36" fill="#B6FF3C" stroke="#000000" stroke-width="3"/>
    <text x="16" y="24" font-family="monospace" font-size="14" font-weight="900" fill="#000000">VIDEO · YOUTUBE</text>
    <text x="16" y="70" font-family="sans-serif" font-size="18" font-weight="900" fill="#000000">Building Local First Apps</text>
    <text x="16" y="100" font-family="monospace" font-size="12" fill="#555555">youtube.com · 42m</text>
    <rect x="16" y="120" width="248" height="90" fill="#000000" stroke="#000000" stroke-width="2"/>
    <text x="110" y="172" font-family="sans-serif" font-size="28" fill="#FFE600">▶</text>
    <rect x="16" y="222" width="70" height="24" fill="#FF3366" stroke="#000000" stroke-width="2"/>
    <text x="24" y="238" font-family="monospace" font-size="11" font-weight="800" fill="#FFFFFF">UNREAD</text>
  </g>

  <!-- Bottom Row: Stash Command Bar -->
  <g transform="translate(344, 404)">
    <rect x="8" y="8" width="904" height="284" fill="#000000"/>
    <rect x="0" y="0" width="904" height="284" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
    <rect x="24" y="24" width="856" height="52" fill="#FFE600" stroke="#000000" stroke-width="3"/>
    <text x="44" y="56" font-family="monospace" font-size="18" font-weight="800" fill="#000000">> /stash https://github.com/astral-sh/uv #python #fast</text>
    
    <text x="24" y="112" font-family="monospace" font-size="14" font-weight="900" fill="#000000">DESTINATION: QUEUE // SUGGESTED KIND: GITHUB REPO</text>
    <rect x="24" y="132" width="856" height="120" fill="#F4F0EA" stroke="#000000" stroke-width="2"/>
    <text x="44" y="166" font-family="monospace" font-size="14" font-weight="700" fill="#000000">uv: An extremely fast Python package and project manager written in Rust.</text>
    <text x="44" y="196" font-family="monospace" font-size="12" fill="#444444">Auto-tags: #python #tooling #rust · 10–100x faster than pip</text>
    <text x="44" y="226" font-family="monospace" font-size="12" font-weight="800" fill="#00F0FF">★ PRESS ENTER TO COMMIT TO THE SHELF</text>
  </g>
</svg>`;

// Narrow Screenshot Preview (750x1334) for mobile devices
const narrowScreenshotSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1334" width="750" height="1334">
  <rect width="750" height="1334" fill="#F4F0EA"/>
  <!-- Top App Header -->
  <rect x="24" y="24" width="702" height="88" fill="#FFE600" stroke="#000000" stroke-width="4"/>
  <text x="48" y="76" font-family="monospace" font-size="30" font-weight="900" fill="#000000">⚡ HOARD</text>
  <rect x="540" y="44" width="160" height="48" fill="#000000"/>
  <text x="564" y="76" font-family="monospace" font-size="18" font-weight="800" fill="#FFE600">+ STASH</text>

  <!-- Filter chips -->
  <g transform="translate(24, 136)">
    <rect x="0" y="0" width="120" height="44" fill="#000000"/>
    <text x="24" y="28" font-family="monospace" font-size="16" font-weight="800" fill="#FFE600">ALL (42)</text>
    <rect x="136" y="0" width="140" height="44" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>
    <text x="156" y="28" font-family="monospace" font-size="16" font-weight="800" fill="#000000">UNREAD (14)</text>
    <rect x="292" y="0" width="120" height="44" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>
    <text x="316" y="28" font-family="monospace" font-size="16" font-weight="800" fill="#000000">TIL (28)</text>
    <rect x="428" y="0" width="140" height="44" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>
    <text x="448" y="28" font-family="monospace" font-size="16" font-weight="800" fill="#000000">TODOS (9)</text>
  </g>

  <!-- Mobile Card 1 -->
  <g transform="translate(24, 210)">
    <rect x="6" y="6" width="702" height="320" fill="#000000"/>
    <rect x="0" y="0" width="702" height="320" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
    <rect x="0" y="0" width="702" height="48" fill="#FFE600" stroke="#000000" stroke-width="3"/>
    <text x="24" y="32" font-family="monospace" font-size="18" font-weight="900" fill="#000000">ARTICLE · #DISTRIBUTED-SYSTEMS</text>
    <text x="24" y="96" font-family="sans-serif" font-size="26" font-weight="900" fill="#000000">Raft Consensus Algorithm Explained</text>
    <text x="24" y="136" font-family="monospace" font-size="16" fill="#666666">thesecretlivesofdata.com · 8 min</text>
    <rect x="24" y="160" width="654" height="96" fill="#F4F0EA" stroke="#000000" stroke-width="2"/>
    <text x="44" y="196" font-family="monospace" font-size="16" fill="#000000">"Understandable Distributed Consensus with</text>
    <text x="44" y="226" font-family="monospace" font-size="16" fill="#000000">Leader Election and Log Replication..."</text>
    <rect x="24" y="270" width="110" height="34" fill="#00F0FF" stroke="#000000" stroke-width="2"/>
    <text x="36" y="293" font-family="monospace" font-size="14" font-weight="800" fill="#000000">GHOST READ</text>
  </g>

  <!-- Mobile Card 2 -->
  <g transform="translate(24, 560)">
    <rect x="6" y="6" width="702" height="320" fill="#000000"/>
    <rect x="0" y="0" width="702" height="320" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
    <rect x="0" y="0" width="702" height="48" fill="#B6FF3C" stroke="#000000" stroke-width="3"/>
    <text x="24" y="32" font-family="monospace" font-size="18" font-weight="900" fill="#000000">TODAY I LEARNED (TIL)</text>
    <text x="24" y="96" font-family="sans-serif" font-size="26" font-weight="900" fill="#000000">PostgreSQL EXPLAIN ANALYZE vs BUFFERS</text>
    <text x="24" y="136" font-family="monospace" font-size="16" fill="#666666">database-tips · 2 days ago</text>
    <rect x="24" y="160" width="654" height="96" fill="#F4F0EA" stroke="#000000" stroke-width="2"/>
    <text x="44" y="196" font-family="monospace" font-size="16" fill="#000000">Always use (ANALYZE, BUFFERS) to see</text>
    <text x="44" y="226" font-family="monospace" font-size="16" fill="#000000">shared hit vs disk read blocks directly.</text>
    <rect x="24" y="270" width="140" height="34" fill="#FFE600" stroke="#000000" stroke-width="2"/>
    <text x="36" y="293" font-family="monospace" font-size="14" font-weight="800" fill="#000000">CONSTELLATION</text>
  </g>

  <!-- Mobile Card 3 -->
  <g transform="translate(24, 910)">
    <rect x="6" y="6" width="702" height="360" fill="#000000"/>
    <rect x="0" y="0" width="702" height="360" fill="#FFFFFF" stroke="#000000" stroke-width="4"/>
    <rect x="0" y="0" width="702" height="48" fill="#FF3366" stroke="#000000" stroke-width="3"/>
    <text x="24" y="32" font-family="monospace" font-size="18" font-weight="900" fill="#FFFFFF">AGENDA / TODO</text>
    <text x="24" y="96" font-family="sans-serif" font-size="26" font-weight="900" fill="#000000">Ship PWA Service Worker v2.0</text>
    <text x="24" y="136" font-family="monospace" font-size="16" fill="#666666">due today · ~25m · priority: high</text>
    <rect x="24" y="160" width="654" height="120" fill="#F4F0EA" stroke="#000000" stroke-width="2"/>
    <text x="44" y="196" font-family="monospace" font-size="16" fill="#000000">✓ Add offline fallback page</text>
    <text x="44" y="226" font-family="monospace" font-size="16" fill="#000000">✓ Tiered API / static caching</text>
    <text x="44" y="256" font-family="monospace" font-size="16" fill="#000000">✓ Share Target &amp; rich shortcut support</text>
    <rect x="24" y="300" width="100" height="34" fill="#B6FF3C" stroke="#000000" stroke-width="2"/>
    <text x="36" y="323" font-family="monospace" font-size="14" font-weight="800" fill="#000000">IN PROGRESS</text>
  </g>
</svg>`;

async function generate() {
  console.log("Generating PWA assets with sharp...");

  // 1. Standard PNG icons
  await sharp(Buffer.from(standardIconSvg(192))).png().toFile(path.join(publicDir, "icon-192.png"));
  console.log("✓ Generated icon-192.png");

  await sharp(Buffer.from(standardIconSvg(512))).png().toFile(path.join(publicDir, "icon-512.png"));
  console.log("✓ Generated icon-512.png");

  // 2. Maskable icons
  await sharp(Buffer.from(maskableIconSvg(192))).png().toFile(path.join(publicDir, "icon-maskable-192.png"));
  console.log("✓ Generated icon-maskable-192.png");

  await sharp(Buffer.from(maskableIconSvg(512))).png().toFile(path.join(publicDir, "icon-maskable-512.png"));
  console.log("✓ Generated icon-maskable-512.png");

  // 3. Apple Touch Icon & Favicons
  await sharp(Buffer.from(appleTouchIconSvg)).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("✓ Generated apple-touch-icon.png");

  await sharp(Buffer.from(standardIconSvg(32))).png().toFile(path.join(publicDir, "favicon-32x32.png"));
  console.log("✓ Generated favicon-32x32.png");

  await sharp(Buffer.from(standardIconSvg(16))).png().toFile(path.join(publicDir, "favicon-16x16.png"));
  console.log("✓ Generated favicon-16x16.png");

  // 4. PWA Manifest Screenshots
  await sharp(Buffer.from(wideScreenshotSvg)).png().toFile(path.join(publicDir, "screenshot-wide.png"));
  console.log("✓ Generated screenshot-wide.png");

  await sharp(Buffer.from(narrowScreenshotSvg)).png().toFile(path.join(publicDir, "screenshot-narrow.png"));
  console.log("✓ Generated screenshot-narrow.png");

  console.log("All PWA assets generated successfully!");
}

generate().catch((err) => {
  console.error("Asset generation failed:", err);
  process.exit(1);
});
