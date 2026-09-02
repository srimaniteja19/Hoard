import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setSyncStatus,
  getSyncStatus,
  subscribeSyncStatus,
  broadcastRealtimeEvent,
  subscribeToRealtimeEvents,
  queueOfflineSave,
  getOfflineQueue,
  clearOfflineItem,
  TAB_INSTANCE_ID,
} from "./realtime";

class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// @ts-ignore
global.localStorage = new LocalStorageMock();
// @ts-ignore
global.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe("Notebooks Realtime Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    setSyncStatus("saved");
  });

  it("manages sync status and notifies subscribers", () => {
    const statuses: string[] = [];
    const unsubscribe = subscribeSyncStatus((status) => {
      statuses.push(status);
    });

    setSyncStatus("saving");
    setSyncStatus("saved");
    setSyncStatus("offline");

    expect(statuses).toContain("saving");
    expect(statuses).toContain("saved");
    expect(statuses).toContain("offline");

    const current = getSyncStatus();
    expect(current.status).toBe("offline");

    unsubscribe();
  });

  it("manages offline queue persistence", () => {
    expect(getOfflineQueue()).toEqual([]);

    queueOfflineSave("les-1", [{ id: "b1", type: "paragraph", text: "Offline note" }]);
    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].lessonId).toBe("les-1");
    expect((queue[0].blocks[0] as any).text).toBe("Offline note");

    // Queuing same lesson updates in-place
    queueOfflineSave("les-1", [{ id: "b1", type: "paragraph", text: "Updated offline note" }]);
    const queueUpdated = getOfflineQueue();
    expect(queueUpdated.length).toBe(1);
    expect((queueUpdated[0].blocks[0] as any).text).toBe("Updated offline note");

    // Clearing item
    clearOfflineItem("les-1");
    expect(getOfflineQueue()).toEqual([]);
  });

  it("broadcasts events with correct tab sender ID metadata", () => {
    const events: any[] = [];
    const unsubscribe = subscribeToRealtimeEvents((e) => {
      events.push(e);
    });

    broadcastRealtimeEvent({
      type: "LESSON_WATCHED_TOGGLED",
      lessonId: "les-test",
      watched: true,
    });

    // Check localStorage fallback was set
    const rawStored = localStorage.getItem("hoard_notebook_rt_event");
    expect(rawStored).toBeTruthy();
    const parsed = JSON.parse(rawStored!);
    expect(parsed.type).toBe("LESSON_WATCHED_TOGGLED");
    expect(parsed.lessonId).toBe("les-test");
    expect(parsed.watched).toBe(true);
    expect(parsed.senderId).toBe(TAB_INSTANCE_ID);
    expect(typeof parsed.timestamp).toBe("number");

    unsubscribe();
  });
});
