import Link from "next/link";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { LegalSection } from "@/components/legal/legal-section";
import { EMAIL_ADDRESS } from "@/config/external-links";
import { createSeoMetadata } from "@/lib/seo";

// Update this whenever the content below meaningfully changes — see the same note in
// src/app/privacy/page.tsx.
const lastUpdated = "September 13, 2026";

export const metadata = createSeoMetadata({
  title: "Terms of Service | TinyUtility",
  description:
    "The terms for using TinyUtility's free browser-based tools — what's expected of you, what TinyUtility does and doesn't guarantee, and how the site is licensed.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="px-6 pt-16 pb-10 lg:px-8 lg:pt-24 lg:pb-12">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Legal</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Straightforward terms for using an independent, free utility website — not a
              corporate legal agreement.
            </p>
            <p className="mt-4 text-sm text-slate-500">Last updated: {lastUpdated}</p>
          </div>
        </section>

        <section className="px-6 pb-20 lg:px-8 lg:pb-28">
          <div className="mx-auto max-w-3xl space-y-12">
            <LegalSection title="Acceptance of Terms">
              <p>
                By using tinyutility.space (&quot;TinyUtility&quot;), you agree to these Terms of
                Service. If you don&apos;t agree with them, please don&apos;t use the site.
              </p>
            </LegalSection>

            <LegalSection title="About TinyUtility">
              <p>
                TinyUtility is an independent, free, browser-based collection of utility tools,
                created and maintained by Anushka Kar. It is not a registered company, and these
                Terms should be read in that context — terms for using a small independent
                project&apos;s website, not a multinational corporation&apos;s agreement.
              </p>
            </LegalSection>

            <LegalSection title="Use of the Website">
              <p>You may use TinyUtility for personal or commercial purposes, free of charge. You agree not to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>attempt to disrupt, overload, or interfere with the website or its tools,</li>
                <li>attempt to gain unauthorized access to any part of TinyUtility&apos;s systems,</li>
                <li>use the site to violate any applicable law, or</li>
                <li>use automated tools to scrape or abuse the site in a way that degrades it for other users.</li>
              </ul>
            </LegalSection>

            <LegalSection title="Tool Usage">
              <p>
                TinyUtility&apos;s tools — Image Compressor, Image Converter, Image to PDF, PDF
                Merger, PDF Compressor, Word Counter, Password Generator, QR Code Generator, and
                JSON Formatter — are provided as-is, free of charge. Where a tool processes files
                or text, that happens in your own browser using your own device.
              </p>
              <p>TinyUtility does not guarantee:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  perfect or lossless output for every file — image and PDF compression involve a
                  real quality/size trade-off, and results depend on the input file,
                </li>
                <li>that every input file, format, or edge case is supported,</li>
                <li>
                  that a generated file (a compressed image, a merged PDF, a downloaded QR code)
                  is fit for every possible downstream use, or
                </li>
                <li>that the tools will always be available without interruption.</li>
              </ul>
              <p>
                You&apos;re responsible for checking a tool&apos;s output — for example, a merged
                PDF&apos;s page order, or a compressed image&apos;s quality — before relying on
                it for something important.
              </p>
            </LegalSection>

            <LegalSection title="User Responsibilities">
              <p>You&apos;re responsible for:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>the files, text, and content you choose to process using TinyUtility&apos;s tools,</li>
                <li>making sure you actually have the right to process that content,</li>
                <li>reviewing generated output before relying on it, and</li>
                <li>complying with any laws or third-party terms that apply to your own use of the site.</li>
              </ul>
              <p>
                TinyUtility does not review, moderate, or have access to the content you process
                — that processing happens locally in your browser rather than passing through a
                TinyUtility server.
              </p>
            </LegalSection>

            <LegalSection title="Intellectual Property">
              <p>
                TinyUtility&apos;s branding, name, logo, website design, and original content
                belong to TinyUtility / Anushka Kar, except where a third party&apos;s rights
                apply (for example, the open-source libraries the tools are built on). Using the
                site doesn&apos;t give you any ownership over TinyUtility&apos;s branding or code.
              </p>
              <p>
                You retain all rights to the files, text, and content you process using
                TinyUtility&apos;s tools. TinyUtility claims no ownership over your content — and
                since files are processed locally in your browser rather than uploaded,
                TinyUtility generally never has a copy of them to begin with.
              </p>
            </LegalSection>

            <LegalSection title="Third-Party Services and Links">
              <p>
                TinyUtility links to external services and sites, including Buy Me a Coffee (for
                optional support), X, a personal website, and TinyUtility Hub (a separate,
                related property at hub.tinyutility.space). These are governed by their own
                terms and policies, not TinyUtility&apos;s. TinyUtility doesn&apos;t control, and
                isn&apos;t responsible for, the content, availability, or practices of those
                external sites.
              </p>
            </LegalSection>

            <LegalSection title="Availability and Changes">
              <p>
                TinyUtility is a small, independently maintained project. Tools, pages, and
                features may be changed, updated, added, or removed at any time, and the site may
                occasionally be unavailable (for maintenance, hosting issues, or other reasons).
                TinyUtility doesn&apos;t promise a specific uptime guarantee.
              </p>
            </LegalSection>

            <LegalSection title="Disclaimer">
              <p>
                TinyUtility and its tools are provided &quot;as is&quot; and &quot;as
                available,&quot; without warranties of any kind, express or implied — including
                any warranty that the tools will be error-free, uninterrupted, or fit for a
                particular purpose. You use TinyUtility&apos;s tools at your own discretion and
                risk.
              </p>
            </LegalSection>

            <LegalSection title="Limitation of Liability">
              <p>
                To the fullest extent permitted by applicable law, TinyUtility (and its creator)
                won&apos;t be liable for indirect, incidental, or consequential damages arising
                from your use of, or inability to use, the site or its tools — including, for
                example, data loss, lost time, or issues with a file you processed using a
                TinyUtility tool. As a free, independently maintained project, this reflects that
                scale rather than an attempt to avoid reasonable responsibility.
              </p>
            </LegalSection>

            <LegalSection title="Indemnification">
              <p>
                By using TinyUtility, you agree not to hold TinyUtility or its creator
                responsible for claims arising from your own misuse of the site or violation of
                these Terms — for example, processing content you didn&apos;t have the right to
                process.
              </p>
            </LegalSection>

            <LegalSection title="Changes to these Terms">
              <p>
                These Terms may be updated as TinyUtility changes. The &quot;Last updated&quot;
                date at the top of this page reflects the latest revision. Continuing to use
                TinyUtility after changes are posted means you accept the updated Terms.
              </p>
            </LegalSection>

            <LegalSection title="Contact">
              <p>
                Questions about these Terms can be sent to{" "}
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
