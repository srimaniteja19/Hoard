export interface HtmlTemplate {
  id: string;
  title: string;
  description: string;
  category: "operations" | "calculator" | "status" | "kanban";
  html: string;
}

export const PRESET_HTML_TEMPLATES: HtmlTemplate[] = [
  {
    id: "escalation-matrix",
    title: "Escalation Flow & Queue Management",
    description: "Interactive 3-tier queue with priority filtering, SLA timers, and on-call assignments.",
    category: "operations",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escalation Flow & Queue Management</title>
  <style>
    :root {
      --paper: #F7F5EE;
      --card-bg: #FFFFFF;
      --ink: #0A0A0A;
      --p1: #FF2D8A;
      --p2: #FF9E2C;
      --p3: #3B82F6;
      --green: #10B981;
      --border: 2px solid #0A0A0A;
      --shadow: 3px 3px 0 #0A0A0A;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      padding: 24px;
      line-height: 1.5;
    }
    header {
      border-bottom: var(--border);
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .filters {
      display: flex;
      gap: 8px;
    }
    .filter-btn {
      background: #FFF;
      border: var(--border);
      box-shadow: var(--shadow);
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.1s;
    }
    .filter-btn.active {
      background: var(--ink);
      color: #FFF;
    }
    .filter-btn:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0 #0A0A0A;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .card {
      background: var(--card-bg);
      border: var(--border);
      box-shadow: var(--shadow);
      padding: 16px;
      border-radius: 4px;
      transition: transform 0.1s;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .badge {
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border: 1.5px solid var(--ink);
      border-radius: 2px;
    }
    .badge.p1 { background: var(--p1); color: #FFF; }
    .badge.p2 { background: var(--p2); color: #FFF; }
    .badge.p3 { background: var(--p3); color: #FFF; }
    .time { font-size: 11px; opacity: 0.6; font-family: monospace; }
    .title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
    .owner { font-size: 12px; opacity: 0.8; display: flex; align-items: center; gap: 6px; }
    .owner span { font-weight: 700; }
    .actions { margin-top: 12px; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.15); display: flex; justify-content: space-between; }
    .btn-resolve {
      background: var(--green);
      color: #FFF;
      border: 1.5px solid var(--ink);
      font-size: 10px;
      font-weight: 800;
      padding: 4px 8px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Escalation Queue & On-Call Triage</h1>
      <p style="font-size: 11px; opacity: 0.6; margin-top: 2px;">LIVE INCIDENT MANAGEMENT DASHBOARD</p>
    </div>
    <div class="filters">
      <button class="filter-btn active" onclick="filterQueue('all', this)">ALL (3)</button>
      <button class="filter-btn" onclick="filterQueue('p1', this)">P1 CRITICAL (1)</button>
      <button class="filter-btn" onclick="filterQueue('p2', this)">P2 HIGH (1)</button>
      <button class="filter-btn" onclick="filterQueue('p3', this)">P3 NORMAL (1)</button>
    </div>
  </header>

  <div class="grid" id="queueGrid">
    <div class="card" data-priority="p1">
      <div class="card-head">
        <span class="badge p1">P1 · CRITICAL</span>
        <span class="time">⏱ 14m SLA remaining</span>
      </div>
      <div class="title">Payment Gateway Webhook Timeout > 5% Failure Rate</div>
      <div class="owner">Lead: <span>@alex.k (Tier 3 On-Call)</span></div>
      <div class="actions">
        <span style="font-size: 10px; font-weight: 700; color: var(--p1);">STATUS: TRIAGING</span>
        <button class="btn-resolve" onclick="resolveTicket(this)">ACKNOWLEDGE</button>
      </div>
    </div>

    <div class="card" data-priority="p2">
      <div class="card-head">
        <span class="badge p2">P2 · HIGH</span>
        <span class="time">⏱ 45m SLA remaining</span>
      </div>
      <div class="title">Sync Worker Memory Threshold Spike on Region EU-Central</div>
      <div class="owner">Lead: <span>@sarah.m (Platform)</span></div>
      <div class="actions">
        <span style="font-size: 10px; font-weight: 700; color: var(--p2);">STATUS: INVESTIGATING</span>
        <button class="btn-resolve" onclick="resolveTicket(this)">ACKNOWLEDGE</button>
      </div>
    </div>

    <div class="card" data-priority="p3">
      <div class="card-head">
        <span class="badge p3">P3 · NORMAL</span>
        <span class="time">⏱ 3h SLA remaining</span>
      </div>
      <div class="title">Customer Batch Export Rate-Limit Inconsistency</div>
      <div class="owner">Lead: <span>@dave.t (Core API)</span></div>
      <div class="actions">
        <span style="font-size: 10px; font-weight: 700; color: var(--p3);">STATUS: QUEUED</span>
        <button class="btn-resolve" onclick="resolveTicket(this)">ACKNOWLEDGE</button>
      </div>
    </div>
  </div>

  <script>
    console.log("Escalation queue loaded. 3 active incidents monitored.");

    function filterQueue(priority, btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {
        if (priority === 'all' || card.dataset.priority === priority) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
      console.log("Filtered queue view to: " + priority);
    }

    function resolveTicket(btn) {
      const card = btn.closest('.card');
      btn.innerText = "✓ ACKNOWLEDGED";
      btn.style.background = "#0A0A0A";
      btn.disabled = true;
      console.log("Incident acknowledged by responder.");
    }
  </script>
</body>
</html>`,
  },
  {
    id: "roi-calculator",
    title: "Interactive Unit Economics & ROI Calculator",
    description: "Dynamic sliders for CAC, LTV, and conversion rate with live computed payback metrics.",
    category: "calculator",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SaaS Unit Economics Calculator</title>
  <style>
    :root {
      --bg: #0F172A;
      --card: #1E293B;
      --text: #F8FAFC;
      --accent: #38BDF8;
      --success: #4ADE80;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
    }
    .wrapper {
      max-width: 640px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    h2 { font-size: 18px; margin-bottom: 4px; color: var(--accent); }
    p.sub { font-size: 12px; opacity: 0.7; margin-bottom: 24px; }
    .control-group { margin-bottom: 18px; }
    .label-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    input[type=range] {
      width: 100%;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .results {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .stat-card {
      background: rgba(0,0,0,0.25);
      border-radius: 8px;
      padding: 16px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .stat-val { font-size: 24px; font-weight: 800; color: var(--success); }
    .stat-label { font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <h2>SaaS Unit Economics & Payback</h2>
    <p class="sub">Tweak customer acquisition cost and monthly revenue to simulate returns.</p>

    <div class="control-group">
      <div class="label-row">
        <span>CAC (Customer Acquisition Cost)</span>
        <span id="cacDisplay">$450</span>
      </div>
      <input type="range" id="cac" min="50" max="2000" step="25" value="450" oninput="calculate()">
    </div>

    <div class="control-group">
      <div class="label-row">
        <span>ARPU (Monthly Rev per User)</span>
        <span id="arpuDisplay">$75 / mo</span>
      </div>
      <input type="range" id="arpu" min="10" max="500" step="5" value="75" oninput="calculate()">
    </div>

    <div class="control-group">
      <div class="label-row">
        <span>Gross Margin (%)</span>
        <span id="marginDisplay">80%</span>
      </div>
      <input type="range" id="margin" min="40" max="95" step="1" value="80" oninput="calculate()">
    </div>

    <div class="results">
      <div class="stat-card">
        <div class="stat-val" id="paybackMonths">7.5 mo</div>
        <div class="stat-label">Payback Period</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" id="ltvEst">$2,250</div>
        <div class="stat-label">Estimated 3Y LTV</div>
      </div>
    </div>
  </div>

  <script>
    function calculate() {
      const cac = parseFloat(document.getElementById('cac').value);
      const arpu = parseFloat(document.getElementById('arpu').value);
      const margin = parseFloat(document.getElementById('margin').value) / 100;

      document.getElementById('cacDisplay').innerText = '$' + cac.toLocaleString();
      document.getElementById('arpuDisplay').innerText = '$' + arpu.toLocaleString() + ' / mo';
      document.getElementById('marginDisplay').innerText = Math.round(margin * 100) + '%';

      const monthlyGross = arpu * margin;
      const payback = (cac / monthlyGross).toFixed(1);
      const ltv = Math.round(monthlyGross * 36);

      document.getElementById('paybackMonths').innerText = payback + ' mo';
      document.getElementById('ltvEst').innerText = '$' + ltv.toLocaleString();

      console.log('Recalculated: CAC=' + cac + ', Payback=' + payback + 'mo');
    }
    calculate();
  </script>
</body>
</html>`,
  },
  {
    id: "system-status",
    title: "System Health & API Latency Monitor",
    description: "Operational status dashboard with simulated pings, live uptime indicators, and region statuses.",
    category: "status",
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Health Dashboard</title>
  <style>
    :root {
      --bg: #0C0D10;
      --card: #15181F;
      --border: #222735;
      --green: #22C55E;
      --yellow: #F59E0B;
      --text: #E2E8F0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 24px;
    }
    .banner {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 12px 16px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 10px var(--green);
    }
    .services {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .service-row {
      background: var(--card);
      border: 1px solid var(--border);
      padding: 14px 18px;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .service-name { font-weight: 700; color: #FFF; }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--green);
      background: rgba(34, 197, 94, 0.15);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .latency { font-size: 11px; opacity: 0.6; }
  </style>
</head>
<body>
  <div class="banner">
    <div class="pulse"></div>
    <b>ALL SYSTEMS OPERATIONAL</b> · 99.98% 30-Day Uptime
  </div>

  <div class="services">
    <div class="service-row">
      <div>
        <div class="service-name">Global API Gateway (Edge)</div>
        <div class="latency">P99: 28ms · 0.001% 5xx</div>
      </div>
      <div class="status-badge">● OPERATIONAL</div>
    </div>

    <div class="service-row">
      <div>
        <div class="service-name">Postgres Primary Cluster (us-east-1)</div>
        <div class="latency">Conn Pool: 18% · IOPS: 420/10k</div>
      </div>
      <div class="status-badge">● OPERATIONAL</div>
    </div>

    <div class="service-row">
      <div>
        <div class="service-name">Background Task Workers (Redis / BullMQ)</div>
        <div class="latency">Queue: 4 active · 0 delayed</div>
      </div>
      <div class="status-badge">● OPERATIONAL</div>
    </div>
  </div>

  <script>
    console.log("Health check verified: all clusters reporting green.");
  </script>
</body>
</html>`,
  },
];

/**
 * Applies a built-in art-direction style preset to raw HTML by modifying or injecting CSS.
 */
export function applyStylePreset(
  rawHtml: string,
  preset: "neubrutalist" | "cyberpunk" | "swiss" | "tailwind"
): string {
  let doc = rawHtml;

  if (preset === "tailwind") {
    // Injects Tailwind play CDN in <head> if not already present
    if (!doc.includes("cdn.tailwindcss.com")) {
      const tailwindScript = `<script src="https://cdn.tailwindcss.com"></script>\n`;
      if (/<head>/i.test(doc)) {
        return doc.replace(/<head>/i, `<head>\n  ${tailwindScript}`);
      }
      return `${tailwindScript}${doc}`;
    }
    return doc;
  }

  const neubrutalistCss = `
  /* ── HOARD NEUBRUTALIST THEME ── */
  :root {
    --paper: #EEF0E6 !important;
    --ink: #0A0A0A !important;
    --accent-lime: #B8F04A !important;
    --accent-pink: #FF2D8A !important;
    --accent-yellow: #FCE94F !important;
  }
  body {
    background: #EEF0E6 !important;
    color: #0A0A0A !important;
    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif !important;
  }
  div, section, article, table, button, input {
    border-color: #0A0A0A !important;
  }
  .card, .box, [class*="card"], [class*="box"], [class*="container"] {
    border: 2.5px solid #0A0A0A !important;
    box-shadow: 4px 4px 0 #0A0A0A !important;
    border-radius: 0px !important;
  }
  button {
    border: 2px solid #0A0A0A !important;
    box-shadow: 3px 3px 0 #0A0A0A !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
  }
`;

  const cyberpunkCss = `
  /* ── CYBERPUNK TERMINAL THEME ── */
  :root {
    --bg: #0A0E14 !important;
    --terminal-green: #00FF66 !important;
    --terminal-cyan: #00F0FF !important;
  }
  body {
    background: #0A0E14 !important;
    color: #00FF66 !important;
    font-family: 'Courier New', Courier, monospace !important;
    text-shadow: 0 0 4px rgba(0, 255, 102, 0.4) !important;
  }
  .card, div, section, table {
    background: rgba(10, 14, 20, 0.9) !important;
    border: 1px solid #00FF66 !important;
    box-shadow: 0 0 10px rgba(0, 255, 102, 0.2) !important;
    color: #00FF66 !important;
  }
  button {
    background: transparent !important;
    border: 1px solid #00F0FF !important;
    color: #00F0FF !important;
    text-shadow: 0 0 6px #00F0FF !important;
  }
`;

  const swissCss = `
  /* ── SWISS EDITORIAL THEME ── */
  :root {
    --bg: #FFFFFF !important;
    --text: #111111 !important;
  }
  body {
    background: #FFFFFF !important;
    color: #111111 !important;
    font-family: 'Newsreader', 'Georgia', serif !important;
    line-height: 1.6 !important;
  }
  h1, h2, h3 {
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif !important;
    font-weight: 900 !important;
    letter-spacing: -0.04em !important;
  }
  .card, div, section {
    border: 1px solid #E5E7EB !important;
    box-shadow: none !important;
    border-radius: 0px !important;
  }
  button {
    background: #111 !important;
    color: #FFF !important;
    border: none !important;
    border-radius: 0px !important;
  }
`;

  const chosenCss =
    preset === "neubrutalist"
      ? neubrutalistCss
      : preset === "cyberpunk"
      ? cyberpunkCss
      : swissCss;

  // If document has <style>, append; otherwise add <style> in <head>
  if (/<style[^>]*>/i.test(doc)) {
    return doc.replace(/<\/style>/i, `${chosenCss}\n</style>`);
  }
  if (/<head>/i.test(doc)) {
    return doc.replace(/<head>/i, `<head>\n  <style>${chosenCss}</style>`);
  }
  return `<style>${chosenCss}</style>\n${doc}`;
}

export interface CssVariableToken {
  name: string;
  value: string;
  type: "color" | "dimension" | "text";
}

/**
 * Scans HTML and extracts all `:root` CSS custom properties declared in `<style>` blocks.
 */
export function extractCssVariables(html: string): CssVariableToken[] {
  const vars: CssVariableToken[] = [];
  const rootMatches = html.match(/:root\s*\{([^}]+)\}/gi);
  if (!rootMatches) return vars;

  const seen = new Set<string>();

  for (const rootBlock of rootMatches) {
    const decls = rootBlock.match(/--[a-zA-Z0-9_-]+\s*:\s*[^;]+;/g);
    if (decls) {
      for (const decl of decls) {
        const parts = decl.split(":");
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const value = parts.slice(1).join(":").replace(";", "").trim();

          if (!seen.has(name)) {
            seen.add(name);
            let type: "color" | "dimension" | "text" = "text";
            if (/^#([0-9a-f]{3,8})$/i.test(value) || /^rgb/i.test(value) || /^hsl/i.test(value)) {
              type = "color";
            } else if (/^\d+(\.\d+)?(px|rem|em|%|vh|vw)?$/i.test(value)) {
              type = "dimension";
            }

            vars.push({ name, value, type });
          }
        }
      }
    }
  }

  return vars;
}

/**
 * Updates a CSS variable's value inside `:root { ... }` blocks in an HTML string.
 */
export function updateCssVariable(html: string, varName: string, newValue: string): string {
  const regex = new RegExp(`(${varName}\\s*:\\s*)([^;]+)(;)`, "g");
  return html.replace(regex, `$1${newValue}$3`);
}
