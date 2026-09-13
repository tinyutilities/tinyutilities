import { FeatureGrid } from "@/components/landing/feature-grid";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { PopularTools } from "@/components/landing/popular-tools";
import { X_URL } from "@/config/external-links";
import { absoluteUrl, createSeoMetadata, siteName, siteUrl } from "@/lib/seo";

export const metadata = createSeoMetadata({
  title: "TinyUtility | Free Online Tools",
  description:
    "Free, privacy-first online utilities for images, PDFs, text, developers, and everyday productivity.",
  path: "/",
});

// Represents the site/entity itself once, on the homepage only — not repeated on every page.
// Every field here is a plain fact (real URL, real logo, real X profile); no aggregate rating,
// review count, or SearchAction is included since none of those exist on the actual site.
const organizationStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
      logo: absoluteUrl("/brand/TinyUtilities_icon.jpeg"),
      sameAs: [X_URL],
    },
    {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
  ],
};

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
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        type="application/ld+json"
      />
    </>
  );
}
