import type { ReactNode } from "react";

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** One numbered-in-spirit section of a legal page: a heading (deep-linkable by its own slug)
 *  followed by prose. Shared so /privacy and /terms read as one consistent document type. */
export function LegalSection({ title, children }: LegalSectionProps) {
  const id = slugify(title);

  return (
    <section className="scroll-mt-24" id={id}>
      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
        <a className="hover:text-cyan-200" href={`#${id}`}>
          {title}
        </a>
      </h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-slate-300">{children}</div>
    </section>
  );
}
