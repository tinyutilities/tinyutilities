// @vitest-environment jsdom
import DOMPurify from "dompurify";
import * as marked from "marked";
import { describe, expect, it } from "vitest";
import { buildStandaloneHtml, defaultMarkdownOptions, maxMarkdownChars, renderMarkdown, type MarkdownOptions } from "./render";

function render(source: string, overrides: Partial<MarkdownOptions> = {}) {
  const result = renderMarkdown(marked, DOMPurify, source, { ...defaultMarkdownOptions, ...overrides });
  if (!result.ok) throw new Error(result.error);
  return result;
}

/** Parses HTML like a browser would and lists anything that could execute code or load active content. */
function findDanger(html: string): string[] {
  const container = document.createElement("div");
  container.innerHTML = html;
  const problems: string[] = [];
  const activeTags = ["script", "iframe", "frame", "frameset", "object", "embed", "style", "form", "link", "meta", "base", "svg", "math", "template", "noscript"];

  for (const tag of activeTags) {
    if (container.querySelector(tag)) problems.push(`<${tag}> element`);
  }

  for (const element of Array.from(container.querySelectorAll("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) problems.push(`${attribute.name} on <${element.tagName.toLowerCase()}>`);
      if (attribute.name === "style") problems.push("style attribute");
      if (/^(href|src|xlink:href|action|formaction)$/i.test(attribute.name)) {
        const value = attribute.value.replace(/[\u0000- ]/g, "").toLowerCase();
        if (/^(javascript|vbscript):/.test(value)) problems.push(`${attribute.name}=${value}`);
        if (/^data:(?!image\/(png|jpe?g|gif|webp|avif|bmp);)/.test(value)) problems.push(`${attribute.name}=${value.slice(0, 30)}`);
      }
    }
  }

  return problems;
}

describe("XSS payloads are neutralised", () => {
  const payloads: Array<[string, string]> = [
    ["script tag", "<script>alert(1)</script>"],
    ["script in a paragraph", "hello <script>alert(1)</script> world"],
    ["img onerror", "<img src=x onerror=alert(1)>"],
    ["img onerror, quoted", '<img src="x" onerror="alert(document.cookie)">'],
    ["javascript: link", "[click me](javascript:alert(1))"],
    ["mixed-case javascript: link", "[click me](JaVaScRiPt:alert(1))"],
    ["javascript: link with leading space", "[click me](  javascript:alert(1))"],
    ["entity-encoded javascript: link", "[click me](&#106;avascript:alert(1))"],
    ["tab inside javascript:", '<a href="jav&#x09;ascript:alert(1)">x</a>'],
    ["raw javascript: anchor", '<a href="javascript:alert(1)">x</a>'],
    ["vbscript: link", '<a href="vbscript:msgbox(1)">x</a>'],
    ["data: html link", '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>'],
    ["svg onload", "<svg onload=alert(1)><circle r=5 /></svg>"],
    ["svg with script", "<svg><script>alert(1)</script></svg>"],
    ["math/mglyph mXSS", '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;/mglyph&gt;&lt;img src=1 onerror=alert(1)&gt;">'],
    ["iframe", '<iframe src="https://evil.example"></iframe>'],
    ["iframe srcdoc", '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
    ["object", '<object data="https://evil.example/x.swf"></object>'],
    ["embed", '<embed src="https://evil.example/x.swf">'],
    ["style element", "<style>body{display:none}</style>"],
    ["style attribute with url()", '<div style="background:url(javascript:alert(1))">x</div>'],
    ["form with action", '<form action="https://evil.example"><input name=q><button>Go</button></form>'],
    ["autofocus input", "<input autofocus onfocus=alert(1)>"],
    ["meta refresh", '<meta http-equiv="refresh" content="0;url=https://evil.example">'],
    ["link stylesheet", '<link rel="stylesheet" href="https://evil.example/x.css">'],
    ["base tag", '<base href="https://evil.example/">'],
    ["details ontoggle", "<details open ontoggle=alert(1)>x</details>"],
    ["onclick on allowed tag", '<b onclick="alert(1)">bold</b>'],
    ["markdown image with javascript: src", "![x](javascript:alert(1))"],
    ["image title breaking out", '![x](https://example.com/a.png "t\\" onerror=\\"alert(1)")'],
    ["link title breaking out", '[x](https://example.com "t\\" onmouseover=\\"alert(1)")'],
    ["comment trick", "<!--><script>alert(1)</script>-->"],
    ["noscript trick", '<noscript><p title="</noscript><img src=x onerror=alert(1)>">'],
    ["srcset", '<img srcset="x onerror=alert(1) 1x" src="x">'],
    ["template", "<template><script>alert(1)</script></template>"],
    ["formaction button", '<button formaction="javascript:alert(1)">x</button>'],
  ];

  it.each(payloads)("%s", (_name, payload) => {
    for (const allowRemoteImages of [false, true]) {
      const { html } = render(payload, { allowRemoteImages });
      expect(findDanger(html), html).toEqual([]);
    }
  });

  it("neutralises every payload even when they are all combined in one document", () => {
    const { html } = render(payloads.map(([, payload]) => payload).join("\n\n"), { allowRemoteImages: true });
    expect(findDanger(html), html).toEqual([]);
  });

  it("removes dangerous markup but keeps the surrounding text", () => {
    const { html } = render("before <script>alert(1)</script> after");
    expect(html).toContain("before");
    expect(html).toContain("after");
    expect(html).not.toContain("alert(1)");
  });

  it("keeps safe links and forces them to open safely", () => {
    const { html } = render('[ok](https://example.com) and <a href="https://example.org" target="_self" rel="opener">raw</a> and [mail](mailto:a@example.com)');
    const container = document.createElement("div");
    container.innerHTML = html;
    const anchors = Array.from(container.querySelectorAll("a"));

    expect(anchors.map((anchor) => anchor.getAttribute("href"))).toEqual(["https://example.com", "https://example.org", "mailto:a@example.com"]);
    for (const anchor of anchors) {
      expect(anchor.getAttribute("target")).toBe("_blank");
      expect(anchor.getAttribute("rel")).toBe("noopener noreferrer nofollow");
    }
  });
});

describe("images", () => {
  it("blocks remote images by default and says so", () => {
    const result = render("![A diagram](https://example.com/a.png)");
    expect(result.html).not.toContain("<img");
    expect(result.html).toContain("[Image not loaded: A diagram]");
    expect(result.blockedImages).toBe(1);
  });

  it("allows remote images when the user opts in", () => {
    const result = render("![A diagram](https://example.com/a.png)", { allowRemoteImages: true });
    expect(result.html).toContain('<img src="https://example.com/a.png"');
    expect(result.blockedImages).toBe(0);
  });

  it("shows embedded data: images without a network request", () => {
    const tiny = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const result = render(`![dot](${tiny})`);
    expect(result.html).toContain("<img");
    expect(result.blockedImages).toBe(0);
  });

  it("never allows an SVG data URI as an image source", () => {
    const result = render('![x](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+)', { allowRemoteImages: true });
    expect(findDanger(result.html)).toEqual([]);
  });
});

describe("Markdown features", () => {
  it("renders headings, emphasis, lists, quotes and code", () => {
    const { html } = render("# Title\n\n**bold** *italic* `code`\n\n- a\n- b\n\n1. one\n2. two\n\n> quote\n\n```js\nconst x = 1;\n```");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<pre>");
  });

  it("escapes HTML inside code blocks instead of interpreting it", () => {
    const { html } = render("```html\n<script>alert(1)</script>\n```");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(findDanger(html)).toEqual([]);
  });

  it("renders GFM tables, strikethrough and task lists when GFM is on", () => {
    const { html } = render("| a | b |\n|---|---|\n| 1 | 2 |\n\n~~gone~~\n\n- [x] done\n- [ ] todo");
    expect(html).toContain("<table>");
    expect(html).toContain("<del>gone</del>");
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html.match(/disabled/g)?.length).toBeGreaterThanOrEqual(2);
    expect(findDanger(html)).toEqual([]);
  });

  it("does not render tables when GFM is off", () => {
    const { html } = render("| a | b |\n|---|---|\n| 1 | 2 |", { gfm: false });
    expect(html).not.toContain("<table>");
  });

  it("turns single line breaks into <br> only when asked", () => {
    expect(render("one\ntwo").html).not.toContain("<br>");
    expect(render("one\ntwo", { breaks: true }).html).toContain("<br>");
  });

  it("returns empty output for empty input", () => {
    expect(render("").html.trim()).toBe("");
  });

  it("rejects documents too large to render safely", () => {
    const result = renderMarkdown(marked, DOMPurify, "a".repeat(maxMarkdownChars + 1), defaultMarkdownOptions);
    expect(result.ok).toBe(false);
  });

  it("does not leave hooks behind that would affect later sanitising", () => {
    render("[x](https://example.com)");
    const plain = DOMPurify.sanitize('<a href="https://example.com">x</a>');
    expect(plain).not.toContain("noopener");
  });
});

describe("buildStandaloneHtml", () => {
  it("wraps the body in a complete page with an escaped title and no scripts", () => {
    const page = buildStandaloneHtml('My <doc> & "notes"', "<h1>Hi</h1>");
    expect(page).toContain("<!doctype html>");
    expect(page).toContain("<title>My &lt;doc&gt; &amp; &quot;notes&quot;</title>");
    expect(page).toContain("<h1>Hi</h1>");
    expect(page).not.toMatch(/<script/i);
  });
});
