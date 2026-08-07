import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { ToolsDirectory } from "@/components/tools/tools-directory";
import { toolCategories, tools } from "@/features/tools/tool-data";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "Tools | TinyUtility",
  description: "Browse free online utilities for images, PDFs, text, developers, and productivity.",
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <>
      <Navbar />
      <main className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300 sm:text-sm">
              Tools
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:mt-4 sm:text-4xl lg:text-5xl">
              Find the right utility fast.
            </h1>
            <p className="mt-2 text-base leading-6 text-slate-300 sm:mt-4 sm:text-lg sm:leading-8">
              Search the growing TinyUtility catalog and open any tool page from one place.
            </p>
          </div>
          <div className="mt-6 sm:mt-10">
            <ToolsDirectory categories={toolCategories} tools={tools} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
