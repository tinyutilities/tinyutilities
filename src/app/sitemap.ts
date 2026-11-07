import { execFileSync } from "node:child_process";
import type { MetadataRoute } from "next";
import { tools } from "@/features/tools/tool-data";
import { absoluteUrl, siteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * Whether this checkout is a shallow clone (e.g. Cloudflare Pages' default checkout depth).
 * In a shallow clone, `git log -1 -- <path>` doesn't fail or come back empty for a path that
 * predates the boundary commit — it *succeeds*, misreporting the boundary commit's own date for
 * every such path, because git has no parent commit to diff against and so cannot tell whether
 * the path actually changed there or simply already existed. That is the real reason every one
 * of this site's 54 sitemap URLs previously shared one identical `lastmod`: the single boundary
 * commit's timestamp, not a `new Date()` fallback. Checked once per build, not per path.
 */
function isShallowRepo(): boolean {
  try {
    return (
      execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
        cwd: process.cwd(),
        encoding: "utf8",
      }).trim() === "true"
    );
  } catch {
    return true;
  }
}

const shallowRepo = isShallowRepo();

/**
 * Real last-modified date for a page, taken from this repository's own git history for the
 * file(s) that make up that page — not a single date stamped onto every URL on every build,
 * which would claim every page changed on the same day regardless of whether it actually did.
 * Returns undefined (omitting `lastmod` for that URL) whenever a real per-page date can't be
 * trusted — a shallow checkout (see `isShallowRepo`), or git being unavailable/the path having
 * no history — an honest "we don't know" rather than a fabricated date.
 */
function lastModifiedFor(paths: string[]): Date | undefined {
  if (shallowRepo) return undefined;

  try {
    const output = execFileSync("git", ["log", "-1", "--format=%aI", "--", ...paths], {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();

    if (output) return new Date(output);
  } catch {
    // git isn't available (or these paths have no history) in this build environment.
  }

  return undefined;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      // No trailing slash: matches this site's actual canonical tag for the homepage, which
      // Next.js's own metadata resolver always renders as the bare origin for the root path.
      url: siteUrl,
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
