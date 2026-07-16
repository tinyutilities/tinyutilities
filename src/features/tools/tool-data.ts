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
  slug: string;
  category: string;
  icon: ToolIconName;
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
    toolCount: 2,
  },
  {
    title: "Developer Tools",
    description: "Format, generate, and inspect common developer assets.",
    slug: "developer",
    toolCount: 2,
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
    slug: "image-compressor",
    category: "Image Tools",
    icon: "image",
  },
  {
    title: "Image Converter",
    description: "Convert images between common formats.",
    slug: "image-converter",
    category: "Image Tools",
    icon: "convert",
  },
  {
    title: "Image to PDF",
    description: "Turn image files into a clean PDF document.",
    slug: "image-to-pdf",
    category: "PDF Tools",
    icon: "pdf",
  },
  {
    title: "PDF Merger",
    description: "Combine multiple PDF files into one document.",
    slug: "pdf-merger",
    category: "PDF Tools",
    icon: "merge",
  },
  {
    title: "Password Generator",
    description: "Create strong passwords for safer accounts.",
    slug: "password-generator",
    category: "Developer Tools",
    icon: "shield",
  },
  {
    title: "QR Generator",
    description: "Generate QR codes for links and simple text.",
    slug: "qr-generator",
    category: "Developer Tools",
    icon: "qr",
  },
  {
    title: "JSON Formatter",
    description: "Format JSON so it is easier to read and debug.",
    slug: "json-formatter",
    category: "Developer Tools",
    icon: "code",
  },
  {
    title: "Word Counter",
    description: "Count words, characters, and basic text metrics.",
    slug: "word-counter",
    category: "Text Tools",
    icon: "text",
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
