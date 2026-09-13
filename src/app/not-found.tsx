import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

// A real 404 page, not a soft-404: the host (Cloudflare Pages, for this static export) serves
// this with an actual 404 HTTP status for any unmatched route. Next.js already emits its own
// `noindex` robots meta for the built-in not-found route, so no explicit `robots` field is set
// here (adding one produced a redundant second `<meta name="robots">` tag). No canonical URL
// either — unlike a real page, a 404 has no single "preferred URL" to point to.
export const metadata: Metadata = {
  title: "Page Not Found | TinyUtility",
  description: "This page doesn't exist. Browse the TinyUtility tool catalog instead.",
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="px-6 py-24 text-center lg:px-8 lg:py-32">
        <div className="mx-auto max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">404</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            This page doesn&apos;t exist.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-400">
            The link may be broken, or the page may have moved. Try the tool catalog, or head
            back home.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              className="rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816]"
              href="/tools"
            >
              Browse tools
            </Link>
            <Link
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816]"
              href="/"
            >
              Go home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
