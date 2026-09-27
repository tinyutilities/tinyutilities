export type ToolCategory = {
  title: string;
  description: string;
  slug: string;
  toolCount: number;
};

export type ToolIconName =
  | "archive"
  | "audioJoin"
  | "audioSpeed"
  | "audioTrim"
  | "audioVolume"
  | "clean"
  | "code"
  | "compare"
  | "convert"
  | "crop"
  | "extract"
  | "findReplace"
  | "idTag"
  | "image"
  | "imageToText"
  | "linkEncode"
  | "merge"
  | "pdf"
  | "qr"
  | "regex"
  | "resize"
  | "rotate"
  | "shield"
  | "split"
  | "text"
  | "timeConvert"
  | "unarchive";

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
    title: "Audio Tools",
    description: "Edit and export audio clips directly in your browser.",
    slug: "audio",
    toolCount: 4,
  },
  {
    title: "Image Tools",
    description: "Compress, convert, and prepare images for the web.",
    slug: "image",
    toolCount: 4,
  },
  {
    title: "PDF Tools",
    description: "Combine, convert, and organize document workflows.",
    slug: "pdf",
    toolCount: 7,
  },
  {
    title: "Developer Tools",
    description: "Format, generate, and inspect common developer assets.",
    slug: "developer",
    toolCount: 7,
  },
  {
    title: "Text Tools",
    description: "Count, clean, and transform everyday text.",
    slug: "text",
    toolCount: 4,
  },
  {
    title: "File Tools",
    description: "Package and manage files directly in your browser.",
    slug: "files",
    toolCount: 2,
  },
];

export const tools: Tool[] = [
  {
    title: "Audio Trimmer",
    description: "Trim an audio clip to an exact start and end point, entirely in your browser.",
    blurb: "Trim audio clips",
    slug: "audio-trimmer",
    category: "Audio Tools",
    icon: "audioTrim",
    keywords: ["trim audio", "cut audio", "audio clip", "audio editor", "wav trimmer", "mp3 trimmer"],
  },
  {
    title: "Audio Joiner",
    description: "Combine multiple audio clips into one file, in the order you choose.",
    blurb: "Join audio clips",
    slug: "audio-joiner",
    category: "Audio Tools",
    icon: "audioJoin",
    keywords: ["join audio", "merge audio", "combine audio", "concatenate audio", "audio merger", "wav joiner"],
  },
  {
    title: "Audio Speed Changer",
    description: "Speed up or slow down an audio clip and export the result as a new file.",
    blurb: "Change audio speed",
    slug: "audio-speed-changer",
    category: "Audio Tools",
    icon: "audioSpeed",
    keywords: ["audio speed", "change speed", "speed up audio", "slow down audio", "playback rate", "pitch change", "wav speed changer"],
  },
  {
    title: "Audio Volume Changer",
    description: "Increase or decrease the volume of an audio clip and export the result as a new file.",
    blurb: "Change audio volume",
    slug: "audio-volume-changer",
    category: "Audio Tools",
    icon: "audioVolume",
    keywords: ["audio volume", "change volume", "increase volume", "decrease volume", "gain", "decibel", "louder audio", "quieter audio", "wav volume changer"],
  },
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
    title: "Image Resizer",
    description: "Resize an image to exact dimensions while keeping the aspect ratio.",
    blurb: "Resize images",
    slug: "image-resizer",
    category: "Image Tools",
    icon: "resize",
    keywords: ["resize image", "change dimensions", "scale image", "resize for web"],
  },
  {
    title: "Image Cropper",
    description: "Crop an image to the exact area or aspect ratio you need.",
    blurb: "Crop images",
    slug: "image-cropper",
    category: "Image Tools",
    icon: "crop",
    keywords: ["crop image", "crop photo", "square crop", "aspect ratio crop"],
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
    title: "PDF Page Extractor",
    description: "Select pages from a PDF and save them as a new PDF.",
    blurb: "Extract pages",
    slug: "pdf-page-extractor",
    category: "PDF Tools",
    icon: "extract",
    keywords: ["extract pages", "select pages", "get pages from pdf", "pull pages"],
  },
  {
    title: "PDF Page Editor",
    description: "Rotate and delete PDF pages, then save the result as a new PDF.",
    blurb: "Rotate & delete pages",
    slug: "pdf-page-editor",
    category: "PDF Tools",
    icon: "rotate",
    keywords: ["rotate pdf", "delete pdf pages", "remove pdf pages", "rotate pdf pages"],
  },
  {
    title: "PDF Splitter",
    description: "Split a PDF into multiple smaller PDFs by page range.",
    blurb: "Split PDFs",
    slug: "pdf-splitter",
    category: "PDF Tools",
    icon: "split",
    keywords: ["split pdf", "split pdf into multiple files", "split pdf by pages", "divide pdf"],
  },
  {
    title: "PDF Metadata Cleaner",
    description: "Clear standard document metadata from a PDF, like author and creation date.",
    blurb: "Clean PDF metadata",
    slug: "pdf-metadata-cleaner",
    category: "PDF Tools",
    icon: "clean",
    keywords: ["remove pdf metadata", "clean pdf metadata", "pdf author", "pdf privacy"],
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
    title: "URL Encoder / Decoder",
    description: "Encode and decode URI components entirely in your browser.",
    blurb: "Encode & decode URLs",
    slug: "url-encoder-decoder",
    category: "Developer Tools",
    icon: "linkEncode",
    keywords: ["url encode", "url decode", "uri component", "percent encoding", "encodeURIComponent", "decodeURIComponent"],
  },
  {
    title: "UUID Generator",
    description: "Generate random UUID v4 values securely in your browser.",
    blurb: "Generate UUIDs",
    slug: "uuid-generator",
    category: "Developer Tools",
    icon: "idTag",
    keywords: ["uuid", "guid", "uuid v4", "unique id", "random id generator"],
  },
  {
    title: "Timestamp Converter",
    description: "Convert Unix timestamps to and from human-readable UTC dates.",
    blurb: "Convert timestamps",
    slug: "timestamp-converter",
    category: "Developer Tools",
    icon: "timeConvert",
    keywords: ["unix timestamp", "epoch converter", "timestamp to date", "date to timestamp", "epoch time"],
  },
  {
    title: "Regex Tester",
    description: "Test JavaScript regular expressions against sample text in your browser.",
    blurb: "Test regular expressions",
    slug: "regex-tester",
    category: "Developer Tools",
    icon: "regex",
    keywords: ["regex", "regular expression", "regex tester", "pattern matching", "regexp"],
  },
  {
    title: "Image to Text",
    description: "Extract editable text from images directly in your browser.",
    blurb: "Extract text from images",
    slug: "image-to-text",
    category: "Text Tools",
    icon: "imageToText",
    keywords: ["ocr", "image to text", "extract text from image", "photo to text", "scan to text"],
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
  {
    title: "Find & Replace",
    description: "Find and replace text, with case-sensitive and whole-word options.",
    blurb: "Find & replace text",
    slug: "find-and-replace",
    category: "Text Tools",
    icon: "findReplace",
    keywords: ["find and replace", "search and replace", "replace text", "text find replace"],
  },
  {
    title: "Text Diff",
    description: "Compare two blocks of text and see exactly what changed.",
    blurb: "Compare text",
    slug: "text-diff",
    category: "Text Tools",
    icon: "compare",
    keywords: ["text compare", "diff checker", "compare text", "text comparison", "line diff"],
  },
  {
    title: "ZIP Creator",
    description: "Combine multiple files into one ZIP archive.",
    blurb: "Create ZIP files",
    slug: "zip-creator",
    category: "File Tools",
    icon: "archive",
    keywords: ["create zip", "zip files", "compress files", "make a zip", "archive files"],
  },
  {
    title: "ZIP Extractor",
    description: "Open a ZIP archive and extract the files inside it.",
    blurb: "Extract ZIP files",
    slug: "zip-extractor",
    category: "File Tools",
    icon: "unarchive",
    keywords: ["extract zip", "unzip files", "open zip", "decompress zip", "unpack zip"],
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
