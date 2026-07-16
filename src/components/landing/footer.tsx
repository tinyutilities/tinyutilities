export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-400 sm:flex-row">
        <p>TinyUtility © 2026</p>
        <nav className="flex items-center gap-6" aria-label="Footer navigation">
          <a className="transition hover:text-white" href="#privacy">
            Privacy
          </a>
          <a className="transition hover:text-white" href="#terms">
            Terms
          </a>
          <a className="transition hover:text-white" href="#contact">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
