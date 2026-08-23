import { describe, it, expect } from "vitest";
import { extractArticleText, formatQuoteMarkdown } from "./readerExtractor";

describe("readerExtractor", () => {
  it("extracts title, paragraphs, and cleans noise from HTML", () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Understanding Vector Embeddings | Engineering Blog</title>
          <meta name="author" content="Alice Cooper">
          <style>.ad { display: block; }</style>
          <script>console.log("tracking");</script>
        </head>
        <body>
          <nav>Home | About | Contact</nav>
          <h1>Understanding Vector Embeddings</h1>
          <p>Vector databases store high-dimensional arrays for semantic search.</p>
          <p>They use approximate nearest neighbor (ANN) indexing like HNSW.</p>
          <pre><code>const sim = dotProduct(v1, v2);</code></pre>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;

    const result = extractArticleText(rawHtml, "Fallback Title");
    expect(result.title).toBe("Understanding Vector Embeddings");
    expect(result.byline).toBe("Alice Cooper");
    expect(result.content).toContain("Vector databases store high-dimensional arrays");
    expect(result.content).toContain("const sim = dotProduct(v1, v2);");
    expect(result.content).not.toContain("console.log");
    expect(result.content).not.toContain("display: block");
    expect(result.content).not.toContain("Copyright 2026");
    expect(result.wordCount).toBeGreaterThan(10);
  });

  it("handles empty or malformed HTML gracefully", () => {
    const result = extractArticleText("", "Backup");
    expect(result.title).toBe("Backup");
    expect(result.wordCount).toBe(0);
  });

  it("formats quote markdown with attribution and link", () => {
    const quote = "Vector embeddings are points in high dimensional latent space.";
    const formatted = formatQuoteMarkdown(
      quote,
      "Vector Search Deep Dive",
      "eng.anthropic.com",
      "https://eng.anthropic.com/vectors"
    );

    expect(formatted).toBe(
      `> "Vector embeddings are points in high dimensional latent space."\n\n — eng.anthropic.com (https://eng.anthropic.com/vectors)`
    );
  });
});
