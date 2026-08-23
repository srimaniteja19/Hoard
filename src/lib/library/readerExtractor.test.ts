import { describe, it, expect } from "vitest";
import { extractArticleText, formatQuoteMarkdown, resolveImageUrl } from "./readerExtractor";

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
          <figure>
            <img src="/images/diagram.png" alt="Vector Cluster Diagram" />
            <figcaption>Figure 1: High dimensional vector space</figcaption>
          </figure>
          <p>They use approximate nearest neighbor (ANN) indexing like HNSW.</p>
          <pre><code>const sim = dotProduct(v1, v2);</code></pre>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;

    const result = extractArticleText(rawHtml, "Fallback Title", "https://blog.example.com/posts/vectors");
    expect(result.title).toBe("Understanding Vector Embeddings");
    expect(result.byline).toBe("Alice Cooper");
    expect(result.content).toContain("Vector databases store high-dimensional arrays");
    expect(result.content).toContain("const sim = dotProduct(v1, v2);");
    expect(result.content).toContain("![Figure 1: High dimensional vector space](https://blog.example.com/images/diagram.png)");
    expect(result.content).not.toContain("console.log");
    expect(result.content).not.toContain("display: block");
    expect(result.content).not.toContain("Copyright 2026");
    expect(result.wordCount).toBeGreaterThan(10);
  });

  it("resolves relative and absolute image URLs and filters beacons", () => {
    expect(resolveImageUrl("https://cdn.example.com/photo.jpg")).toBe("https://cdn.example.com/photo.jpg");
    expect(resolveImageUrl("/assets/chart.png", "https://example.com/article")).toBe("https://example.com/assets/chart.png");
    expect(resolveImageUrl("https://pixel.tracking.com/1x1.gif")).toBeNull();
  });

  it("handles empty or malformed HTML gracefully", () => {
    const result = extractArticleText("", "Backup");
    expect(result.title).toBe("Backup");
    expect(result.wordCount).toBe(0);
  });

  it("captures interactive demo figures and SVG diagrams", () => {
    const rawHtml = `
      <article class="article-body">
        <p>Over the course of this article, we'll unravel the mysteries of elevators.</p>
        <figure class="article-demo article-demo-headline">
          <canvas width="400" height="200"></canvas>
          <figcaption>Figure: Live Elevator Dispatcher</figcaption>
        </figure>
        <h2>One Car</h2>
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>
      </article>
    `;

    const result = extractArticleText(rawHtml, "Elevators", "https://john.fun/elevators");
    expect(result.content).toContain("![Interactive Demo: Figure: Live Elevator Dispatcher](https://john.fun/elevators)");
    expect(result.content).toContain("data:image/svg+xml");
  });
});
