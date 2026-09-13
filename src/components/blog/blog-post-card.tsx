import Link from "next/link";
import type { BlogPost } from "@/features/blog/blog-data";

type BlogPostCardProps = {
  post: BlogPost;
};

function formatPostDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <Link
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:bg-white/[0.07] hover:shadow-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816] sm:p-8"
      href={`/blog/${post.slug}`}
    >
      <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
        <span>{post.category}</span>
        <span className="text-slate-600" aria-hidden="true">
          •
        </span>
        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-white">{post.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">{post.excerpt}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition group-hover:gap-2.5">
        Read article
        <svg
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}
