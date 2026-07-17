import type { Metadata } from "next";

export const siteUrl = "https://tinyutility.space";
export const siteName = "TinyUtility";
export const defaultThemeColor = "#060816";

type SeoMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
};

export function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, siteUrl).toString();
}

export function createSeoMetadata({
  title,
  description,
  path,
  keywords,
}: SeoMetadataOptions): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      siteName,
      type: "website",
      url,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    other: {
      "twitter:url": url,
    },
  };
}
