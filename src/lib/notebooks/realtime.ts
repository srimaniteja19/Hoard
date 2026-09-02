/**
 * Real-time Cross-Tab & Offline Synchronization Engine for Notebooks (Notion-Style)
 */

import { Block } from "./blocks";
import { SeedCourse, SeedCourseLesson } from "./seedData";

export type SyncStatus = "saved" | "saving" | "offline" | "error";

export type RealtimeNotebookEvent =
  | {
      type: "NOTE_BLOCKS_UPDATED";
      lessonId: string;
      blocks: Block[];
      wordCount: number;
      senderId: string;
      timestamp: number;
    }
  | {
      type: "COURSE_UPDATED";
      courseId: string;
      course: SeedCourse;
      senderId: string;
      timestamp: number;
    }
  | {
      type: "COURSE_DELETED";
      courseId: string;
      senderId: string;
      timestamp: number;
    }
  | {
      type: "LESSON_CREATED";
      moduleId: string;
      lesson: SeedCourseLesson;
      senderId: string;
      timestamp: number;
    }
  | {
      type: "LESSON_DELETED";
      lessonId: string;
      senderId: string;
      timestamp: number;
    }
  | {
      type: "LESSON_WATCHED_TOGGLED";
      lessonId: string;
      watched: boolean;
      senderId: string;
      timestamp: number;
    }
  | {
      type: "LESSON_GAP_ADDED";
      lessonId: string;
      gap: { timestamp: string; topic: string }[];
      senderId: string;
      timestamp: number;
    }
  | {
      type: "LESSONS_REORDERED";
      courseId: string;
      sourceModuleId: string;
      targetModuleId: string;
      lessonId: string;
      targetIndex: number;
      senderId: string;
      timestamp: number;
    }
  | {
      type: "MODULE_CREATED";
      courseId: string;
      module: { id: string; title: string; lessons: any[] };
      senderId: string;
      timestamp: number;
    }
  | {
      type: "MODULE_UPDATED";
      moduleId: string;
      title?: string;
      senderId: string;
      timestamp: number;
    }
  | {
      type: "MODULE_DELETED";
      moduleId: string;
      senderId: string;
      timestamp: number;
    }
  | {
      type: "FULL_SYNC_REQUESTED";
      senderId: string;
      timestamp: number;
    };

// Unique instance ID for the current tab to filter self-echoes
export const TAB_INSTANCE_ID =
  typeof window !== "undefined"
    ? `tab_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`
    : "server";

const CHANNEL_NAME = "hoard_notebooks_realtime_sync";

let broadcastChannel: BroadcastChannel | null = null;
const eventListeners = new Set<(event: RealtimeNotebookEvent) => void>();
const statusListeners = new Set<(status: SyncStatus, lastSavedAt: Date | null) => void>();

let currentStatus: SyncStatus = "saved";
let lastSavedTimestamp: Date | null = null;

const seenEventTimestamps = new Set<string>();

function shouldProcessEvent(event: RealtimeNotebookEvent): boolean {
  if (!event || event.senderId === TAB_INSTANCE_ID) return false;
  const key = `${event.senderId}_${event.timestamp}_${event.type}`;
  if (seenEventTimestamps.has(key)) return false;
  seenEventTimestamps.add(key);
  if (seenEventTimestamps.size > 200) {
    const first = seenEventTimestamps.values().next().value;
    if (first) seenEventTimestamps.delete(first);
  }
  return true;
}

// Initialize BroadcastChannel if in browser
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!broadcastChannel && "BroadcastChannel" in window) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = (msg: MessageEvent<RealtimeNotebookEvent>) => {
        if (msg.data && shouldProcessEvent(msg.data)) {
          notifyEventListeners(msg.data);
        }
      };
    } catch {
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

function notifyEventListeners(event: RealtimeNotebookEvent) {
  eventListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error("[Realtime] Error in event listener:", err);
    }
  });
}

function notifyStatusListeners(status: SyncStatus, savedAt: Date | null) {
  statusListeners.forEach((listener) => {
    try {
      listener(status, savedAt);
    } catch (err) {
      console.error("[Realtime] Error in status listener:", err);
    }
  });
}

/**
 * Updates the global sync status (e.g. "saving", "saved", "offline", "error")
 */
export function setSyncStatus(status: SyncStatus) {
  currentStatus = status;
  if (status === "saved") {
    lastSavedTimestamp = new Date();
  }
  notifyStatusListeners(currentStatus, lastSavedTimestamp);
}

/**
 * Gets the current sync status
 */
export function getSyncStatus(): { status: SyncStatus; lastSavedAt: Date | null } {
  return { status: currentStatus, lastSavedAt: lastSavedTimestamp };
}

/**
 * Subscribes to sync status changes
 */
export function subscribeSyncStatus(
  callback: (status: SyncStatus, lastSavedAt: Date | null) => void
): () => void {
  statusListeners.add(callback);
  callback(currentStatus, lastSavedTimestamp);
  return () => {
    statusListeners.delete(callback);
  };
}

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type BroadcastNotebookPayload = DistributiveOmit<RealtimeNotebookEvent, "senderId" | "timestamp">;

/**
 * Broadcasts an event to all other open tabs
 */
export function broadcastRealtimeEvent(
  event: BroadcastNotebookPayload
) {
  const fullEvent = {
    ...event,
    senderId: TAB_INSTANCE_ID,
    timestamp: Date.now(),
  } as RealtimeNotebookEvent;

  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(fullEvent);
    } catch (err) {
      console.warn("[Realtime] Failed to post message to BroadcastChannel:", err);
    }
  }

  // Fallback to localStorage event for older browsers or if BroadcastChannel is unavailable
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("hoard_notebook_rt_event", JSON.stringify(fullEvent));
    } catch {
      // ignore
    }
  }
}

/**
 * Subscribes to real-time events from other tabs
 */
export function subscribeToRealtimeEvents(
  callback: (event: RealtimeNotebookEvent) => void
): () => void {
  getBroadcastChannel(); // Ensure channel is initialized
  eventListeners.add(callback);

  // Also listen for storage event fallback
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "hoard_notebook_rt_event" && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as RealtimeNotebookEvent;
        if (parsed && shouldProcessEvent(parsed)) {
          callback(parsed);
        }
      } catch {
        // ignore
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    eventListeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

// ── Offline Save Queue & Background Replay ──────────────────────────────

interface PendingSaveItem {
  id: string;
  lessonId: string;
  blocks: Block[];
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = "hoard_notebook_offline_queue";

export function getOfflineQueue(): PendingSaveItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineSave(lessonId: string, blocks: Block[]) {
  if (typeof window === "undefined") return;
  const queue = getOfflineQueue();
  const existingIdx = queue.findIndex((item) => item.lessonId === lessonId);
  const newItem: PendingSaveItem = {
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lessonId,
    blocks,
    timestamp: Date.now(),
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = newItem;
  } else {
    queue.push(newItem);
  }

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function clearOfflineItem(lessonId: string) {
  if (typeof window === "undefined") return;
  const queue = getOfflineQueue().filter((item) => item.lessonId !== lessonId);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}
