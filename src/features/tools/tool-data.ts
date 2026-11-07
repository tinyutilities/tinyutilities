export type ToolCategory = {
  title: string;
  description: string;
  slug: string;
  /** Derived from `tools` below — never edit by hand. */
  toolCount: number;
};

export type ToolIconName =
  | "archive"
  | "audioFade"
  | "audioJoin"
  | "audioSpeed"
  | "audioReverse"
  | "audioTrim"
  | "audioVolume"
  | "base64"
  | "caseConvert"
  | "clean"
  | "code"
  | "compare"
  | "convert"
  | "crop"
  | "database"
  | "favicon"
  | "extract"
  | "findReplace"
  | "hash"
  | "idTag"
  | "image"
  | "imageToText"
  | "lineSort"
  | "linkEncode"
  | "markdown"
  | "merge"
  | "metadataTag"
  | "palette"
  | "paletteExtract"
  | "pageNumber"
  | "pdf"
  | "pdfImage"
  | "qr"
  | "regex"
  | "resize"
  | "rotate"
  | "shield"
  | "split"
  | "tableConvert"
  | "text"
  | "timeConvert"
  | "token"
  | "unarchive"
  | "watermark"
  | "yaml";

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

const categoryDefinitions: Omit<ToolCategory, "toolCount">[] = [
  {
    title: "Audio Tools",
    description: "Edit and export audio clips directly in your browser.",
    slug: "audio",
  },
  {
    title: "Image Tools",
    description: "Compress, convert, and prepare images for the web.",
    slug: "image",
  },
  {
    title: "PDF Tools",
    description: "Combine, convert, and organize document workflows.",
    slug: "pdf",
  },
  {
    title: "Developer Tools",
    description: "Format, generate, and inspect common developer assets.",
    slug: "developer",
  },
  {
    title: "Text Tools",
    description: "Count, clean, and transform everyday text.",
    slug: "text",
  },
  {
    title: "File Tools",
    description: "Package and manage files directly in your browser.",
    slug: "files",
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
    description: "Increase, decrease, or normalize the volume of an audio clip and export the result as a new file.",
    blurb: "Change audio volume",
    slug: "audio-volume-changer",
    category: "Audio Tools",
    icon: "audioVolume",
    keywords: ["audio volume", "change volume", "increase volume", "decrease volume", "gain", "decibel", "louder audio", "quieter audio", "wav volume changer", "normalize audio", "audio normalizer", "peak normalize", "normalize volume"],
  },
  {
    title: "Audio Reverse",
    description: "Reverse an audio clip so it plays backwards and export the result as a new file.",
    blurb: "Reverse audio clips",
    slug: "audio-reverse",
    category: "Audio Tools",
    icon: "audioReverse",
    keywords: ["reverse audio", "backwards audio", "flip audio", "reverse sound", "audio backwards", "play audio in reverse"],
  },
  {
    title: "Audio Fade In / Fade Out",
    description: "Add a fade in, fade out, or both to an audio clip and export the result as a new file.",
    blurb: "Fade audio in & out",
    slug: "audio-fade",
    category: "Audio Tools",
    icon: "audioFade",
    keywords: ["fade in audio", "fade out audio", "audio fade", "smooth audio start", "smooth audio end", "crossfade"],
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
    title: "Image Metadata Viewer / Cleaner",
    description: "View a photo's camera, date, and GPS metadata, and remove it before sharing.",
    blurb: "View & clean image metadata",
    slug: "image-metadata",
    category: "Image Tools",
    icon: "metadataTag",
    keywords: ["exif viewer", "remove exif data", "strip metadata", "photo metadata", "gps location photo", "exif remover", "clean photo metadata"],
  },
  {
    title: "Favicon Generator",
    description: "Turn an image into a favicon.ico and the PNG sizes modern browsers and devices need.",
    blurb: "Generate favicons",
    slug: "favicon-generator",
    category: "Image Tools",
    icon: "favicon",
    keywords: ["favicon generator", "ico generator", "apple touch icon", "android chrome icon", "site icon", "make a favicon"],
  },
  {
    title: "Image Color Palette Extractor",
    description: "Pull a copyable color palette out of an image using median-cut quantization.",
    blurb: "Extract color palettes",
    slug: "image-palette",
    category: "Image Tools",
    icon: "paletteExtract",
    keywords: ["color palette from image", "extract colors", "image color picker", "dominant colors", "color scheme generator"],
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
    title: "PDF to Images",
    description: "Convert PDF pages to PNG, JPEG, or WebP images and download one image or a ZIP.",
    blurb: "Convert PDF to images",
    slug: "pdf-to-images",
    category: "PDF Tools",
    icon: "pdfImage",
    keywords: ["pdf to png", "pdf to jpg", "pdf to jpeg", "pdf to image", "convert pdf pages", "pdf screenshot"],
  },
  {
    title: "PDF Page Numbers",
    description: "Add page numbers to a PDF with the position, format, and starting number you choose.",
    blurb: "Number PDF pages",
    slug: "pdf-page-numbers",
    category: "PDF Tools",
    icon: "pageNumber",
    keywords: ["add page numbers to pdf", "number pdf pages", "pdf pagination", "pdf page numbering", "bates numbering"],
  },
  {
    title: "PDF Watermark",
    description: "Add a text or image watermark to a PDF with adjustable opacity, rotation, and pages.",
    blurb: "Watermark PDFs",
    slug: "pdf-watermark",
    category: "PDF Tools",
    icon: "watermark",
    keywords: ["add watermark to pdf", "pdf stamp", "confidential watermark", "draft watermark", "logo on pdf"],
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
    title: "Base64 Encoder / Decoder",
    description: "Encode text or files to Base64 and decode Base64 back, entirely in your browser.",
    blurb: "Encode & decode Base64",
    slug: "base64-encoder-decoder",
    category: "Developer Tools",
    icon: "base64",
    keywords: ["base64 encode", "base64 decode", "text to base64", "base64 to text", "image to base64", "file to base64", "data uri", "base64url"],
  },
  {
    title: "Hash Generator",
    description: "Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes for text or files in your browser.",
    blurb: "Generate hashes",
    slug: "hash-generator",
    category: "Developer Tools",
    icon: "hash",
    keywords: ["md5", "sha256", "sha1", "sha512", "checksum", "file hash", "hash text", "verify download"],
  },
  {
    title: "JWT Decoder",
    description: "Decode a JSON Web Token's header and payload in your browser. Decoding does not verify the signature.",
    blurb: "Decode JWTs",
    slug: "jwt-decoder",
    category: "Developer Tools",
    icon: "token",
    keywords: ["jwt", "json web token", "decode jwt", "jwt debugger", "bearer token", "token claims"],
  },
  {
    title: "Color Converter",
    description: "Convert colors between HEX, RGB, HSL, HSV, and CMYK, and check WCAG contrast.",
    blurb: "Convert colors",
    slug: "color-converter",
    category: "Developer Tools",
    icon: "palette",
    keywords: ["hex to rgb", "rgb to hex", "hsl", "cmyk", "color picker", "contrast checker", "wcag contrast"],
  },
  {
    title: "JSON ↔ CSV Converter",
    description: "Convert JSON to CSV and CSV to JSON with proper quoting, delimiters, and clear errors.",
    blurb: "Convert JSON & CSV",
    slug: "json-csv-converter",
    category: "Developer Tools",
    icon: "tableConvert",
    keywords: ["json to csv", "csv to json", "csv converter", "json converter", "spreadsheet", "tsv"],
  },
  {
    title: "YAML Formatter / Validator",
    description: "Validate and format YAML with line-accurate errors, and convert YAML to JSON or JSON to YAML.",
    blurb: "Format & validate YAML",
    slug: "yaml-formatter",
    category: "Developer Tools",
    icon: "yaml",
    keywords: ["yaml validator", "yaml lint", "yaml to json", "json to yaml", "format yaml", "yml", "docker compose", "kubernetes yaml"],
  },
  {
    title: "SQL Formatter",
    description: "Format and beautify SQL for PostgreSQL, MySQL, SQL Server, Oracle, SQLite, BigQuery, and more.",
    blurb: "Format SQL queries",
    slug: "sql-formatter",
    category: "Developer Tools",
    icon: "database",
    keywords: ["sql beautifier", "format sql", "sql pretty print", "mysql formatter", "postgres formatter", "t-sql formatter", "sql indent"],
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
    title: "Text Case Converter",
    description: "Convert text to upper, lower, title, sentence, camelCase, snake_case, kebab-case, and more.",
    blurb: "Change text case",
    slug: "text-case-converter",
    category: "Text Tools",
    icon: "caseConvert",
    keywords: ["uppercase", "lowercase", "title case", "sentence case", "camelcase", "snake_case", "kebab-case", "change case"],
  },
  {
    title: "Text Cleaner / Line Sorter",
    description: "Sort lines, remove duplicate and blank lines, and tidy whitespace in any list or block of text.",
    blurb: "Clean & sort lines",
    slug: "text-cleaner-line-sorter",
    category: "Text Tools",
    icon: "lineSort",
    keywords: ["sort lines", "remove duplicate lines", "remove blank lines", "alphabetize", "dedupe", "trim whitespace", "reverse lines"],
  },
  {
    title: "Markdown Editor",
    description: "Write Markdown with a live, sanitized preview and export clean HTML or a .md file.",
    blurb: "Edit & preview Markdown",
    slug: "markdown-editor",
    category: "Text Tools",
    icon: "markdown",
    keywords: ["markdown preview", "markdown to html", "readme editor", "md editor", "github markdown", "live markdown"],
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

/** Category list with each `toolCount` derived from the registry, so it can never drift. */
export const toolCategories: ToolCategory[] = categoryDefinitions.map((category) => ({
  ...category,
  toolCount: tools.filter((tool) => tool.category === category.title).length,
}));

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
