import { ToolCard } from "@/components/tools/tool-card";
import type { Tool } from "@/features/tools/tool-data";

type RelatedToolsProps = {
  tools: Tool[];
};

export function RelatedTools({ tools }: RelatedToolsProps) {
  if (tools.length === 0) {
    return null;
  }

  return (
    <section className="mt-16" aria-labelledby="related-tools">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
        Related Tools
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white" id="related-tools">
        Try these next
      </h2>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </section>
  );
}
