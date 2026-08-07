import type { ToolCategory } from "@/features/tools/tool-data";

type CategoryCardProps = {
  category: ToolCategory;
  active?: boolean;
  onSelect?: () => void;
};

export function CategoryCard({ category, active = false, onSelect }: CategoryCardProps) {
  return (
    <button
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-cyan-300/60 bg-cyan-300/15 text-white"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/30 hover:bg-white/[0.07] hover:text-white"
      }`}
      onClick={onSelect}
      type="button"
    >
      {category.title}
      <span
        className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs ${
          active ? "bg-cyan-300/25 text-cyan-100" : "bg-white/10 text-slate-400"
        }`}
      >
        {category.toolCount}
      </span>
    </button>
  );
}
