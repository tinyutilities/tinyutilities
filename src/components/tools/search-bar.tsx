"use client";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="relative block">
      <span className="sr-only">Search tools</span>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-slate-500"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      <input
        className="w-full rounded-2xl border border-white/15 bg-white/[0.07] py-3.5 pl-11 pr-11 text-base text-white shadow-lg shadow-black/20 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-cyan-300/25 sm:py-4 sm:text-lg"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tools (PDF, Image, QR, Fraction...)"
        type="search"
        value={value}
      />
      {value ? (
        <button
          aria-label="Clear search"
          className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
          onClick={() => onChange("")}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            className="size-3.5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </label>
  );
}
