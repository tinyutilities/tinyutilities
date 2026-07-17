export type HowItWorksStep = {
  title: string;
  description: string;
};

type HowItWorksProps = {
  steps: HowItWorksStep[];
  title?: string;
};

export function HowItWorks({ steps, title = "How this tool works" }: HowItWorksProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <section className="mt-16" aria-labelledby="how-it-works">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
        How it works
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white" id="how-it-works">
        {title}
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <article
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20"
            key={step.title}
          >
            <div className="grid size-9 place-items-center rounded-full bg-cyan-300/10 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-300/20">
              {index + 1}
            </div>
            <h3 className="mt-5 text-base font-semibold text-white">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
