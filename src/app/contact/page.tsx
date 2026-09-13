import type { ComponentType } from "react";
import {
  ChevronRightIcon,
  CoffeeIcon,
  ExternalLinkIcon,
  MailIcon,
  XIcon,
} from "@/components/landing/icons";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { BUY_ME_A_COFFEE_URL, EMAIL_ADDRESS, WEBSITE_URL, X_URL } from "@/config/external-links";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Contact | TinyUtility",
  description: "Get in touch with TinyUtility by email, X, or online — or support the project on Buy Me a Coffee.",
  path: "/contact",
});

type ContactLink = {
  label: string;
  value: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
  external: boolean;
  /** Each destination gets its own restrained, non-cyan treatment rather than a repeated brand gradient. */
  iconClassName: string;
};

const contactLinks: ContactLink[] = [
  {
    label: "Email me",
    value: EMAIL_ADDRESS,
    href: `mailto:${EMAIL_ADDRESS}`,
    Icon: MailIcon,
    external: false,
    // Soft, warm neutral — lighter and quieter than the others.
    iconClassName: "bg-white/[0.07] text-white/90 ring-white/15",
  },
  {
    label: "Find me on X",
    value: "@TinyUtilities",
    href: X_URL,
    Icon: XIcon,
    external: true,
    // Charcoal/black, echoing X's own mark — deliberately no cyan.
    iconClassName: "bg-black/50 text-white ring-white/10",
  },
  {
    label: "My website",
    value: "anushkakar.com",
    href: WEBSITE_URL,
    Icon: ExternalLinkIcon,
    external: true,
    // Warm beige/cream accent.
    iconClassName: "bg-[#c9a876]/[0.14] text-[#e6d3a8] ring-[#c9a876]/25",
  },
  {
    label: "Support TinyUtility",
    value: "Buy me a coffee",
    href: BUY_ME_A_COFFEE_URL,
    Icon: CoffeeIcon,
    external: true,
    // Coffee-warm amber, a quiet nod to Buy Me a Coffee's yellow without going full yellow.
    iconClassName: "bg-amber-400/[0.12] text-amber-200 ring-amber-300/25",
  },
];

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="px-6 pt-16 pb-10 lg:px-8 lg:pt-24 lg:pb-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Contact</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Have something to say?
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Whether it&apos;s a bug, suggestion, collaboration, or just a hello — I&apos;d love
              to hear from you.
            </p>
          </div>
        </section>

        <section className="px-6 pb-16 lg:px-8 lg:pb-24">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {contactLinks.map(({ label, value, href, Icon, external, iconClassName }) => (
              <a
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-cyan-300/60 focus:ring-offset-2 focus:ring-offset-[#060816] sm:px-6 sm:py-5"
                href={href}
                key={label}
                rel={external ? "noopener noreferrer" : undefined}
                target={external ? "_blank" : undefined}
              >
                <div
                  className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 transition duration-300 group-hover:scale-105 ${iconClassName}`}
                >
                  <Icon className="size-5 fill-none stroke-current stroke-2" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-white">{label}</h2>
                  <p className="mt-0.5 truncate text-sm text-slate-400">{value}</p>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 fill-none stroke-current stroke-2 text-slate-600 transition duration-300 group-hover:translate-x-1 group-hover:text-slate-400" />
              </a>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
