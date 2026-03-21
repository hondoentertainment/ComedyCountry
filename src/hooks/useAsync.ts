"use client";

import { useState, useCallback } from "react";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setState({ data: null, error: null, loading: true });
    try {
      const data = await asyncFn();
      setState({ data, error: null, loading: false });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setState({ data: null, error: message, loading: false });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return { ...state, execute, reset };
}
