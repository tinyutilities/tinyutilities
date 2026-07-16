import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { ToolsDirectory } from "@/components/tools/tools-directory";
import { toolCategories, tools } from "@/features/tools/tool-data";

export const metadata = {
  title: "Tools | TinyUtility",
  description: "Browse free online utilities for images, PDFs, text, developers, and productivity.",
};

export default function ToolsPage() {
  return (
    <>
      <Navbar />
      <main className="px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Tools
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Find the right utility fast.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Search the growing TinyUtility catalog and open any tool page from one place.
            </p>
          </div>
          <div className="mt-12">
            <ToolsDirectory categories={toolCategories} tools={tools} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
