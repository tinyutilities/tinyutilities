import { Logo } from "./logo";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-28 lg:px-8 lg:py-32">
      <div className="absolute left-1/2 top-12 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="mx-auto max-w-4xl text-center">
        <div className="animate-fade-up flex justify-center">
          <Logo />
        </div>
        <h1 className="animate-fade-up mt-10 text-5xl font-semibold tracking-tight text-white [animation-delay:100ms] sm:text-7xl">
          TinyUtility
        </h1>
        <p className="animate-fade-up mt-6 text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-cyan-200 to-teal-200 [animation-delay:180ms]">
          Simple tools. Powerful results.
        </p>
        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300 [animation-delay:260ms]">
          Free online utilities for images, PDFs, text, developers and everyday productivity.
        </p>
        <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row [animation-delay:340ms]">
          <a
            className="rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816]"
            href="#tools"
          >
            Explore Tools
          </a>
          <a
            className="rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816]"
            href="#popular"
          >
            Coming Soon
          </a>
        </div>
      </div>
    </section>
  );
}
