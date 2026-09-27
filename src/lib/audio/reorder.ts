/**
 * Generic, index-based list reordering — deliberately has nothing audio-specific in it, but
 * lives alongside the rest of the Audio Tools infrastructure because Audio Joiner's file list
 * (and any future multi-file Audio Tool) needs exactly this. Operating purely on index rather
 * than identity means duplicate filenames, or any other duplicate-looking items, can never
 * confuse a move/remove — the caller always says exactly which position they mean.
 */

/** Swaps the item at `index` with its neighbor in `direction`. Returns the same array reference
 *  (not a copy) if the move would go out of bounds, so callers can cheaply check "did anything
 *  change" with `!==`. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const targetIndex = index + direction;

  if (index < 0 || index >= items.length || targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

/** Removes the item at `index`. Out-of-range indices are a no-op (returns the same reference). */
export function removeItem<T>(items: T[], index: number): T[] {
  if (index < 0 || index >= items.length) {
    return items;
  }

  return items.filter((_, itemIndex) => itemIndex !== index);
}
