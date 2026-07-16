import { features } from "./landing-data";
import { SectionHeading } from "./section-heading";
import { ToolCard } from "./tool-card";

export function FeatureGrid() {
  return (
    <section className="px-6 py-20 lg:px-8" id="tools">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Tool Categories"
          title="Everything useful, organized by workflow."
          description="TinyUtility will bring fast, focused tools into one clean place for daily work."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <ToolCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
