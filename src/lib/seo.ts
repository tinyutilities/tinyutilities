import type { Metadata } from "next";

export const siteUrl = "https://tinyutility.space";
export const siteName = "TinyUtility";
export const defaultThemeColor = "#060816";

type SeoMetadataOptions = {
  title: string;
  description: string;
  path: string;
};

export function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, siteUrl).toString();
}

// A single shared Open Graph image (see src/app/opengraph-image.tsx) rather than a bespoke
// image per page — Google/social crawlers don't need a unique image per tool, and one strong,
// on-brand asset is easier to keep accurate than dozens of near-duplicate ones.
const ogImage = { url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: siteName };

export function createSeoMetadata({ title, description, path }: SeoMetadataOptions): Metadata {
  const url = absoluteUrl(path);

  // No `keywords` field: the meta keywords tag has had no effect on Google ranking or snippets
  // for well over a decade, and Google's own guidance treats stuffing one as a spam signal
  // rather than a benefit — so title/description/body copy carry the actual search-intent
  // targeting instead (see docs/SEO_AUDIT.md for the per-page intent this content targets).
  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      siteName,
      type: "website",
      url,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}
