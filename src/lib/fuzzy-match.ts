/**
 * Lightweight fuzzy matching for tool search — no external dependencies.
 *
 * Scoring order (highest first):
 * 1. Exact substring match (word-start beats mid-word).
 * 2. In-order subsequence match (handles skipped/extra characters).
 * 3. Near-miss word match via edit distance (tolerates minor typos).
 */

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 0; i < a.length; i++) {
    const currentRow = [i + 1];

    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow.push(
        Math.min(
          currentRow[j] + 1, // deletion
          previousRow[j + 1] + 1, // insertion
          previousRow[j] + cost, // substitution
        ),
      );
    }

    previousRow = currentRow;
  }

  return previousRow[b.length];
}

/** In-order (not necessarily contiguous) subsequence score, or null if no match. */
function subsequenceScore(query: string, text: string): number | null {
  let queryIndex = 0;
  let score = 0;
  let streak = 0;

  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      queryIndex++;
      streak++;
      score += streak;
    } else {
      streak = 0;
    }
  }

  return queryIndex === query.length ? score : null;
}

/** Scores a single query against a list of searchable fields; higher is better, 0 means no match. */
export function fuzzyScore(query: string, fields: string[]): number {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return 0;

  let best = 0;

  for (const field of fields) {
    if (!field) continue;
    const text = field.toLowerCase();

    if (text.includes(normalizedQuery)) {
      const words = text.split(/\s+/);
      const isWordStart = words.some((word) => word.startsWith(normalizedQuery));
      const startBoost = text.startsWith(normalizedQuery) ? 60 : isWordStart ? 40 : 20;
      best = Math.max(best, 100 + startBoost + normalizedQuery.length);
      continue;
    }

    const subsequence = subsequenceScore(normalizedQuery, text);
    if (subsequence !== null) {
      best = Math.max(best, subsequence);
    }

    // Typo tolerance: compare the query against individual words.
    for (const word of text.split(/\s+/)) {
      if (Math.abs(word.length - normalizedQuery.length) > 2) continue;
      const threshold = normalizedQuery.length <= 4 ? 1 : 2;
      const distance = levenshteinDistance(normalizedQuery, word);
      if (distance <= threshold) {
        best = Math.max(best, 80 - distance * 15);
      }
    }
  }

  return best;
}

export function fuzzyMatches(query: string, fields: string[]): boolean {
  return fuzzyScore(query, fields) > 0;
}
