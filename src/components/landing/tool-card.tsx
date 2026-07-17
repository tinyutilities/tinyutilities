import Link from "next/link";
import type { ComponentType } from "react";

type ToolCardProps = {
  title: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
  href: string;
};

export function ToolCard({
  title,
  description,
  Icon,
  href,
}: ToolCardProps) {
  return (
    <Link
      href={href}
      className="block h-full"
    >
      <article
        className="
          group relative flex h-full flex-col
          overflow-hidden rounded-2xl
          border border-white/10
          bg-white/5
          p-8
          transition-all duration-300
          hover:-translate-y-1
          hover:border-cyan-400/40
          hover:bg-white/10
        "
      >
        <div
          className="
            grid size-12 place-items-center rounded-xl
            bg-gradient-to-br
            from-indigo-600/25
            via-cyan-500/20
            to-cyan-400/20
            transition-all duration-300
            group-hover:scale-110
            group-hover:-translate-y-1
          "
        >
          <Icon
            className="
              size-6
              fill-none
              stroke-current
              stroke-2
              transition-transform
              duration-300
              group-hover:rotate-3
            "
          />
        </div>

        <h3 className="mt-5 min-h-[3rem] text-lg font-semibold text-white">
          {title}
        </h3>

        <p className="mt-3 flex-1 min-h-[3.6rem] text-sm leading-6 text-slate-400">
          {description}
        </p>
      </article>
    </Link>
  );
}