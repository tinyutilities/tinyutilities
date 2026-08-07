"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryCard } from "@/components/tools/category-card";
import { SearchBar } from "@/components/tools/search-bar";
import { ToolCard } from "@/components/tools/tool-card";
import { ToolIcon } from "@/components/tools/tool-icon";
import { fuzzyScore } from "@/lib/fuzzy-match";
import { recordToolUsage, useToolUsage } from "@/lib/use-tool-usage";
import type { Tool, ToolCategory } from "@/features/tools/tool-data";

type ToolsDirectoryProps = {
  categories: ToolCategory[];
  tools: Tool[];
};

const MAX_RECENT_TOOLS = 4;

function searchFields(tool: Tool): string[] {
  return [tool.title, tool.description, tool.blurb, tool.category, ...(tool.keywords ?? [])];
}

export function ToolsDirectory({ categories, tools }: ToolsDirectoryProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { recentSlugs, countBySlug } = useToolUsage();

  const byUsageThenName = useMemo(
    () => (a: Tool, b: Tool) => {
      const usageDiff = countBySlug(b.slug) - countBySlug(a.slug);
      return usageDiff !== 0 ? usageDiff : a.title.localeCompare(b.title);
    },
    [countBySlug],
  );

  const filteredTools = useMemo(() => {
    const trimmedQuery = query.trim();

    const inCategory = tools.filter(
      (tool) => !activeCategory || tool.category === activeCategory,
    );

    if (!trimmedQuery) {
      return [...inCategory].sort(byUsageThenName);
    }

    return inCategory
      .map((tool) => ({ tool, score: fuzzyScore(trimmedQuery, searchFields(tool)) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || countBySlug(b.tool.slug) - countBySlug(a.tool.slug))
      .map((entry) => entry.tool);
  }, [activeCategory, byUsageThenName, countBySlug, query, tools]);

  const recentTools = useMemo(
    () =>
      recentSlugs
        .map((slug) => tools.find((tool) => tool.slug === slug))
        .filter((tool): tool is Tool => Boolean(tool))
        .slice(0, MAX_RECENT_TOOLS),
    [recentSlugs, tools],
  );

  const groupedTools = useMemo(() => {
    if (query.trim()) return null;

    return categories
      .filter((category) => !activeCategory || category.title === activeCategory)
      .map((category) => ({
        category,
        tools: filteredTools.filter((tool) => tool.category === category.title),
      }))
      .filter((group) => group.tools.length > 0);
  }, [activeCategory, categories, filteredTools, query]);

  const showRecent = recentTools.length > 0 && !query.trim();

  return (
    <div className="space-y-6">
      <section aria-labelledby="tool-search">
        <h2 className="sr-only" id="tool-search">
          Search tools
        </h2>
        <SearchBar onChange={setQuery} value={query} />
      </section>

      {showRecent ? (
        <section aria-labelledby="recent-tools">
          <h2
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
            id="recent-tools"
          >
            Recently used
          </h2>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {recentTools.map((tool) => (
              <Link
                className="group flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-4 transition hover:border-cyan-300/40 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816]"
                href={`/tools/${tool.slug}`}
                key={tool.slug}
                onClick={() => recordToolUsage(tool.slug)}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600/25 via-cyan-500/20 to-teal-400/20 text-cyan-200 ring-1 ring-white/10">
                  <ToolIcon className="size-3.5 fill-none stroke-current stroke-2" icon={tool.icon} />
                </span>
                <span className="whitespace-nowrap text-xs font-medium text-slate-200 group-hover:text-white">
                  {tool.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="tool-categories">
        <h2 className="sr-only" id="tool-categories">
          Browse by category
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <CategoryCard
            active={activeCategory === null}
            category={{
              title: "All",
              description: "",
              slug: "all",
              toolCount: tools.length,
            }}
            onSelect={() => setActiveCategory(null)}
          />
          {categories.map((category) => (
            <CategoryCard
              active={activeCategory === category.title}
              category={category}
              key={category.slug}
              onSelect={() =>
                setActiveCategory((current) =>
                  current === category.title ? null : category.title,
                )
              }
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="all-tools">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" id="all-tools">
            {query ? `${filteredTools.length} results` : `${filteredTools.length} tools`}
          </h2>
          {query ? (
            <p className="truncate text-sm text-slate-400">
              for <span className="text-slate-200">&ldquo;{query}&rdquo;</span>
            </p>
          ) : null}
        </div>

        {filteredTools.length === 0 ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">
            No tools match your search.
          </div>
        ) : groupedTools ? (
          <div className="mt-4 space-y-7">
            {groupedTools.map(({ category, tools: groupTools }) => (
              <div key={category.slug}>
                <h3 className="text-sm font-semibold text-slate-200">{category.title}</h3>
                <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {groupTools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
