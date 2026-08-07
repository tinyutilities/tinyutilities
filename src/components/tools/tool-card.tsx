"use client";

import Link from "next/link";
import { ToolIcon } from "@/components/tools/tool-icon";
import { recordToolUsage } from "@/lib/use-tool-usage";
import type { Tool } from "@/features/tools/tool-data";

type ToolCardProps = {
  tool: Tool;
};

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Link
      className="group relative flex h-full items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3.5 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816] sm:flex-col sm:items-start sm:gap-0 sm:p-5"
      href={`/tools/${tool.slug}`}
      onClick={() => recordToolUsage(tool.slug)}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-600/25 via-cyan-500/20 to-teal-400/20 text-cyan-200 ring-1 ring-white/10 transition duration-300 group-hover:scale-105 group-hover:text-white sm:size-11 sm:rounded-xl">
        <ToolIcon className="size-5 fill-none stroke-current stroke-2" icon={tool.icon} />
      </div>
      <div className="min-w-0 sm:mt-3.5">
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300 sm:block">
          {tool.category}
        </p>
        <h3 className="truncate text-sm font-semibold text-white sm:mt-1.5 sm:text-base sm:whitespace-normal">
          {tool.title}
        </h3>
        {/* Mobile: subtle one-line blurb keeps the row compact. Desktop: full description. */}
        <p className="mt-0.5 truncate text-xs leading-5 text-slate-500 sm:hidden">{tool.blurb}</p>
        <p className="mt-1.5 hidden text-sm leading-6 text-slate-400 sm:line-clamp-2 sm:block">
          {tool.description}
        </p>
      </div>
    </Link>
  );
}
