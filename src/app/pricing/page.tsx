import Link from "next/link";
import { CoffeeIcon } from "@/components/landing/icons";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { SectionHeading } from "@/components/landing/section-heading";
import { BUY_ME_A_COFFEE_URL } from "@/config/external-links";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Pricing | TinyUtility",
  description:
    "TinyUtility is free to use, with no subscriptions or locked features. See how pricing works and how to optionally support development.",
  path: "/pricing",
});

const facts = [
  {
    title: "Free today",
    description: "Every tool in the current catalog is free to use, with no account required.",
  },
  {
    title: "Staying free",
    description: "The core, everyday utilities you come here for will remain free going forward.",
  },
  {
    title: "No plans, no upsells",
    description: "There are no paid tiers, subscriptions, or features locked behind a paywall right now.",
  },
];

const hasCoffeeLink = Boolean(BUY_ME_A_COFFEE_URL);

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="px-6 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Pricing</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Simple tools. No subscription required.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              TinyUtility is free to use, and the everyday tools you come here for will stay free.
              No subscriptions, no locked features, no complicated plans.
            </p>
          </div>
        </section>

        <section className="px-6 pb-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 sm:grid-cols-3">
              {facts.map((fact) => (
                <article
                  className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20"
                  key={fact.title}
                >
                  <h2 className="text-lg font-semibold text-white">{fact.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{fact.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-16 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/[0.06] p-8 text-center shadow-2xl shadow-cyan-950/20 sm:p-10">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600/25 via-cyan-500/20 to-teal-400/20 text-cyan-200 ring-1 ring-white/10">
                <CoffeeIcon className="size-6 fill-none stroke-current stroke-2" />
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Optional Support
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Enjoying TinyUtility? Buy me a coffee.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300">
                If TinyUtility saves you a little time, you can help keep it going with a coffee.
                It helps support the time and effort that goes into building and maintaining
                these tools.
              </p>

              {hasCoffeeLink ? (
                <a
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816]"
                  href={BUY_ME_A_COFFEE_URL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <CoffeeIcon className="size-4 fill-none stroke-current stroke-2" />
                  Buy me a coffee
                </a>
              ) : (
                <p className="mt-6 text-sm font-medium text-cyan-100/70">
                  The Buy Me a Coffee link is coming soon.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="px-6 pb-16 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Get Started"
              title="No plan to pick. Just open a tool."
              description="Head to the catalog and use whatever you need — nothing to sign up for."
            />
            <div className="mt-8 flex justify-center">
              <Link
                className="inline-flex rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816]"
                href="/tools"
              >
                Explore tools
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
