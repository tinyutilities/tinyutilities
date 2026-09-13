export type UseCase = {
  title: string;
  description: string;
};

type UseCasesProps = {
  items: UseCase[];
};

/** Real, specific scenarios for when a tool is useful — not generic filler, and not a
 *  restatement of the FAQ. Mirrors the visual pattern already used by HowItWorks/FAQSection. */
export function UseCases({ items }: UseCasesProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-16" aria-labelledby="tool-use-cases">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Use cases</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white" id="tool-use-cases">
        When this comes in handy
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5" key={item.title}>
            <h3 className="text-sm font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
