import { SectionHeading } from "./section-heading";
import { ToolCard } from "@/components/tools/tool-card";
import { tools } from "@/features/tools/tool-data";

export function PopularTools() {
  return (
    <section className="px-6 py-10 sm:py-20 lg:px-8" id="popular">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Popular Tools"
          title="First utilities on the roadmap."
          description="Fast, free online utilities available today, with many more coming soon."
        />

        <div className="mt-6 grid auto-rows-fr grid-cols-1 gap-2.5 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
