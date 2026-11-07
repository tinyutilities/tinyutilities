import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { getRelatedTools, toolCategories, tools } from "./tool-data";
import { toolPageContent } from "./tool-page-content";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const pageSource = read("src/app/tools/[slug]/page.tsx");
const componentsSource = read("src/features/tools/tool-components.tsx");
const iconSource = read("src/components/tools/tool-icon.tsx");
const landingSource = read("src/components/landing/landing-data.ts");

const slugs = tools.map((tool) => tool.slug);

describe("tool registry", () => {
  it("has unique, kebab-case slugs and unique titles", () => {
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(tools.map((tool) => tool.title)).size).toBe(tools.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("gives every tool the required fields", () => {
    for (const tool of tools) {
      expect(tool.title.trim(), tool.slug).not.toBe("");
      expect(tool.description.trim(), tool.slug).not.toBe("");
      expect(tool.blurb.trim(), tool.slug).not.toBe("");
    }
  });

  it("assigns every tool to an existing category", () => {
    const titles = new Set(toolCategories.map((category) => category.title));
    for (const tool of tools) expect(titles.has(tool.category), `${tool.slug} → ${tool.category}`).toBe(true);
  });

  it("derives category counts from the registry and leaves no category empty", () => {
    for (const category of toolCategories) {
      const actual = tools.filter((tool) => tool.category === category.title).length;
      expect(category.toolCount, category.title).toBe(actual);
      expect(actual, category.title).toBeGreaterThan(0);
    }
    expect(toolCategories.reduce((sum, category) => sum + category.toolCount, 0)).toBe(tools.length);
  });

  it("uses an icon that the icon map can render", () => {
    const mapped = new Set(Array.from(iconSource.matchAll(/^\s+(\w+): \w+Icon,$/gm), (match) => match[1]));
    for (const tool of tools) expect(mapped.has(tool.icon), `${tool.slug} → ${tool.icon}`).toBe(true);
  });

  it("returns valid, distinct related tools for every tool", () => {
    for (const tool of tools) {
      const related = getRelatedTools(tool.slug);
      expect(related.length, tool.slug).toBeGreaterThan(0);
      expect(related.map((entry) => entry.slug)).not.toContain(tool.slug);
      expect(new Set(related.map((entry) => entry.slug)).size).toBe(related.length);
    }
  });
});

describe("route wiring", () => {
  it("wires every tool either through the content registry or a hand-written page block", () => {
    for (const slug of slugs) {
      if (slug in toolPageContent) {
        expect(componentsSource, `${slug} component`).toContain(`"${slug}":`);
        continue;
      }

      expect(pageSource, `${slug} metadata path`).toContain(`path: "/tools/${slug}"`);
      const references = pageSource.split(`slug === "${slug}"`).length - 1;
      // metadata branch, FAQ branch and the render flag
      expect(references, `${slug} references in page.tsx`).toBeGreaterThanOrEqual(3);
    }
  });

  it("has no content or component entries for tools that are not registered", () => {
    for (const slug of Object.keys(toolPageContent)) expect(slugs, slug).toContain(slug);
    for (const slug of Array.from(componentsSource.matchAll(/^\s+"([a-z0-9-]+)": dynamic/gm), (match) => match[1])) {
      expect(slugs, slug).toContain(slug);
      expect(toolPageContent, slug).toHaveProperty(slug);
    }
  });

  it("includes every tool, and only registered tools, in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    const toolUrls = urls.filter((url) => url.includes("/tools/")).map((url) => url.split("/tools/")[1]);
    expect([...toolUrls].sort()).toEqual([...slugs].sort());
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("has a homepage card description for every category", () => {
    for (const category of toolCategories) expect(landingSource, category.slug).toMatch(new RegExp(`^\\s+${category.slug}:`, "m"));
  });
});

describe("registry-driven page content", () => {
  const entries = Object.entries(toolPageContent);

  it("has unique SEO titles and sensible metadata lengths", () => {
    expect(new Set(entries.map(([, content]) => content.seoTitle)).size).toBe(entries.length);
    for (const [slug, content] of entries) {
      expect(content.seoTitle, slug).toMatch(/\| TinyUtility$/);
      expect(content.seoTitle.length, `${slug} title`).toBeLessThanOrEqual(70);
      expect(content.seoDescription.length, `${slug} description`).toBeGreaterThanOrEqual(80);
      expect(content.seoDescription.length, `${slug} description`).toBeLessThanOrEqual(175);
    }
  });

  it("has three steps, three use cases and a FAQ, with no empty text", () => {
    for (const [slug, content] of entries) {
      expect(content.steps, slug).toHaveLength(3);
      expect(content.useCases, slug).toHaveLength(3);
      expect(content.faq.length, slug).toBeGreaterThanOrEqual(3);
      for (const item of [...content.steps, ...content.useCases]) {
        expect(item.title.trim() && item.description.trim(), slug).toBeTruthy();
      }
      for (const item of content.faq) expect(item.question.trim() && item.answer.trim(), slug).toBeTruthy();
    }
  });

  it("links only to tools that exist", () => {
    for (const [slug, content] of entries) {
      for (const segment of content.intro) {
        if (typeof segment === "string") continue;
        expect(segment.href, slug).toMatch(/^\/tools\/[a-z0-9-]+$/);
        expect(slugs, `${slug} links to ${segment.href}`).toContain(segment.href.replace("/tools/", ""));
      }
    }
  });
});

describe("PDF.js worker", () => {
  it("is the exact worker shipped with the installed pdfjs-dist version", () => {
    const hash = (path: string) => createHash("sha256").update(readFileSync(join(root, path))).digest("hex");
    // A mismatch makes PDF.js refuse to start ("API version does not match Worker version").
    expect(hash("public/pdf.worker.min.mjs")).toBe(hash("node_modules/pdfjs-dist/build/pdf.worker.min.mjs"));
  });
});
