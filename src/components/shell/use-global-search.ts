"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResponse } from "@/domain/search";

/** Debounced, abortable search against /api/search. Only the latest query wins. */
export function useGlobalSearch(delay = 140) {
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);

  const search = useCallback(
    (raw: string) => {
      const query = raw.trim();
      clearTimeout(timer.current);
      controller.current?.abort();
      if (query.length < 2) {
        setResult(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      timer.current = setTimeout(async () => {
        const ac = new AbortController();
        controller.current = ac;
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ac.signal, cache: "no-store" });
          if (!response.ok) throw new Error(String(response.status));
          setResult((await response.json()) as SearchResponse);
        } catch (error) {
          if ((error as Error).name !== "AbortError") setResult({ query, total: 0, groups: [] });
        } finally {
          if (controller.current === ac) setLoading(false);
        }
      }, delay);
    },
    [delay],
  );

  useEffect(() => () => {
    clearTimeout(timer.current);
    controller.current?.abort();
  }, []);

  return { result, loading, search };
}
