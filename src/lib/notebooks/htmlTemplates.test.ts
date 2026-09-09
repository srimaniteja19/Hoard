import { describe, it, expect } from "vitest";
import {
  extractCssVariables,
  updateCssVariable,
  applyStylePreset,
  PRESET_HTML_TEMPLATES,
} from "./htmlTemplates";

describe("htmlTemplates & CSS Variable Engine", () => {
  const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --paper: #EEF0E6;
      --accent: #FF2D8A;
      --card-radius: 8px;
      --header-font: sans-serif;
    }
    body { background: var(--paper); }
  </style>
</head>
<body>
  <div>Test Content</div>
</body>
</html>`;

  it("extracts all :root CSS custom properties with their types", () => {
    const vars = extractCssVariables(sampleHtml);
    expect(vars.length).toBe(4);

    const paperVar = vars.find((v) => v.name === "--paper");
    expect(paperVar).toBeDefined();
    expect(paperVar?.value).toBe("#EEF0E6");
    expect(paperVar?.type).toBe("color");

    const radiusVar = vars.find((v) => v.name === "--card-radius");
    expect(radiusVar).toBeDefined();
    expect(radiusVar?.value).toBe("8px");
    expect(radiusVar?.type).toBe("dimension");

    const fontVar = vars.find((v) => v.name === "--header-font");
    expect(fontVar).toBeDefined();
    expect(fontVar?.value).toBe("sans-serif");
    expect(fontVar?.type).toBe("text");
  });

  it("updates CSS variables accurately in :root blocks", () => {
    const updated = updateCssVariable(sampleHtml, "--paper", "#00FF66");
    expect(updated).toContain("--paper: #00FF66;");
    expect(updated).not.toContain("--paper: #EEF0E6;");

    // Other variables remain intact
    expect(updated).toContain("--accent: #FF2D8A;");
  });

  it("applies Neubrutalist, Cyberpunk, and Swiss style presets", () => {
    const brut = applyStylePreset(sampleHtml, "neubrutalist");
    expect(brut).toContain("HOARD NEUBRUTALIST THEME");
    expect(brut).toContain("--accent-lime: #B8F04A");

    const cyber = applyStylePreset(sampleHtml, "cyberpunk");
    expect(cyber).toContain("CYBERPUNK TERMINAL THEME");
    expect(cyber).toContain("--terminal-green: #00FF66");

    const swiss = applyStylePreset(sampleHtml, "swiss");
    expect(swiss).toContain("SWISS EDITORIAL THEME");

    const tailwind = applyStylePreset(sampleHtml, "tailwind");
    expect(tailwind).toContain("cdn.tailwindcss.com");
  });

  it("provides ready-to-use production widget templates", () => {
    expect(PRESET_HTML_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    const escalationTmpl = PRESET_HTML_TEMPLATES.find((t) => t.id === "escalation-matrix");
    expect(escalationTmpl).toBeDefined();
    expect(escalationTmpl?.html).toContain("Escalation Queue & On-Call Triage");
    expect(escalationTmpl?.html).toContain("console.log");

    const roiTmpl = PRESET_HTML_TEMPLATES.find((t) => t.id === "roi-calculator");
    expect(roiTmpl).toBeDefined();
    expect(roiTmpl?.html).toContain("SaaS Unit Economics");
  });
});
