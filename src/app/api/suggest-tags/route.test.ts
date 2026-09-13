import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

// Mock session to simulate an authenticated user
vi.mock("@/lib/session", () => ({
  requireUserId: vi.fn().mockResolvedValue("test-user-id"),
  AuthError: class AuthError extends Error {},
}));

describe("POST /api/suggest-tags", () => {
  it("returns suggested tags and topics for input text", async () => {
    const req = new Request("http://localhost:3000/api/suggest-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Microservices with Docker and Kubernetes",
        content: "Deploying containerized clusters and service meshes on cloud infrastructure.",
        topK: 3,
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("topics");
    expect(data).toHaveProperty("tags");
    expect(Array.isArray(data.topics)).toBe(true);
    expect(Array.isArray(data.tags)).toBe(true);
    expect(data.tags.length).toBeGreaterThan(0);
    expect(data.tags).toContain("technology");
  });

  it("handles empty payload gracefully", async () => {
    const req = new Request("http://localhost:3000/api/suggest-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ topics: [], tags: [] });
  });
});
