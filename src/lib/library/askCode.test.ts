import { describe, expect, it } from "vitest";
import { formatLanguageLabel, highlightCode } from "./askCode";

describe("highlightCode", () => {
  it("highlights SQL keywords, builtins, strings, and comments", () => {
    const sql = `-- calculate LTV
WITH arpu_and_churn AS (
  SELECT SUM(mrr) / COUNT(DISTINCT user_id) AS arpu,
         CAST(SUM(CASE WHEN status = 'churned' THEN 1 ELSE 0 END) AS FLOAT) AS churn
  FROM subscriptions
)
SELECT arpu, churn FROM arpu_and_churn;`;

    const html = highlightCode(sql, "sql");
    expect(html).toContain('<span class="hl-cm">-- calculate LTV</span>');
    expect(html).toContain('<span class="hl-kw">SELECT</span>');
    expect(html).toContain('<span class="hl-kw">WITH</span>');
    expect(html).toContain('<span class="hl-kw">AS</span>');
    expect(html).toContain('<span class="hl-fn">SUM</span>');
    expect(html).toContain('<span class="hl-fn">COUNT</span>');
    expect(html).toContain('<span class="hl-fn">CAST</span>');
    expect(html).toContain('<span class="hl-st">\'churned\'</span>');
    expect(html).toContain('<span class="hl-nu">1</span>');
  });

  it("highlights TypeScript / JavaScript keywords and functions", () => {
    const js = `// User service
const fetchUser = async (id: string) => {
  const res = await fetch("/api/users/" + id);
  return res.json();
};`;

    const html = highlightCode(js, "ts");
    expect(html).toContain('<span class="hl-cm">// User service</span>');
    expect(html).toContain('<span class="hl-kw">const</span>');
    expect(html).toContain('<span class="hl-kw">async</span>');
    expect(html).toContain('<span class="hl-kw">await</span>');
    expect(html).toContain('<span class="hl-kw">return</span>');
    expect(html).toContain('<span class="hl-fn">fetch</span>');
    expect(html).toContain('<span class="hl-op">=&gt;</span>');
  });

  it("escapes raw HTML tags safely", () => {
    const dangerous = `<script>alert("xss")</script>`;
    const html = highlightCode(dangerous, "html");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;");
    expect(html).toContain("&gt;");
  });
});

describe("formatLanguageLabel", () => {
  it("formats common languages nicely", () => {
    expect(formatLanguageLabel("ts")).toBe("TYPESCRIPT");
    expect(formatLanguageLabel("js")).toBe("JAVASCRIPT");
    expect(formatLanguageLabel("py")).toBe("PYTHON");
    expect(formatLanguageLabel("sql")).toBe("SQL");
    expect(formatLanguageLabel("sh")).toBe("SHELL");
    expect(formatLanguageLabel("")).toBe("CODE");
  });
});
