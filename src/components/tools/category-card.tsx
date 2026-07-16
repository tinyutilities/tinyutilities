import type { ToolCategory } from "@/features/tools/tool-data";

type CategoryCardProps = {
  category: ToolCategory;
};

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition duration-300 hover:-translate-y-1 hover:border-teal-300/40 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">{category.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{category.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
          {category.toolCount}
        </span>
      </div>
    </article>
  );
}
