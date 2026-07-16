import type { ComponentType } from "react";

type ToolCardProps = {
  title: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
};

export function ToolCard({ title, description, Icon }: ToolCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/[0.07]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
      <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-600/25 via-cyan-500/20 to-teal-400/20 text-cyan-200 ring-1 ring-white/10 transition duration-300 group-hover:scale-105 group-hover:text-white">
        <Icon className="size-6 fill-none stroke-current stroke-2" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}
