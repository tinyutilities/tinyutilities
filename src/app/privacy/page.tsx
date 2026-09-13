import Link from "next/link";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { LegalSection } from "@/components/legal/legal-section";
import { BUY_ME_A_COFFEE_URL, EMAIL_ADDRESS, WEBSITE_URL, X_URL } from "@/config/external-links";
import { createSeoMetadata } from "@/lib/seo";

// Update this whenever the content below meaningfully changes — it's a literal date, not
// build-time "freshness," matching the same honesty rule already used for the sitemap.
const lastUpdated = "September 13, 2026";

export const metadata = createSeoMetadata({
  title: "Privacy Policy | TinyUtility",
  description:
    "How TinyUtility handles your data: what the tools process in your browser, what TinyUtility's code actually collects, and which third-party services are involved.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="px-6 pt-16 pb-10 lg:px-8 lg:pt-24 lg:pb-12">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Legal</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              This explains what actually happens to your data on TinyUtility — checked directly
              against how the site is built, not boilerplate. It&apos;s written to be readable,
              not exhaustive legal text.
            </p>
            <p className="mt-4 text-sm text-slate-500">Last updated: {lastUpdated}</p>
          </div>
        </section>

        <section className="px-6 pb-20 lg:px-8 lg:pb-28">
          <div className="mx-auto max-w-3xl space-y-12">
            <LegalSection title="Introduction">
              <p>
                TinyUtility (&quot;TinyUtility,&quot; &quot;we,&quot; or &quot;this site&quot;)
                is an independent, free, browser-based collection of utility tools at{" "}
                <span className="text-slate-200">tinyutility.space</span>. TinyUtility is built
                and maintained by one person, Anushka Kar — not a company with a legal or
                compliance department. This Privacy Policy describes what the site actually
                does, based directly on its source code, and is written for people using the
                site rather than for lawyers.
              </p>
            </LegalSection>

            <LegalSection title="What TinyUtility does">
              <p>
                TinyUtility provides free tools for images, PDFs, text, and everyday developer
                tasks: Image Compressor, Image Converter, Image to PDF, PDF Merger, PDF
                Compressor, Word Counter, Password Generator, QR Code Generator, and JSON
                Formatter. TinyUtility is a static website — there is no TinyUtility account
                system, no database, and no backend server for tools to send files to.
              </p>
            </LegalSection>

            <LegalSection title="Files and data processed by the tools">
              <p>
                Every TinyUtility tool does its actual work — compressing an image, merging PDF
                pages, generating a QR code — directly in your browser, using built-in browser
                features or JavaScript libraries loaded into the page. None of the tools upload
                your files to a TinyUtility server, because there is no such server: the site has
                no API and no backend for a tool to call.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Image Compressor, Image Converter, and Image to PDF process the images you
                  choose directly in your browser tab.
                </li>
                <li>
                  PDF Merger and PDF Compressor read and rebuild your PDF files locally. PDF
                  Merger&apos;s page-preview thumbnails use a temporary local reference to your
                  file created by your own browser — not an upload.
                </li>
                <li>Word Counter and JSON Formatter analyze text you paste or a file you load, locally.</li>
                <li>
                  Password Generator and QR Code Generator don&apos;t take a file at all — they
                  generate output from what you type, locally.
                </li>
              </ul>
              <p>
                When you close the tab or navigate away, whatever was in the tool is gone unless
                you downloaded it. TinyUtility doesn&apos;t keep a copy anywhere, because it
                never had one outside your browser tab.
              </p>
            </LegalSection>

            <LegalSection title="How browser-based processing works">
              <p>
                &quot;Processed in your browser&quot; means the computation happens using your
                own device&apos;s processing power, inside the tab you have open, through
                standard web technologies — not by sending your file data somewhere else first.
                There is generally no &quot;upload&quot; step for TinyUtility&apos;s tools,
                because there&apos;s no server for them to upload to.
              </p>
            </LegalSection>

            <LegalSection title="Information TinyUtility collects">
              <p>
                TinyUtility&apos;s own code does not include analytics, tracking scripts,
                advertising pixels, or error-reporting services. There is no account system, no
                sign-up, no email-collection form, and no server-side request logging built into
                the site — because there is no backend to log to.
              </p>
              <p>
                The one thing the site&apos;s code does store is described next. Separately,
                because tinyutility.space is hosted on Cloudflare Pages, standard web
                infrastructure logging outside TinyUtility&apos;s own code may apply — see
                Third-party services below.
              </p>
            </LegalSection>

            <LegalSection title="Cookies and local storage">
              <p>TinyUtility&apos;s own code does not set cookies.</p>
              <p>
                It does use your browser&apos;s <span className="text-slate-200">localStorage</span>{" "}
                — on-device storage built into your browser, not a cookie — to remember which
                tools you&apos;ve recently used, so the Tools page can show a &quot;Recently
                used&quot; shortcut list. This is stored under the key{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm text-slate-200">
                  tinyutility:tool-usage
                </code>{" "}
                and contains only tool names, a use count, and a timestamp. It stays on your
                device, is never sent to any server, and you can clear it any time by clearing
                your browser&apos;s site data for tinyutility.space. This is the only client-side
                storage TinyUtility&apos;s code uses.
              </p>
            </LegalSection>

            <LegalSection title="Third-party services">
              <p>TinyUtility links to, or runs on, a small number of external services:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="text-slate-200">Cloudflare Pages</span> — hosts and serves this
                  website. Like any hosting/CDN provider, Cloudflare&apos;s infrastructure
                  processes standard web request information (such as IP address) to deliver
                  pages, at the hosting layer, outside TinyUtility&apos;s own code. See{" "}
                  <a
                    className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
                    href="https://www.cloudflare.com/privacypolicy/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Cloudflare&apos;s privacy policy
                  </a>
                  .
                </li>
                <li>
                  <span className="text-slate-200">Buy Me a Coffee</span> — an optional external
                  link, for anyone who wants to support the project. TinyUtility never sees any
                  payment information; that&apos;s handled entirely by{" "}
                  <a
                    className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
                    href={BUY_ME_A_COFFEE_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Buy Me a Coffee
                  </a>
                  , subject to its own privacy policy.
                </li>
                <li>
                  <a
                    className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
                    href={X_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    X
                  </a>{" "}
                  — a link to TinyUtility&apos;s profile. Visiting it is subject to X&apos;s own
                  privacy policy.
                </li>
                <li>
                  <a
                    className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
                    href={WEBSITE_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    anushkakar.com
                  </a>{" "}
                  — the creator&apos;s personal website, governed by its own policies.
                </li>
              </ul>
              <p>
                TinyUtility does not use Google Analytics, Google Tag Manager, Meta/Facebook
                Pixel, or any similar tracking or advertising service.
              </p>
            </LegalSection>

            <LegalSection title="External links">
              <p>
                Pages like About, Contact, and Pricing link to the external sites listed above,
                and tool pages link to each other. Once you leave tinyutility.space, that
                site&apos;s own privacy policy and terms apply — TinyUtility doesn&apos;t control,
                and isn&apos;t responsible for, how other sites handle your data.
              </p>
            </LegalSection>

            <LegalSection title="Payments and support">
              <p>
                TinyUtility doesn&apos;t sell anything and doesn&apos;t process payments
                directly. The &quot;Support TinyUtility&quot; link goes to Buy Me a Coffee, an
                external service — any payment information you provide there is handled by Buy
                Me a Coffee, not TinyUtility.
              </p>
            </LegalSection>

            <LegalSection title="Children's privacy">
              <p>
                TinyUtility is a general-audience utility website, not a service directed at
                children, and doesn&apos;t knowingly collect personal information from anyone —
                including children — because it has no mechanism to collect personal information
                from any visitor in the first place (see Information TinyUtility collects above).
                If you believe a child has provided personal information directly to TinyUtility
                (for example, by email), contact us using the details below and it will be
                deleted.
              </p>
            </LegalSection>

            <LegalSection title="Data security">
              <p>
                Because TinyUtility&apos;s tools process files locally rather than sending them to
                a server, there&apos;s no TinyUtility-held copy of your files to secure in the
                first place. That said, no website, browser, or device is perfectly secure, and
                TinyUtility can&apos;t make absolute security guarantees — including for the
                general web infrastructure, like Cloudflare, that any website depends on.
              </p>
            </LegalSection>

            <LegalSection title="Data retention">
              <p>
                TinyUtility doesn&apos;t retain your files or text — there&apos;s no TinyUtility
                server for them to be retained on. The only thing retained anywhere is the
                local, on-device &quot;recently used tools&quot; list described above, which
                stays until you clear it yourself.
              </p>
            </LegalSection>

            <LegalSection title="Your rights and privacy requests">
              <p>
                TinyUtility doesn&apos;t currently have a formal, jurisdiction-specific
                privacy-rights process (for example, a dedicated GDPR or CCPA request system) —
                this is an independent project, not a company with a legal team. That said, if
                you have a question or request relating to any information TinyUtility actually
                holds about you, you&apos;re welcome to reach out using the contact details
                below, and it will be looked at directly.
              </p>
            </LegalSection>

            <LegalSection title="Changes to this Privacy Policy">
              <p>
                This Privacy Policy may be updated if TinyUtility&apos;s tools, hosting, or
                third-party services change. The &quot;Last updated&quot; date at the top of
                this page reflects the most recent revision.
              </p>
            </LegalSection>

            <LegalSection title="Contact">
              <p>
                Questions about this Privacy Policy can be sent to{" "}
                <a
                  className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
                  href={`mailto:${EMAIL_ADDRESS}`}
                >
                  {EMAIL_ADDRESS}
                </a>
                , or via the{" "}
                <Link
                  className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
                  href="/contact"
                >
                  Contact page
                </Link>
                .
              </p>
            </LegalSection>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
