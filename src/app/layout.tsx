import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { defaultThemeColor, siteName, siteUrl } from "@/lib/seo";

// A safety-net default — every real page sets its own metadata via `createSeoMetadata`, but
// this is what search engines/social crawlers would see for a route that doesn't (or before
// hydration). `metadataBase` is required for the relative Open Graph/Twitter image URLs used
// throughout the site to resolve to absolute https://tinyutility.space URLs.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${siteName} | Free Online Tools`,
  description:
    "Free, privacy-first browser tools for images, PDFs, and text. Files are processed on your device — nothing is uploaded.",
};

export const viewport: Viewport = {
  themeColor: defaultThemeColor,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
