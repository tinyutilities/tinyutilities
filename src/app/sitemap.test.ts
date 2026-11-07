import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { tools } from "@/features/tools/tool-data";
import { siteUrl } from "@/lib/seo";

const execFileSync = vi.fn();

vi.mock("node:child_process", () => ({
  execFileSync: (...args: unknown[]) => execFileSync(...args),
}));

// `sitemap.ts` decides once, at module-load time, whether the checkout is shallow (see its own
// `shallowRepo` module-level constant) — so each scenario below needs a fresh module instance
// via `resetModules` + a dynamic re-import, not just a different mock return value.
async function loadSitemap() {
  vi.resetModules();
  const mod = await import("./sitemap");
  return mod.default;
}

function mockGit(responses: { shallow: string | Error; log?: (paths: string[]) => string | Error }) {
  execFileSync.mockImplementation((cmd: string, args: string[]) => {
    if (args[0] === "rev-parse") {
      if (responses.shallow instanceof Error) throw responses.shallow;
      return responses.shallow;
    }

    if (args[0] === "log") {
      const dashDashIndex = args.indexOf("--");
      const paths = args.slice(dashDashIndex + 1);
      const result = responses.log?.(paths) ?? "";
      if (result instanceof Error) throw result;
      return result;
    }

    throw new Error(`Unexpected git invocation: ${args.join(" ")}`);
  });
}

beforeEach(() => {
  execFileSync.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

describe("sitemap", () => {
  it("omits lastmod for every URL in a shallow checkout, instead of fabricating a shared date", async () => {
    mockGit({ shallow: "true\n" });
    const sitemap = await loadSitemap();

    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.lastModified).toBeUndefined();
    }
    // The shallow check itself only needs to run once per build, not once per URL.
    const shallowCalls = execFileSync.mock.calls.filter(([, args]) => args[0] === "rev-parse");
    expect(shallowCalls).toHaveLength(1);
  });

  it("uses real, distinct per-path git dates when full history is available", async () => {
    mockGit({
      shallow: "false\n",
      log: (paths) =>
        paths[0].includes("pricing") ? "2024-03-01T00:00:00+00:00\n" : "2024-06-15T00:00:00+00:00\n",
    });
    const sitemap = await loadSitemap();

    const entries = sitemap();
    const pricing = entries.find((entry) => entry.url === `${siteUrl}/pricing`);
    const about = entries.find((entry) => entry.url === `${siteUrl}/about`);

    expect(pricing?.lastModified).toEqual(new Date("2024-03-01T00:00:00+00:00"));
    expect(about?.lastModified).toEqual(new Date("2024-06-15T00:00:00+00:00"));
    expect(pricing?.lastModified).not.toEqual(about?.lastModified);
  });

  it("omits lastmod for a path git has no history for, without throwing", async () => {
    mockGit({ shallow: "false\n", log: () => "" });
    const sitemap = await loadSitemap();

    const entries = sitemap();
    for (const entry of entries) {
      expect(entry.lastModified).toBeUndefined();
    }
  });

  it("omits lastmod (rather than crashing the build) if git itself is unavailable", async () => {
    mockGit({
      shallow: new Error("git: command not found"),
      log: () => new Error("git: command not found"),
    });
    const sitemap = await loadSitemap();

    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.lastModified).toBeUndefined();
    }
  });

  it("gives the homepage a URL matching its actual canonical tag — no trailing slash", async () => {
    mockGit({ shallow: "true\n" });
    const sitemap = await loadSitemap();

    const entries = sitemap();
    expect(entries[0].url).toBe(siteUrl);
    expect(entries[0].url).not.toMatch(/\/$/);
  });

  it("includes every one of the 46 registered tools, plus the static pages, with no duplicates", async () => {
    mockGit({ shallow: "true\n" });
    const sitemap = await loadSitemap();

    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(new Set(urls).size).toBe(urls.length);
    expect(entries.length).toBe(8 + tools.length);

    for (const tool of tools) {
      expect(urls).toContain(`${siteUrl}/tools/${tool.slug}`);
    }
  });

  it("produces well-formed absolute https URLs for every entry", async () => {
    mockGit({ shallow: "true\n" });
    const sitemap = await loadSitemap();

    for (const entry of sitemap()) {
      expect(() => new URL(entry.url)).not.toThrow();
      expect(entry.url.startsWith("https://tinyutility.space")).toBe(true);
    }
  });
});
