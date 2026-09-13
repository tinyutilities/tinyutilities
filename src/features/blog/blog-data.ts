export type BlogPost = {
  title: string;
  slug: string;
  /** Short summary shown on the listing card. */
  excerpt: string;
  /** ISO date string, e.g. "2026-01-15". */
  date: string;
  category: string;
  /** Body copy, written as plain paragraphs separated by a blank line. */
  content: string;
};

/**
 * No posts have been published yet. This array is the single source of truth for the blog —
 * add a `BlogPost` entry here once real content exists and it will appear on `/blog`
 * automatically via `getAllPosts`.
 *
 * Note on `/blog/[slug]`: this repo builds with `output: "export"` (see `next.config.ts`), which
 * requires a dynamic route's `generateStaticParams()` to return at least one path — an empty
 * array makes the build fail. So a `src/app/blog/[slug]/page.tsx` route isn't included in this
 * commit; add one back (using `getPostBySlug` below, mirroring `src/app/tools/[slug]/page.tsx`'s
 * `generateStaticParams`/`generateMetadata`/`notFound()` pattern) at the same time as the first
 * real post.
 */
export const posts: BlogPost[] = [];

export function getAllPosts() {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug);
}
