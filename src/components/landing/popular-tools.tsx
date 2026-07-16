import { popularTools } from "./landing-data";
import { SectionHeading } from "./section-heading";
import { ToolCard } from "./tool-card";

export function PopularTools() {
  return (
    <section className="px-6 py-20 lg:px-8" id="popular">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Popular Tools"
          title="First utilities on the roadmap."
          description="These placeholders define the early product direction without adding tool logic yet."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {popularTools.map((tool) => (
            <ToolCard key={tool.title} {...tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
