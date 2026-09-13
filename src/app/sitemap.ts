import { execFileSync } from "node:child_process";
import type { MetadataRoute } from "next";
import { tools } from "@/features/tools/tool-data";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * Real last-modified date for a page, taken from this repository's own git history for the
 * file(s) that make up that page — not a single `new Date()` stamped onto every URL on every
 * build, which would claim every page changed today regardless of whether it actually did.
 * Falls back to the current date only if git history isn't available in the build environment
 * (e.g. a shallow checkout with no matching commit) — the least-wrong value with nothing to
 * go on, not a fabricated "always fresh" claim.
 */
function lastModifiedFor(paths: string[]): Date {
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%aI", "--", ...paths], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();

    if (output) return new Date(output);
  } catch {
    // git isn't available (or these paths have no history) in this build environment.
  }

  return new Date();
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: lastModifiedFor(["src/app/page.tsx", "src/components/landing"]),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/tools"),
      lastModified: lastModifiedFor([
        "src/app/tools/page.tsx",
        "src/components/tools/tools-directory.tsx",
        "src/features/tools/tool-data.ts",
      ]),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/pricing"),
      lastModified: lastModifiedFor(["src/app/pricing/page.tsx"]),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: lastModifiedFor(["src/app/about/page.tsx"]),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: lastModifiedFor(["src/app/blog/page.tsx", "src/features/blog/blog-data.ts"]),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified: lastModifiedFor(["src/app/contact/page.tsx"]),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: lastModifiedFor(["src/app/privacy/page.tsx", "src/components/legal"]),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: lastModifiedFor(["src/app/terms/page.tsx", "src/components/legal"]),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...tools.map((tool) => ({
      url: absoluteUrl(`/tools/${tool.slug}`),
      lastModified: lastModifiedFor([
        "src/app/tools/[slug]/page.tsx",
        `src/features/tools/${tool.slug}`,
      ]),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
