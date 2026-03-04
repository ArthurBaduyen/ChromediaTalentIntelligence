import { DependencyList, useCallback, useEffect, useMemo, useRef, useState } from "react";

type QueryResourceOptions<T> = {
  initialData: T;
  fetcher: () => Promise<T>;
  deps?: DependencyList;
};

export function useQueryResource<T>({ initialData, fetcher, deps = [] }: QueryResourceOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetcherRef.current();
      setData(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch().catch(() => {
      // handled by local error state
    });
    // refetch is intentionally stable; external deps control when data should be refreshed.
  }, [refetch, ...deps]);

  const resource = useMemo(
    () => ({ data, setData, isLoading, error, refetch }),
    [data, isLoading, error, refetch]
  );

  return resource;
}
