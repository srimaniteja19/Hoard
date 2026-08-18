"use client";

import { useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";

export type ChromeSlotName = "leading" | "trailing" | "toolbar" | "footer";

type ChromeSlots = Record<ChromeSlotName, ReactNode | null>;

const EMPTY_SLOTS: ChromeSlots = {
  leading: null,
  trailing: null,
  toolbar: null,
  footer: null,
};

let slots: ChromeSlots = EMPTY_SLOTS;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return slots;
}

function getServerSnapshot() {
  return EMPTY_SLOTS;
}

function setChromeSlot(name: ChromeSlotName, node: ReactNode | null) {
  if (slots[name] === node) return;
  slots = { ...slots, [name]: node };
  emit();
}

export function ChromeSlot({
  name,
  children,
}: {
  name: ChromeSlotName;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    setChromeSlot(name, children);
    return () => setChromeSlot(name, null);
  }, [name, children]);
  return null;
}

export function useChromeSlot(name: ChromeSlotName) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return snapshot[name];
}
