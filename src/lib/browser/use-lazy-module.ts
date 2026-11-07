"use client";

import { useEffect, useState } from "react";

/**
 * Loads a heavy library with a dynamic import() after the tool first renders, so its code is a
 * separate download that only that tool's page ever requests. Returns `module: null` until it has
 * loaded (or `error` if it can't, e.g. when offline).
 */
export function useLazyModule<T>(load: () => Promise<T>): { module: T | null; error: boolean } {
  const [state, setState] = useState<{ module: T | null; error: boolean }>({ module: null, error: false });

  useEffect(() => {
    let cancelled = false;

    load()
      .then((module) => {
        if (!cancelled) setState({ module, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ module: null, error: true });
      });

    return () => {
      cancelled = true;
    };
    // `load` is a module-level function in every caller; it is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
