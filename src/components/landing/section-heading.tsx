type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300 sm:text-sm">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-4 sm:text-3xl lg:text-4xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400 sm:mt-4 sm:text-base sm:leading-7">{description}</p>
    </div>
  );
}
