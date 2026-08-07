"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tinyutility:tool-usage";
const MAX_ENTRIES = 20;

type UsageRecord = Record<string, { count: number; lastUsedAt: number }>;

function readUsage(): UsageRecord {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UsageRecord) : {};
  } catch {
    return {};
  }
}

function writeUsage(usage: UsageRecord) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // Ignore storage failures (private browsing, quota, etc.).
  }
}

/** Records a tool visit. Call this from tool pages/links on click or mount. */
export function recordToolUsage(slug: string) {
  if (typeof window === "undefined") return;

  const usage = readUsage();
  const existing = usage[slug];
  const trimmed = Object.entries(usage)
    .sort((a, b) => b[1].lastUsedAt - a[1].lastUsedAt)
    .slice(0, MAX_ENTRIES - 1);

  writeUsage({
    ...Object.fromEntries(trimmed),
    [slug]: { count: (existing?.count ?? 0) + 1, lastUsedAt: Date.now() },
  });
}

/** Returns tool slugs ordered by recency, and a lookup of usage counts. */
export function useToolUsage() {
  const [usage, setUsage] = useState<UsageRecord>({});

  useEffect(() => {
    setUsage(readUsage());

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setUsage(readUsage());
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const recentSlugs = Object.entries(usage)
    .sort((a, b) => b[1].lastUsedAt - a[1].lastUsedAt)
    .map(([slug]) => slug);

  const countBySlug = useCallback(
    (slug: string) => usage[slug]?.count ?? 0,
    [usage],
  );

  return { recentSlugs, countBySlug };
}
