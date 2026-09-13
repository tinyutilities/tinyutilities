import Link from "next/link";
import { ArticleIcon } from "@/components/landing/icons";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { getAllPosts } from "@/features/blog/blog-data";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Blog | TinyUtility",
  description:
    "Technical write-ups on how TinyUtility's browser-based tools actually work — coming soon.",
  path: "/blog",
});

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center sm:p-14">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600/25 via-cyan-500/20 to-teal-400/20 text-cyan-200 ring-1 ring-white/10">
        <ArticleIcon className="size-6 fill-none stroke-current stroke-2" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white">Getting the creative juices flowing...</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
        No articles yet, but the plan is real: how the Image to PDF converter works, what
        actually happens during image and PDF compression, and why processing stays in your
        browser instead of a server. Technical write-ups on TinyUtility&apos;s tools, coming soon.
      </p>
      <Link
        className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816]"
        href="/tools"
      >
        Explore tools instead
      </Link>
    </div>
  );
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Navbar />
      <main>
        <section className="px-6 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Blog</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Notes on tools, privacy, and building calmly.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Practical guides and updates about the tools TinyUtility builds — how they work,
                why they&apos;re built the way they are, and what&apos;s coming next.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 pb-16 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-7xl">
            {posts.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <BlogPostCard key={post.slug} post={post} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
