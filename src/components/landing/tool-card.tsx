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
              group
              relative
              flex
              h-full
              flex-col
              overflow-hidden
              rounded-2xl
              border
              border-white/10
              bg-white/5
              px-5
              py-5
              transition-all
              sm:px-8
              sm:py-7
              duration-300
              hover:-translate-y-1
hover:border-cyan-300/60
hover:bg-white/10
hover:shadow-2xl
hover:shadow-cyan-500/20
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

        <h3 className="mt-4 text-lg font-semibold text-white sm:mt-5 sm:min-h-[3rem]">
          {title}
        </h3>

        <p className="mt-2 flex-1 text-sm leading-6 text-slate-400 sm:mt-3 sm:min-h-[3.6rem]">
          {description}
        </p>
      </article>
    </Link>
  );
}