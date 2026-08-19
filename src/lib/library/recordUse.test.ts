import { describe, expect, it, vi } from "vitest";

const { updateMock, setMock, whereMock } = vi.hoisted(() => {
  const whereMock = vi.fn(async () => []);
  const setMock = vi.fn<(values: { useCount: unknown; lastUsedAt: unknown }) => { where: typeof whereMock }>(
    () => ({ where: whereMock })
  );
  const updateMock = vi.fn(() => ({ set: setMock }));
  return { updateMock, setMock, whereMock };
});

vi.mock("@/db", () => ({
  db: { update: updateMock },
}));

import { recordUse } from "./recordUse";

describe("recordUse", () => {
  it("issues a single UPDATE that bumps useCount and sets lastUsedAt", async () => {
    await recordUse(42, "user-1");

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledTimes(1);

    const setArg = setMock.mock.calls[0][0];
    expect(setArg).toHaveProperty("useCount");
    expect(setArg.lastUsedAt).toBeInstanceOf(Date);

    expect(whereMock).toHaveBeenCalledTimes(1);
  });
});
