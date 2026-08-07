export type ToolCategory = {
  title: string;
  description: string;
  slug: string;
  toolCount: number;
};

export type ToolIconName =
  | "code"
  | "convert"
  | "image"
  | "merge"
  | "pdf"
  | "qr"
  | "shield"
  | "text";

export type Tool = {
  title: string;
  description: string;
  /** Very short subtitle used on compact card layouts, e.g. "Compress images". */
  blurb: string;
  slug: string;
  category: string;
  icon: ToolIconName;
  /** Extra search aliases (formats, synonyms) not already in the title/description. */
  keywords?: string[];
};

export const toolCategories: ToolCategory[] = [
  {
    title: "Image Tools",
    description: "Compress, convert, and prepare images for the web.",
    slug: "image",
    toolCount: 3,
  },
  {
    title: "PDF Tools",
    description: "Combine, convert, and organize document workflows.",
    slug: "pdf",
    toolCount: 3,
  },
  {
    title: "Developer Tools",
    description: "Format, generate, and inspect common developer assets.",
    slug: "developer",
    toolCount: 3,
  },
  {
    title: "Text Tools",
    description: "Count, clean, and transform everyday text.",
    slug: "text",
    toolCount: 1,
  },
];

export const tools: Tool[] = [
  {
    title: "Image Compressor",
    description: "Reduce image file size while preserving quality.",
    blurb: "Compress images",
    slug: "image-compressor",
    category: "Image Tools",
    icon: "image",
    keywords: ["compress", "shrink", "optimize", "reduce size"],
  },
  {
    title: "Image Converter",
    description: "Convert JPG, PNG, and WebP images privately in your browser.",
    blurb: "Convert formats",
    slug: "image-converter",
    category: "Image Tools",
    icon: "convert",
    keywords: ["jpg", "jpeg", "png", "webp", "format"],
  },
  {
    title: "Image to PDF",
    description: "Turn image files into a clean PDF document.",
    blurb: "Images to PDF",
    slug: "image-to-pdf",
    category: "PDF Tools",
    icon: "pdf",
    keywords: ["jpg to pdf", "png to pdf", "export"],
  },
  {
    title: "PDF Merger",
    description: "Combine multiple PDF files into one document.",
    blurb: "Merge PDFs",
    slug: "pdf-merger",
    category: "PDF Tools",
    icon: "merge",
    keywords: ["combine", "join", "merge pdf"],
  },
  {
    title: "PDF Compressor",
    description: "Shrink PDF file size by recompressing embedded images and stripping unneeded data.",
    blurb: "Compress PDFs",
    slug: "pdf-compressor",
    category: "PDF Tools",
    icon: "pdf",
    keywords: ["shrink pdf", "reduce pdf size", "optimize pdf", "compress"],
  },
  {
    title: "Password Generator",
    description: "Create strong, random passwords privately in your browser.",
    blurb: "Generate passwords",
    slug: "password-generator",
    category: "Developer Tools",
    icon: "shield",
    keywords: ["strong password", "secure", "random"],
  },
  {
    title: "QR Code Generator",
    description: "Generate QR codes for URLs, text, emails, Wi-Fi credentials, and more.",
    blurb: "Create QR codes",
    slug: "qr-code-generator",
    category: "Developer Tools",
    icon: "qr",
    keywords: ["qr", "barcode", "wifi qr"],
  },
  {
    title: "JSON Formatter",
    description: "Format JSON so it is easier to read and debug.",
    blurb: "Format JSON",
    slug: "json-formatter",
    category: "Developer Tools",
    icon: "code",
    keywords: ["pretty print", "validate", "minify"],
  },
  {
    title: "Word Counter",
    description: "Count words, characters, and basic text metrics.",
    blurb: "Count words",
    slug: "word-counter",
    category: "Text Tools",
    icon: "text",
    keywords: ["character count", "text length"],
  },
];

export function getToolBySlug(slug: string) {
  return tools.find((tool) => tool.slug === slug);
}

export function getRelatedTools(slug: string, limit = 3) {
  const currentTool = getToolBySlug(slug);

  if (!currentTool) {
    return tools.filter((tool) => tool.slug !== slug).slice(0, limit);
  }

  const sameCategory = tools.filter(
    (tool) => tool.category === currentTool.category && tool.slug !== slug,
  );
  const otherTools = tools.filter(
    (tool) => tool.category !== currentTool.category && tool.slug !== slug,
  );

  return [...sameCategory, ...otherTools].slice(0, limit);
}
