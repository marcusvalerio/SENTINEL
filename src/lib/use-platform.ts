"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True on Apple platforms (for ⌘ vs Ctrl hints). Stable on the server. */
export function useIsMac() {
  return useSyncExternalStore(
    subscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => true,
  );
}
