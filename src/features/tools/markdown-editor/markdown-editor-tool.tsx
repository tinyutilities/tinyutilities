"use client";

import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import {
  Button,
  ChoiceGroup,
  CheckboxField,
  CopyButton,
  InfoNote,
  Panel,
  PanelLabel,
  PrivacyNote,
  TextArea,
  WarningNote,
} from "@/components/tools/tool-ui";
import { buildDownloadFilename, FilenameField, formatBytes } from "@/components/upload";
import { downloadText } from "@/lib/browser/download";
import { useLazyModule } from "@/lib/browser/use-lazy-module";
import { buildStandaloneHtml, defaultMarkdownOptions, renderMarkdown } from "@/lib/markdown/render";

type View = "split" | "edit" | "preview";

const viewOptions: Array<{ value: View; label: string }> = [
  { value: "split", label: "Side by side" },
  { value: "edit", label: "Editor only" },
  { value: "preview", label: "Preview only" },
];

const sampleMarkdown = `# Welcome to the Markdown editor

Write on the left and see the result on the right. Everything stays in your browser.

## What you can use

- **Bold**, *italic* and ~~strikethrough~~
- [Links](https://tinyutility.space)
- \`inline code\` and fenced code blocks

\`\`\`js
const greeting = "Hello, Markdown!";
console.log(greeting);
\`\`\`

> Block quotes work too.

| Feature | Supported |
| ------- | --------- |
| Tables  | Yes       |
| Tasks   | Yes       |

- [x] Write something
- [ ] Download it
`;

const maxFileBytes = 5 * 1024 * 1024;

// Styles for the rendered HTML. Written as variants on one container so no global CSS is needed.
const previewClasses = [
  "max-w-none break-words text-[0.95rem] leading-7 text-slate-200",
  "[&_h1]:mt-6 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-white first:[&_h1]:mt-0",
  "[&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-white/10 [&_h2]:pb-1 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white",
  "[&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_h4]:mt-4 [&_h4]:font-semibold [&_h4]:text-white",
  "[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1",
  "[&_a]:text-cyan-300 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-cyan-200",
  "[&_blockquote]:mt-3 [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-300/40 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400",
  "[&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre]:mt-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#080b1a] [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:mt-3 [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:border-white/15 [&_th]:bg-white/5 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left",
  "[&_td]:border [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-1.5 [&_hr]:my-6 [&_hr]:border-white/10",
  "[&_img]:mt-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_input]:mr-2 [&_del]:text-slate-500",
].join(" ");

const loadRenderers = () => Promise.all([import("marked"), import("dompurify")]).then(([marked, dompurify]) => ({ marked, purify: dompurify.default }));

export function MarkdownEditorTool() {
  const editorId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { module: renderers, error: loadFailed } = useLazyModule(loadRenderers);

  const [source, setSource] = useState(sampleMarkdown);
  const [view, setView] = useState<View>("split");
  const [gfm, setGfm] = useState(defaultMarkdownOptions.gfm);
  const [breaks, setBreaks] = useState(defaultMarkdownOptions.breaks);
  const [allowRemoteImages, setAllowRemoteImages] = useState(defaultMarkdownOptions.allowRemoteImages);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("TinyUtility-document");

  const deferredSource = useDeferredValue(source);

  const rendered = useMemo(
    () => (renderers ? renderMarkdown(renderers.marked, renderers.purify, deferredSource, { gfm, breaks, allowRemoteImages }) : null),
    [renderers, deferredSource, gfm, breaks, allowRemoteImages],
  );

  const words = source.trim() ? source.trim().split(/\s+/).length : 0;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (file.size > maxFileBytes) {
      setFileMessage(`This file is ${formatBytes(file.size)}. Files are limited to ${formatBytes(maxFileBytes)}.`);
      return;
    }

    try {
      setSource(await file.text());
      setOutputName(file.name.replace(/\.[^.]+$/, "") || "document");
      setFileMessage(`Loaded ${file.name} (${formatBytes(file.size)}).`);
    } catch {
      setFileMessage("This file could not be read as text.");
    }
  };

  const showEditor = view !== "preview";
  const showPreview = view !== "edit";

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your document never leaves your device. It is rendered entirely in your browser.</PrivacyNote>

      <Panel>
        <div className="grid gap-6 sm:grid-cols-2">
          <ChoiceGroup legend="View" onChange={setView} options={viewOptions} value={view} />
          <div className="space-y-3">
            <CheckboxField checked={gfm} hint="Tables, strikethrough, task lists and automatic links" onChange={setGfm}>
              GitHub Flavored Markdown
            </CheckboxField>
            <CheckboxField checked={breaks} hint="Otherwise a single line break is ignored" onChange={setBreaks}>
              Single line breaks become new lines
            </CheckboxField>
            <CheckboxField
              checked={allowRemoteImages}
              hint="Loading an image from another website tells that site you are viewing this page"
              onChange={setAllowRemoteImages}
            >
              Load images from the web
            </CheckboxField>
          </div>
        </div>
      </Panel>

      <div className={`grid grid-cols-1 gap-6 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
        {showEditor ? (
          <Panel className="min-w-0">
            <PanelLabel htmlFor={editorId} meta={`${words.toLocaleString()} words · ${source.length.toLocaleString()} characters`}>
              Markdown
            </PanelLabel>
            <TextArea
              className="min-h-[24rem] lg:min-h-[32rem]"
              id={editorId}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Write Markdown here…"
              value={source}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                className="sr-only"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                tabIndex={-1}
                type="file"
              />
              <Button onClick={() => fileInputRef.current?.click()}>Load from file</Button>
              <Button disabled={!source} onClick={() => setSource("")} variant="danger">
                Clear
              </Button>
              {fileMessage ? (
                <span className="text-xs text-slate-400" role="status">
                  {fileMessage}
                </span>
              ) : null}
            </div>
          </Panel>
        ) : null}

        {showPreview ? (
          <Panel className="min-w-0">
            <PanelLabel meta={rendered?.ok && rendered.blockedImages > 0 ? `${rendered.blockedImages} web image${rendered.blockedImages === 1 ? "" : "s"} not loaded` : undefined}>
              Preview
            </PanelLabel>
            <div
              aria-label="Rendered preview"
              className="mt-3 min-h-[24rem] overflow-auto rounded-2xl border border-white/10 bg-[#080b1a]/70 p-5 lg:max-h-[40rem] lg:min-h-[32rem]"
              role="region"
              tabIndex={0}
            >
              {loadFailed ? (
                <p className="text-sm text-red-300" role="alert">
                  The preview engine could not be loaded. Check your connection and reload the page.
                </p>
              ) : !rendered ? (
                <p className="text-sm text-slate-500" role="status">
                  Loading preview…
                </p>
              ) : !rendered.ok ? (
                <p className="text-sm text-amber-200" role="alert">
                  {rendered.error}
                </p>
              ) : rendered.html.trim() === "" ? (
                <p className="text-sm text-slate-500">Nothing to preview yet.</p>
              ) : (
                // The HTML was produced by marked and then sanitized by DOMPurify in renderMarkdown().
                <div className={previewClasses} dangerouslySetInnerHTML={{ __html: rendered.html }} />
              )}
            </div>
          </Panel>
        ) : null}
      </div>

      <Panel>
        <div className="max-w-md">
          <FilenameField extension="md" label="File name (without extension)" onChange={setOutputName} value={outputName} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CopyButton label="Copy Markdown" text={source} />
          <CopyButton disabled={!rendered?.ok} label="Copy HTML" text={rendered?.ok ? rendered.html : ""} />
          <Button
            disabled={!source}
            onClick={() => downloadText(source, buildDownloadFilename(outputName, "md", "TinyUtility-document"), "text/markdown")}
            variant="primary"
          >
            Download .md
          </Button>
          <Button
            disabled={!rendered?.ok}
            onClick={() => {
              if (rendered?.ok) {
                downloadText(
                  buildStandaloneHtml(outputName || "Document", rendered.html),
                  buildDownloadFilename(outputName, "html", "TinyUtility-document"),
                  "text/html",
                );
              }
            }}
            variant="neutral"
          >
            Download .html
          </Button>
        </div>
      </Panel>

      <WarningNote>
        <strong className="text-white">Safe by design:</strong> Markdown can contain raw HTML, so the preview and exported HTML are cleaned first.
        Scripts, event handlers, frames, forms, styles and <code className="font-mono text-xs">javascript:</code> links are removed, and links
        open in a new tab. Content removed this way simply doesn&apos;t appear.
      </WarningNote>

      <InfoNote>
        Rendering follows the CommonMark specification, plus GitHub Flavored Markdown when enabled. Other extensions (footnotes, math,
        diagrams, front matter, custom containers) are not supported and appear as plain text. Preview is limited to about 1,000,000
        characters.
      </InfoNote>
    </section>
  );
}
