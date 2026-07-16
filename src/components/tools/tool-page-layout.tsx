import Link from "next/link";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolIcon } from "@/components/tools/tool-icon";
import type { Tool } from "@/features/tools/tool-data";

type ToolPageLayoutProps = {
  tool: Tool;
  relatedTools: Tool[];
};

export function ToolPageLayout({ tool, relatedTools }: ToolPageLayoutProps) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
      <Link className="text-sm font-medium text-cyan-300 transition hover:text-cyan-100" href="/tools">
        Back to tools
      </Link>

      <section className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20 sm:p-10">
        <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600/25 via-cyan-500/20 to-teal-400/20 text-cyan-200 ring-1 ring-white/10">
          <ToolIcon className="size-7 fill-none stroke-current stroke-2" icon={tool.icon} />
        </div>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
          {tool.category}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {tool.title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{tool.description}</p>
        <div className="mt-8 inline-flex rounded-full border border-teal-300/25 bg-teal-300/10 px-4 py-2 text-sm font-semibold text-teal-200">
          Coming Soon
        </div>
      </section>

      <section className="mt-16" aria-labelledby="related-tools">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Related Tools
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white" id="related-tools">
          Try these next
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {relatedTools.map((relatedTool) => (
            <ToolCard key={relatedTool.slug} tool={relatedTool} />
          ))}
        </div>
      </section>
    </div>
  );
}
