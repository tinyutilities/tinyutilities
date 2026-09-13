import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-400 sm:flex-row">
        <p>Anushka Kar - TinyUtility © 2026</p>
        <nav className="flex items-center gap-6" aria-label="Footer navigation">
          <Link className="transition hover:text-white" href="/privacy">
            Privacy
          </Link>
          <Link className="transition hover:text-white" href="/terms">
            Terms
          </Link>
          <Link className="transition hover:text-white" href="/contact">
            Contact
          </Link>
          {/* hub.tinyutility.space is a separate site/property, not a route on this domain —
              a plain external link, never part of this site's sitemap or canonical structure. */}
          <a
            className="transition hover:text-white"
            href="https://hub.tinyutility.space"
            rel="noopener noreferrer"
            target="_blank"
          >
            TinyUtility Hub
          </a>
        </nav>
      </div>
    </footer>
  );
}
