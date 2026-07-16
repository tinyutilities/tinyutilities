export type FAQItem = {
  question: string;
  answer: string;
};

type FAQSectionProps = {
  items: FAQItem[];
};

export function FAQSection({ items }: FAQSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-16" aria-labelledby="tool-faq">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">FAQ</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white" id="tool-faq">
        Common questions
      </h2>
      <div className="mt-8 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
        {items.map((item) => (
          <article className="p-6" key={item.question}>
            <h3 className="text-base font-semibold text-white">{item.question}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
