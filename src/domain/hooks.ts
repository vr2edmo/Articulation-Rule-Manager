import { useSyncExternalStore } from "react";
import { store } from "./store";

/**
 * Subscribe to the store. Returns the current snapshot reference, which is
 * stable between mutations and changes identity on every commit. Components
 * derive their slices via `useMemo(() => store.getX(...), [snap, ...])` so the
 * Object.is check in useSyncExternalStore never sees a fresh array each render.
 */
export function useStoreSnapshot() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
