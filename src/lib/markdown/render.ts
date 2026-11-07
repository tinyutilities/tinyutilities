/**
 * Markdown → sanitized HTML. `marked` (MIT) turns Markdown into HTML, and DOMPurify
 * (MPL-2.0 OR Apache-2.0) then removes everything that could run code or load content, because
 * Markdown allows raw HTML and the input may come from anywhere. Nothing from `marked` is ever
 * returned or displayed without passing through the sanitizer.
 *
 * Both libraries are passed in so the browser can load them lazily and tests can use them directly.
 * Needs a DOM (a browser, or jsdom in tests) because DOMPurify works on a parsed document.
 */

type MarkedModule = typeof import("marked");
type Purifier = import("dompurify").DOMPurify;

export type MarkdownOptions = {
  /** GitHub Flavored Markdown: tables, strikethrough, task lists, autolinks. */
  gfm: boolean;
  /** Treat a single line break inside a paragraph as a <br>. */
  breaks: boolean;
  /** Allow images that load from other websites. Off by default: loading one tells that site you are viewing this page. */
  allowRemoteImages: boolean;
};

export const defaultMarkdownOptions: MarkdownOptions = { gfm: true, breaks: false, allowRemoteImages: false };

/** Longest input rendered. Parsing and sanitizing run on the main thread, so very large input would freeze the tab. */
export const maxMarkdownChars = 1_000_000;

export type MarkdownResult =
  | { ok: true; html: string; blockedImages: number }
  | { ok: false; error: string };

const forbiddenTags = ["style", "form", "button", "textarea", "select", "option", "iframe", "frame", "frameset", "object", "embed", "link", "meta", "base", "script", "noscript", "template", "dialog"];

export function renderMarkdown(
  marked: MarkedModule,
  purify: Purifier,
  source: string,
  options: MarkdownOptions = defaultMarkdownOptions,
): MarkdownResult {
  if (source.length > maxMarkdownChars) {
    return { ok: false, error: `This document is over ${maxMarkdownChars.toLocaleString()} characters, which is too large to preview safely in the browser.` };
  }

  let raw: string;

  try {
    raw = marked.parse(source, { gfm: options.gfm, breaks: options.breaks, async: false }) as string;
  } catch {
    return { ok: false, error: "This Markdown could not be parsed." };
  }

  let blockedImages = 0;

  purify.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element)) return;

    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }

    if (node.tagName === "INPUT") {
      // Only the disabled checkboxes GFM task lists produce are allowed; nothing is interactive.
      if (node.getAttribute("type") !== "checkbox") {
        node.remove();
        return;
      }

      node.setAttribute("disabled", "");
    }

    if (node.tagName === "IMG") {
      const src = (node.getAttribute("src") ?? "").trim();
      // Only embedded raster images are always allowed (no network request, and an SVG can never
      // be smuggled in this way). Web images need the user's opt-in; relative paths point nowhere.
      const isEmbeddedRaster = /^data:image\/(png|jpe?g|gif|webp|avif|bmp);/i.test(src);
      const isWebImage = /^https?:\/\//i.test(src);

      if (!isEmbeddedRaster && !(options.allowRemoteImages && isWebImage)) {
        blockedImages += 1;
        const placeholder = node.ownerDocument.createElement("span");
        placeholder.setAttribute("data-blocked-image", "true");
        placeholder.textContent = `[Image not loaded${node.getAttribute("alt") ? `: ${node.getAttribute("alt")}` : ""}]`;
        node.replaceWith(placeholder);
      }
    }
  });

  try {
    const html = purify.sanitize(raw, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: forbiddenTags,
      FORBID_ATTR: ["style", "srcset", "formaction", "action", "background", "ping"],
      ADD_TAGS: ["input"],
      ADD_ATTR: ["checked", "disabled", "type", "target", "rel"],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: true,
    });

    return { ok: true, html, blockedImages };
  } finally {
    purify.removeHook("afterSanitizeAttributes");
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A complete HTML page around already-sanitized body HTML, with small built-in styling and no scripts. */
export function buildStandaloneHtml(title: string, sanitizedBodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#1f2430}
pre,code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
pre{background:#f4f5f8;padding:1rem;overflow:auto;border-radius:.5rem}
code{background:#f4f5f8;padding:.1rem .3rem;border-radius:.25rem}
pre code{background:none;padding:0}
blockquote{margin:1rem 0;padding:.1rem 1rem;border-left:.25rem solid #cfd3dc;color:#4a5160}
table{border-collapse:collapse}th,td{border:1px solid #cfd3dc;padding:.4rem .7rem}
img{max-width:100%}a{color:#0b6bcb}
</style>
</head>
<body>
${sanitizedBodyHtml}
</body>
</html>
`;
}
