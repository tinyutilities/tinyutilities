import Link from "next/link";

export function Logo() {
  return (
    <Link className="group flex items-center gap-3" href="/" aria-label="TinyUtility home">
      <span className="relative grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-lg shadow-cyan-500/10 transition duration-300 group-hover:border-cyan-300/50 group-hover:bg-white/15">
        <span className="absolute inset-0 rounded-xl bg-[linear-gradient(135deg,#4F46E5,#06B6D4,#14B8A6)] opacity-80" />
        <span className="relative h-4 w-4 rounded-md border-2 border-white/90" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">TinyUtility</span>
    </Link>
  );
}
