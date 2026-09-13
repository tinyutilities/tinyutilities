import type { ReactNode } from "react";

/**
 * A short paragraph placed between the tool header and the tool UI — answers "why would I use
 * this" and links to a genuinely related tool where one exists, in natural sentence form (not a
 * "related tools" card, which already exists further down the page). Deliberately not a full
 * section with its own heading: this is a single sentence or two, not an article intro.
 */
export function ToolIntro({ children }: { children: ReactNode }) {
  return <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400">{children}</p>;
}
