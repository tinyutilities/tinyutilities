import Link from "next/link";
import { ToolIcon } from "@/components/tools/tool-icon";
import type { Tool } from "@/features/tools/tool-data";

type ToolHeaderProps = {
  tool: Tool;
  statusLabel?: string | null;
};

export function ToolHeader({ tool, statusLabel = "Coming Soon" }: ToolHeaderProps) {
  return (
    <>
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
        {statusLabel ? (
          <div className="mt-8 inline-flex rounded-full border border-teal-300/25 bg-teal-300/10 px-4 py-2 text-sm font-semibold text-teal-200">
            {statusLabel}
          </div>
        ) : null}
      </section>
    </>
  );
}
