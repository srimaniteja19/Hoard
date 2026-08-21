"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

/** Pathname after hydration. `null` on the server so chrome SSR matches the client. */
export function useHydratedPathname(): string | null {
  const pathname = usePathname();
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return pathname || "/";
}
