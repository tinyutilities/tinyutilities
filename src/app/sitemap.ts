import type { MetadataRoute } from "next";
import { tools } from "@/features/tools/tool-data";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/tools"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...tools.map((tool) => ({
      url: absoluteUrl(`/tools/${tool.slug}`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
