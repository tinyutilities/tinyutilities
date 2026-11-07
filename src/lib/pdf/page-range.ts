export type PageRangeResult = { ok: true; pages: number[] } | { ok: false; error: string };

/**
 * Parses a page-selection string such as "1-3, 5, 8-" into a sorted list of unique 1-based page
 * numbers. Supported forms: `N`, `N-M`, `N-` (to the last page) and `-M` (from page 1).
 * An empty string selects every page. Anything out of range or malformed is an explicit error
 * rather than being silently clamped.
 */
export function parsePageRange(input: string, totalPages: number): PageRangeResult {
  const trimmed = input.trim();

  if (totalPages < 1) {
    return { ok: false, error: "This PDF has no pages." };
  }

  if (trimmed === "") {
    return { ok: true, pages: Array.from({ length: totalPages }, (_, index) => index + 1) };
  }

  const selected = new Set<number>();

  for (const rawToken of trimmed.split(",")) {
    const token = rawToken.trim();

    if (token === "") {
      return { ok: false, error: "There is an empty entry in the page list. Remove the extra comma." };
    }

    const match = /^(\d*)\s*(-)?\s*(\d*)$/.exec(token);

    if (!match || (match[1] === "" && match[3] === "")) {
      return { ok: false, error: `"${token}" is not a valid page or range. Use numbers like 3, 2-5 or 7-.` };
    }

    const hasDash = match[2] === "-";
    const start = match[1] === "" ? 1 : Number(match[1]);
    const end = !hasDash ? start : match[3] === "" ? totalPages : Number(match[3]);

    if (start < 1 || end < 1) {
      return { ok: false, error: `Page numbers start at 1 ("${token}").` };
    }

    if (start > totalPages || end > totalPages) {
      return {
        ok: false,
        error: `"${token}" is outside this PDF, which has ${totalPages} page${totalPages === 1 ? "" : "s"}.`,
      };
    }

    if (start > end) {
      return { ok: false, error: `"${token}" runs backwards. Write it as ${end}-${start}.` };
    }

    for (let page = start; page <= end; page += 1) selected.add(page);
  }

  return { ok: true, pages: Array.from(selected).sort((a, b) => a - b) };
}
