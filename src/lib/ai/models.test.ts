import { describe, expect, it } from "vitest";
import { gatewayErrorMessage } from "./models";

describe("gatewayErrorMessage", () => {
  it("rewrites free-tier rate limits into an actionable line", () => {
    expect(
      gatewayErrorMessage(
        new Error(
          "Free tier requests on this model are rate-limited. Upgrade to paid credits"
        )
      )
    ).toContain("free-tier limit hit");
  });

  it("passes through other errors", () => {
    expect(gatewayErrorMessage(new Error("model not found"))).toBe("model not found");
  });
});
