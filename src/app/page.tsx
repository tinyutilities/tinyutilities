import { FeatureGrid } from "@/components/landing/feature-grid";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { PopularTools } from "@/components/landing/popular-tools";
import { createSeoMetadata } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "TinyUtility",
  description: "Fast, focused browser-based tools for images, PDFs, text, developers, and productivity.",
  path: "/",
});

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FeatureGrid />
        <PopularTools />
      </main>
      <Footer />
    </>
  );
}
