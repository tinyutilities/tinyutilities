"use client";

import { useMemo, useState } from "react";
import { CategoryCard } from "@/components/tools/category-card";
import { SearchBar } from "@/components/tools/search-bar";
import { ToolCard } from "@/components/tools/tool-card";
import type { Tool, ToolCategory } from "@/features/tools/tool-data";

type ToolsDirectoryProps = {
  categories: ToolCategory[];
  tools: Tool[];
};

export function ToolsDirectory({ categories, tools }: ToolsDirectoryProps) {
  const [query, setQuery] = useState("");

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return tools;
    }

    return tools.filter((tool) => {
      const searchableText = `${tool.title} ${tool.description} ${tool.category}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [query, tools]);

  return (
    <div className="space-y-16">
      <section aria-labelledby="tool-search">
        <h2 className="sr-only" id="tool-search">
          Search tools
        </h2>
        <SearchBar onChange={setQuery} value={query} />
      </section>

      <section aria-labelledby="tool-categories">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Categories
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Browse by workflow
            </h2>
          </div>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard category={category} key={category.slug} />
          ))}
        </div>
      </section>

      <section aria-labelledby="all-tools">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              All Tools
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {filteredTools.length} available tools
            </h2>
          </div>
          {query ? (
            <p className="text-sm text-slate-400">
              Filtering by <span className="text-slate-200">{query}</span>
            </p>
          ) : null}
        </div>

        {filteredTools.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">
            No tools match your search.
          </div>
        )}
      </section>
    </div>
  );
}
