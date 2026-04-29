import { useState, useEffect, useCallback, DependencyList } from "react";

export function notifyDataChanged() {
  window.dispatchEvent(new Event("store-updated"));
  try {
    localStorage.setItem("mc_store_updated_at", String(Date.now()));
  } catch {
    // Ignore storage access issues (private mode / quota)
  }
}

/**
 * Like the old useStoreSync but loads data asynchronously (from the API).
 */
export function useAsyncSync<T>(loader: () => Promise<T>, initial: T, deps: DependencyList = []) {
  const [data, setData] = useState<T>(initial);

  const load = useCallback(async () => {
    try {
      const d = await loader();
      setData(d);
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("store-updated", handler);
    const storageHandler = (ev: StorageEvent) => {
      if (ev.key === "mc_store_updated_at") handler();
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("store-updated", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, [load]);

  const refresh = useCallback(() => load(), [load]);
  return [data, refresh] as const;
}
