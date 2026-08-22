import { afterEach, describe, expect, it } from "vitest";
import { atlasNdjsonResponse } from "./generate";

describe("atlasNdjsonResponse", () => {
  const rejections: unknown[] = [];
  const onReject = (reason: unknown) => {
    rejections.push(reason);
  };

  afterEach(() => {
    process.off("unhandledRejection", onReject);
    rejections.length = 0;
  });

  it("does not reject when the client hangs up mid-write", async () => {
    process.on("unhandledRejection", onReject);
    let finished = false;
    const res = atlasNdjsonResponse(async (write) => {
      write({ type: "done" });
      await new Promise((resolve) => setTimeout(resolve, 20));
      write({ type: "resources", stationId: "s1", resources: [] });
      write({ type: "done" });
      finished = true;
    });
    const reader = res.body?.getReader();
    expect(reader).toBeTruthy();
    await reader!.cancel();
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(finished).toBe(true);
    expect(rejections).toEqual([]);
  });
});
