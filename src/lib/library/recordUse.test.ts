import { describe, expect, it, vi } from "vitest";

const { updateMock, setMock, whereMock, returningMock, insertMock, valuesMock } = vi.hoisted(() => {
  const returningMock = vi.fn(async () => [{ id: 42 }]);
  const whereMock = vi.fn(() => ({ returning: returningMock }));
  const setMock = vi.fn<(values: { useCount: unknown; lastUsedAt: unknown }) => { where: typeof whereMock }>(
    () => ({ where: whereMock })
  );
  const updateMock = vi.fn(() => ({ set: setMock }));
  const valuesMock = vi.fn(async () => []);
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  return { updateMock, setMock, whereMock, returningMock, insertMock, valuesMock };
});

vi.mock("@/db", () => ({
  db: { update: updateMock, insert: insertMock },
}));

import { recordUse } from "./recordUse";

describe("recordUse", () => {
  it("bumps useCount and writes a reach event when the debounce allows it", async () => {
    await recordUse(42, "user-1");

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledTimes(1);

    const setArg = setMock.mock.calls[0][0];
    expect(setArg).toHaveProperty("useCount");
    expect(setArg.lastUsedAt).toBeInstanceOf(Date);

    expect(whereMock).toHaveBeenCalledTimes(1);
    expect(returningMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", bookmarkId: 42 }),
    );
  });
});
