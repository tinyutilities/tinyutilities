"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Tool UIs for the registry-driven page path (see `tool-page-content.ts`).
 *
 * This file is deliberately a Client Component module: `next/dynamic` only code-splits when it is
 * called from client code. Called from the Server Component page, every tool UI is pulled into the
 * one `/tools/[slug]` page bundle that all tool pages share (verified: that grew the route by
 * ~20 kB for 7 tools). Here each import() becomes its own chunk, downloaded only by that tool's
 * page. The component is still rendered into the static HTML at build time, so SEO and the
 * no-JavaScript first paint are unaffected.
 */
const toolComponents: Record<string, ComponentType> = {
  "image-metadata": dynamic(() => import("./image-metadata/image-metadata-tool").then((module) => module.ImageMetadataTool)),
  "favicon-generator": dynamic(() => import("./favicon-generator/favicon-generator-tool").then((module) => module.FaviconGeneratorTool)),
  "image-palette": dynamic(() => import("./image-palette/image-palette-tool").then((module) => module.ImagePaletteTool)),
  "audio-reverse": dynamic(() => import("./audio-reverse/audio-reverse-tool").then((module) => module.AudioReverseTool)),
  "audio-fade": dynamic(() => import("./audio-fade/audio-fade-tool").then((module) => module.AudioFadeTool)),
  "yaml-formatter": dynamic(() => import("./yaml-formatter/yaml-formatter-tool").then((module) => module.YamlFormatterTool)),
  "sql-formatter": dynamic(() => import("./sql-formatter/sql-formatter-tool").then((module) => module.SqlFormatterTool)),
  "markdown-editor": dynamic(() => import("./markdown-editor/markdown-editor-tool").then((module) => module.MarkdownEditorTool)),
  "pdf-to-images": dynamic(() => import("./pdf-to-images/pdf-to-images-tool").then((module) => module.PdfToImagesTool)),
  "pdf-page-numbers": dynamic(() => import("./pdf-page-numbers/pdf-page-numbers-tool").then((module) => module.PdfPageNumbersTool)),
  "pdf-watermark": dynamic(() => import("./pdf-watermark/pdf-watermark-tool").then((module) => module.PdfWatermarkTool)),
  "base64-encoder-decoder": dynamic(() => import("./base64/base64-tool").then((module) => module.Base64Tool)),
  "text-case-converter": dynamic(() =>
    import("./text-case-converter/text-case-converter-tool").then((module) => module.TextCaseConverterTool),
  ),
  "text-cleaner-line-sorter": dynamic(() =>
    import("./text-cleaner-line-sorter/text-cleaner-line-sorter-tool").then((module) => module.TextCleanerLineSorterTool),
  ),
  "hash-generator": dynamic(() => import("./hash-generator/hash-generator-tool").then((module) => module.HashGeneratorTool)),
  "jwt-decoder": dynamic(() => import("./jwt-decoder/jwt-decoder-tool").then((module) => module.JwtDecoderTool)),
  "color-converter": dynamic(() => import("./color-converter/color-converter-tool").then((module) => module.ColorConverterTool)),
  "json-csv-converter": dynamic(() =>
    import("./json-csv-converter/json-csv-converter-tool").then((module) => module.JsonCsvConverterTool),
  ),
};

export function RegisteredTool({ slug }: { slug: string }) {
  const Tool = toolComponents[slug];

  if (!Tool) {
    throw new Error(`No tool component is registered for "${slug}" in tool-components.tsx.`);
  }

  return <Tool />;
}
