"use client";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="block">
      <span className="sr-only">Search tools</span>
      <input
        className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-cyan-300/20"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search tools..."
        type="search"
        value={value}
      />
    </label>
  );
}
