import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { SectionHeading } from "@/components/landing/section-heading";
import { ToolCard } from "@/components/tools/tool-card";
import { tools } from "@/features/tools/tool-data";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "About TinyUtility",
  description:
    "Learn about TinyUtility, a privacy-first collection of browser-based online tools designed for speed, simplicity and reliability.",
  path: "/about",
});

const principles = [
  {
    title: "Privacy First",
    description:
      "Files and data stay on your device whenever possible, so everyday utility work does not require unnecessary uploads.",
  },
  {
    title: "Speed",
    description:
      "Pages and tools are built to load quickly, stay lightweight, and get out of the way.",
  },
  {
    title: "Simplicity",
    description:
      "Each tool focuses on the job it is meant to do without adding steps or options you do not need.",
  },
  {
    title: "Reliability",
    description:
      "TinyUtility aims for a consistent, predictable experience across every tool in the collection.",
  },
];

const workFlowPoints = [
  "Most tools process files directly in the browser.",
  "No account is required.",
  "No unnecessary uploads.",
  "No complicated setup.",
];

const nextSteps = [
  "Better performance",
  "More useful browser-based tools",
  "Improved accessibility",
  "Better mobile experience",
  "Helpful educational content through the blog",
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="px-6 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                About
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                About TinyUtility
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                TinyUtility is a growing collection of fast, privacy-first browser tools
                designed to make everyday tasks easier. Wherever possible, tools process
                data entirely inside your browser, keeping the work close to your device.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 pb-16 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Why TinyUtility Exists
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Utility tools should feel calm, fast, and trustworthy.
              </h2>
            </div>
            <div className="space-y-5 text-base leading-7 text-slate-400">
              <p>
                Many online utility websites are cluttered, slow, full of intrusive ads,
                or ask you to upload files when the task could happen locally.
              </p>
              <p>
                TinyUtility exists to make those everyday jobs simpler: open the tool,
                do the work, and move on without wrestling with noise or unnecessary
                complexity.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Our Principles"
              title="Small decisions that make the tools better."
              description="The site is built around practical choices that protect focus, speed, and trust."
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {principles.map((principle) => (
                <article
                  className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20"
                  key={principle.title}
                >
                  <h3 className="text-lg font-semibold text-white">{principle.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {principle.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                How TinyUtility Works
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Built for browser-based work.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-400">
                TinyUtility keeps common tasks straightforward. For tools that handle
                files or text, the goal is to do the work locally in your browser
                whenever the web platform allows it.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {workFlowPoints.map((point) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm font-medium leading-6 text-slate-200"
                  key={point}
                >
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Built With
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Modern web technology, kept practical.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
                TinyUtility is built with Next.js, React, and TypeScript, using the
                browser itself for as much tool processing as possible.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Current Features"
              title="Available tools today."
              description="The current catalog covers images, PDFs, text, passwords, QR codes, and developer formatting."
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                What&apos;s Next
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                TinyUtility will keep improving carefully.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {nextSteps.map((step) => (
                <div
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm font-medium leading-6 text-slate-200"
                  key={step}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                About the Developer
              </p>
              <p className="mt-4 text-base leading-7 text-slate-300">
                TinyUtility is an independent project created and maintained by
                Anushka Kar.
              </p>
            </article>
            <article className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.06] p-6 shadow-2xl shadow-cyan-950/20 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Feedback
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Help shape what TinyUtility becomes.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Bug reports, improvement ideas, and honest feedback are welcome as
                TinyUtility continues to evolve.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
