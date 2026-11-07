import type { FAQItem } from "@/components/tools/faq-section";
import type { HowItWorksStep } from "@/components/tools/how-it-works";
import type { UseCase } from "@/components/tools/use-cases";

/**
 * Page content (SEO metadata, intro, steps, use cases, FAQ) for tools that use the registry-driven
 * page path in `app/tools/[slug]/page.tsx`, instead of a hand-written block per tool. Plain data
 * with no JSX so it can be unit tested (see tool-registry.test.ts); the matching UI components are
 * lazy-loaded in `tool-components.tsx`.
 *
 * An intro is a list of segments: strings render as text, objects render as an internal link.
 */
export type IntroSegment = string | { href: string; label: string };

export type ToolPageContent = {
  seoTitle: string;
  seoDescription: string;
  intro: IntroSegment[];
  stepsTitle: string;
  steps: HowItWorksStep[];
  useCases: UseCase[];
  faq: FAQItem[];
};

const base64EncoderDecoder: ToolPageContent = {
  seoTitle: "Free Base64 Encoder / Decoder | TinyUtility",
  seoDescription:
    "Encode and decode Base64 online for free. Convert text or files to Base64 and back, with URL-safe and data URI support, entirely in your browser.",
  intro: [
    "Encode text or a file into Base64, or decode Base64 back into text or a downloadable file, entirely on your device. Working with percent-encoded URLs instead? Try the ",
    { href: "/tools/url-encoder-decoder", label: "URL Encoder / Decoder" },
    ".",
  ],
  stepsTitle: "Private Base64 encoding and decoding in your browser",
  steps: [
    {
      title: "Choose text or file",
      description: "Type or paste text, or choose a file to turn into Base64. Nothing is uploaded.",
    },
    {
      title: "Encode or decode",
      description: "Pick Encode or Decode, and optionally URL-safe output, padding or line wrapping.",
    },
    {
      title: "Copy or download",
      description: "Copy the result, or download decoded data as a file with the name you choose.",
    },
  ],
  useCases: [
    {
      title: "Embed a small image",
      description: "Turn an icon into a data URI you can paste straight into CSS or HTML.",
    },
    {
      title: "Inspect an encoded value",
      description: "Decode a Base64 string from an API response, config file or email header to read it.",
    },
    {
      title: "Prepare URL-safe tokens",
      description: "Produce Base64URL output without + / or padding characters for use in links and tokens.",
    },
  ],
  faq: [
    {
      question: "Is my text or file uploaded anywhere?",
      answer: "No. Encoding and decoding run entirely in your browser; nothing is sent to a server.",
    },
    {
      question: "Is Base64 a form of encryption?",
      answer:
        "No. Base64 is only a way to write binary data as text. Anyone can decode it, so it does not protect secrets.",
    },
    {
      question: "Does it handle Unicode and emoji?",
      answer:
        "Yes. Text is encoded as UTF-8 before it is converted to Base64, and decoded back as UTF-8. If decoded bytes are not valid UTF-8 text, you will see a message and can download them as a file instead.",
    },
    {
      question: "What does URL-safe Base64 mean?",
      answer:
        "The URL-safe variant (Base64URL) uses - and _ instead of + and /, so the result can be used in URLs and filenames. When decoding, either alphabet is accepted, with or without padding.",
    },
    {
      question: "Is there a file size limit?",
      answer:
        "File encoding is limited to 25 MB, because Base64 text is about a third larger than the original and must fit in your browser's memory.",
    },
  ],
};

const textCaseConverter: ToolPageContent = {
  seoTitle: "Free Text Case Converter | TinyUtility",
  seoDescription:
    "Convert text to UPPER CASE, lower case, Title Case, Sentence case, camelCase, snake_case, kebab-case and more online. Private and instant in your browser.",
  intro: [
    "Change text between upper case, lower case, title case, sentence case and developer styles like camelCase and snake_case, entirely in your browser. Need to count what you have written? Try the ",
    { href: "/tools/word-counter", label: "Word Counter" },
    ".",
  ],
  stepsTitle: "Private text case conversion in your browser",
  steps: [
    { title: "Paste your text", description: "Type or paste any amount of text into the input box." },
    { title: "Pick a case", description: "Choose a style. The converted text updates immediately." },
    { title: "Copy the result", description: "Copy the converted text, or use it as the new input and convert again." },
  ],
  useCases: [
    {
      title: "Fix accidental caps lock",
      description: "Turn a block of shouting text back into normal sentence case in one click.",
    },
    {
      title: "Format headings",
      description: "Convert a draft headline to Title Case, optionally keeping small words like \"of\" and \"the\" lowercase.",
    },
    {
      title: "Rename identifiers",
      description: "Move variable, file and CSS class names between camelCase, snake_case, kebab-case and CONSTANT_CASE.",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere?",
      answer: "No. Conversion happens entirely in your browser.",
    },
    {
      question: "How accurate is Title Case and Sentence case?",
      answer:
        "Title Case capitalises each word (optionally keeping short words like \"a\", \"of\" and \"the\" lowercase). Sentence case lowercases everything and capitalises the first letter of each sentence and line. Neither knows about proper nouns, acronyms or brand names such as \"iPhone\", so review the result.",
    },
    {
      question: "How are camelCase, snake_case and similar styles split into words?",
      answer:
        "Words are split at spaces and punctuation, at lower-to-upper changes (helloWorld), at acronyms (XMLHttpRequest becomes XML Http Request) and between letters and digits. Each line is converted separately, so line breaks are kept.",
    },
    {
      question: "Does it work with accented and non-Latin letters?",
      answer:
        "Yes for letters that have upper and lower case, such as é, ü or Cyrillic. Scripts without case, such as Chinese or Japanese, are left unchanged by the case styles.",
    },
  ],
};

const textCleanerLineSorter: ToolPageContent = {
  seoTitle: "Free Text Cleaner & Line Sorter | TinyUtility",
  seoDescription:
    "Sort lines alphabetically or by length, remove duplicate and blank lines, trim and collapse whitespace, and reverse lines online. Private, in your browser.",
  intro: [
    "Clean up a list or block of text: sort lines, remove duplicates and blank lines, and tidy whitespace, entirely in your browser. Want to see exactly what changed between two versions? Use ",
    { href: "/tools/text-diff", label: "Text Diff" },
    ".",
  ],
  stepsTitle: "Private text cleaning and line sorting in your browser",
  steps: [
    { title: "Paste your lines", description: "Paste a list, a log excerpt or any text with one item per line." },
    { title: "Choose options", description: "Turn on the clean-up steps and sorting you want. The result updates as you go." },
    { title: "Copy the result", description: "Copy the cleaned text. The summary shows how many lines were removed." },
  ],
  useCases: [
    {
      title: "Deduplicate a list",
      description: "Remove repeated emails, URLs or keywords while keeping the first occurrence of each.",
    },
    {
      title: "Alphabetise names or items",
      description: "Sort a list A–Z or Z–A, with numbers inside lines ordered by value if you want.",
    },
    {
      title: "Tidy pasted text",
      description: "Strip stray spaces, collapse repeated spaces and delete empty lines left by copy and paste.",
    },
  ],
  faq: [
    {
      question: "Is my text uploaded anywhere?",
      answer: "No. All processing happens in your browser.",
    },
    {
      question: "In what order are the options applied?",
      answer:
        "Always the same order: trim lines, collapse spaces, remove empty lines, remove duplicates (keeping the first occurrence), then sort or reverse.",
    },
    {
      question: "How does sorting treat uppercase, lowercase and accents?",
      answer:
        "Sorting uses your browser's language-aware comparison, so accented letters sort next to their base letters. You can ignore case, and you can turn on natural sorting so item2 comes before item10.",
    },
    {
      question: "Are line endings preserved?",
      answer:
        "Yes. If your text uses Windows (CRLF) line endings the result does too, and a trailing line break is kept only if the input had one.",
    },
  ],
};

const hashGenerator: ToolPageContent = {
  seoTitle: "Free Hash Generator (MD5, SHA-256, SHA-512) | TinyUtility",
  seoDescription:
    "Generate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes for text or files online. Verify downloads against a checksum, privately in your browser.",
  intro: [
    "Calculate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text or a file on your device, and compare them with a checksum you were given. Need a random secret rather than a hash? Try the ",
    { href: "/tools/password-generator", label: "Password Generator" },
    ".",
  ],
  stepsTitle: "Private hash generation in your browser",
  steps: [
    { title: "Add text or a file", description: "Type text, or choose a file. The file is read locally and never uploaded." },
    { title: "Read the hashes", description: "All five hashes are calculated at once and shown as hexadecimal." },
    { title: "Compare or copy", description: "Paste a published checksum to see whether it matches, or copy any hash." },
  ],
  useCases: [
    {
      title: "Verify a download",
      description: "Hash an installer or ISO and compare it with the checksum published by the vendor.",
    },
    {
      title: "Check two files are identical",
      description: "Matching hashes mean the files have the same contents, regardless of filename.",
    },
    {
      title: "Generate a test fixture",
      description: "Get the SHA-256 of a string for tests, cache keys or documentation examples.",
    },
  ],
  faq: [
    {
      question: "Is my file or text uploaded anywhere?",
      answer: "No. Hashes are calculated in your browser; the SHA family uses the browser's built-in Web Crypto API.",
    },
    {
      question: "Which algorithms are supported?",
      answer:
        "MD5, SHA-1, SHA-256, SHA-384 and SHA-512. Other algorithms such as SHA-3, BLAKE2 and CRC32 are not offered.",
    },
    {
      question: "Are MD5 and SHA-1 safe to use?",
      answer:
        "Not for security. Practical collisions exist for both, so they should not be used for signatures, certificates or password storage. They are still common for checksums and for matching legacy systems. Prefer SHA-256 or stronger.",
    },
    {
      question: "Can I hash a password with this?",
      answer:
        "A plain hash is not suitable for storing passwords: it is fast to brute-force. Real systems use a slow, salted password-hashing function, which this tool does not provide.",
    },
    {
      question: "Is there a file size limit?",
      answer:
        "Files up to 256 MB can be hashed, because the browser's SHA functions need the whole file in memory. Larger files show a clear message instead of freezing the tab.",
    },
  ],
};

const jwtDecoder: ToolPageContent = {
  seoTitle: "Free JWT Decoder | TinyUtility",
  seoDescription:
    "Decode a JSON Web Token's header and payload online and check its expiry. Runs in your browser; decoding does not verify the signature.",
  intro: [
    "Paste a JSON Web Token to read its header and payload and see whether it has expired, without sending it anywhere. Decoding does not verify the signature. Claim timestamps are Unix times; the ",
    { href: "/tools/timestamp-converter", label: "Timestamp Converter" },
    " can convert others.",
  ],
  stepsTitle: "Private JWT decoding in your browser",
  steps: [
    { title: "Paste the token", description: "Paste a JWT. A leading \"Bearer \" or Authorization header is removed for you." },
    { title: "Read the claims", description: "See the decoded header and payload, plus expiry and issue times in plain language." },
    { title: "Check the warnings", description: "Notes flag unsigned tokens, missing algorithms and invalid time claims." },
  ],
  useCases: [
    {
      title: "Debug an authentication problem",
      description: "Check whether a token has expired, which audience it targets or which claims it carries.",
    },
    {
      title: "Inspect a token from an API",
      description: "Read the claims returned by an identity provider while developing an integration.",
    },
    {
      title: "Understand token contents",
      description: "See exactly what information a token exposes to anyone who holds it.",
    },
  ],
  faq: [
    {
      question: "Does this verify the token's signature?",
      answer:
        "No. This tool only decodes the header and payload. It does not check the signature, issuer, audience or any other validity rule, so decoded contents must not be trusted just because they decode. Verify tokens on your server with the correct key.",
    },
    {
      question: "Is my token sent anywhere?",
      answer:
        "No. Decoding happens entirely in your browser. Even so, treat live tokens as secrets and prefer expired or test tokens when you can.",
    },
    {
      question: "Why can anyone read a JWT's contents?",
      answer:
        "A standard signed JWT (JWS) is encoded, not encrypted. The signature only proves the contents were not changed. Do not put secrets in a token payload.",
    },
    {
      question: "Can it decode encrypted tokens (JWE)?",
      answer: "No. Encrypted tokens have five parts and need the decryption key; the tool tells you when it sees one.",
    },
    {
      question: "How is the expiry status worked out?",
      answer:
        "Expiry (exp), not-before (nbf) and issued-at (iat) are compared with your device's current clock. If your clock is wrong, the status will be too.",
    },
  ],
};

const colorConverter: ToolPageContent = {
  seoTitle: "Free Color Converter (HEX, RGB, HSL, CMYK) | TinyUtility",
  seoDescription:
    "Convert colors between HEX, RGB, HSL, HSV and CMYK online and check WCAG contrast ratios. Works in your browser with no uploads.",
  intro: [
    "Convert a color between HEX, RGB, HSL, HSV and CMYK and see its contrast against white and black, entirely in your browser. Resizing or converting the images that use these colors? Try the ",
    { href: "/tools/image-converter", label: "Image Converter" },
    ".",
  ],
  stepsTitle: "Private color conversion in your browser",
  steps: [
    { title: "Enter a color", description: "Type a HEX, RGB, HSL, HSV or CMYK value, or pick one with the color picker." },
    { title: "See every format", description: "The same color is shown in all formats, including alpha when present." },
    { title: "Check contrast", description: "WCAG contrast ratios against white and black show which text color is readable." },
  ],
  useCases: [
    {
      title: "Translate design values",
      description: "Turn a HEX code from a design file into the rgb() or hsl() form your CSS uses.",
    },
    {
      title: "Build accessible color pairs",
      description: "Check whether text on a background meets WCAG AA or AAA contrast.",
    },
    {
      title: "Adjust a color by hue or lightness",
      description: "Read a color's HSL values to see how to make it lighter, darker or less saturated.",
    },
  ],
  faq: [
    {
      question: "Is my input sent anywhere?",
      answer: "No. Everything is calculated in your browser.",
    },
    {
      question: "Which formats can I enter?",
      answer:
        "HEX (3, 4, 6 or 8 digits, with or without #), rgb()/rgba(), hsl()/hsla(), hsv() and cmyk(). CSS color names such as \"tomato\" are not supported.",
    },
    {
      question: "Is the CMYK value suitable for print?",
      answer:
        "No. CMYK here is the standard mathematical conversion from sRGB. Real print results depend on the printer, ink and color profile, so use it as a starting point only.",
    },
    {
      question: "Are the conversions exact?",
      answer:
        "HEX and RGB are exact whole numbers. HSL, HSV and CMYK are shown rounded to one decimal place, so converting back can differ by one in a channel.",
    },
    {
      question: "How is contrast calculated?",
      answer:
        "Using the WCAG 2.x relative luminance and contrast ratio formulas. Transparency is ignored: the color is treated as opaque.",
    },
  ],
};

const jsonCsvConverter: ToolPageContent = {
  seoTitle: "Free JSON to CSV and CSV to JSON Converter | TinyUtility",
  seoDescription:
    "Convert JSON to CSV and CSV to JSON online with correct quoting, custom delimiters and clear errors. Private and processed in your browser.",
  intro: [
    "Convert between JSON and CSV with proper handling of quotes, commas and line breaks, entirely in your browser. Need to tidy or validate the JSON first? Use the ",
    { href: "/tools/json-formatter", label: "JSON Formatter" },
    ".",
  ],
  stepsTitle: "Private JSON and CSV conversion in your browser",
  steps: [
    { title: "Choose a direction", description: "Pick CSV to JSON or JSON to CSV, then paste your data or load a file." },
    { title: "Set options", description: "Choose the delimiter, whether the first row is a header, and how nested values are handled." },
    { title: "Copy or download", description: "Review any warnings, then copy the result or download it with the filename you choose." },
  ],
  useCases: [
    {
      title: "Open API data in a spreadsheet",
      description: "Turn a JSON array of records into a CSV you can open in Excel or Google Sheets.",
    },
    {
      title: "Import a spreadsheet into code",
      description: "Convert an exported CSV into JSON for a script, a test fixture or an API request.",
    },
    {
      title: "Switch delimiters",
      description: "Read a semicolon or tab-separated file and produce a standard comma-separated one.",
    },
  ],
  faq: [
    {
      question: "Is my data uploaded anywhere?",
      answer: "No. Conversion runs entirely in your browser.",
    },
    {
      question: "Does it handle commas, quotes and line breaks inside values?",
      answer:
        "Yes. Values containing the delimiter, double quotes or line breaks are quoted correctly when writing CSV, and quoted fields (including doubled quotes and embedded line breaks) are read correctly when parsing it.",
    },
    {
      question: "What happens to nested JSON objects and arrays?",
      answer:
        "A flat CSV cannot hold them, so by default the converter stops and tells you where the nested value is. You can instead choose to write nested values as JSON text inside the cell, which keeps the data intact.",
    },
    {
      question: "Are CSV values converted to numbers?",
      answer:
        "Only if you turn on type detection, and then only for values that print back exactly as written. Leading zeros, trailing decimals and very large numbers stay as text so nothing changes silently.",
    },
    {
      question: "What can be lost in conversion?",
      answer:
        "JSON null becomes an empty CSV cell, since CSV has no null. JSON integers beyond 9,007,199,254,740,991 cannot be represented exactly by browsers, and the tool warns you. CSV rows longer than the header are rejected rather than truncated. Spreadsheet programs may treat cells beginning with = + - or @ as formulas, so review untrusted data before opening it.",
    },
  ],
};

const pdfToImages: ToolPageContent = {
  seoTitle: "Free PDF to Images Converter (PNG, JPG, WebP) | TinyUtility",
  seoDescription:
    "Convert PDF pages to PNG, JPEG or WebP images online for free. Choose pages and resolution, then download one image or a ZIP, privately in your browser.",
  intro: [
    "Turn the pages of a PDF into PNG, JPEG or WebP images, entirely in your browser. Need only some pages as a new PDF instead? Use the ",
    { href: "/tools/pdf-page-extractor", label: "PDF Page Extractor" },
    ".",
  ],
  stepsTitle: "Private PDF to image conversion in your browser",
  steps: [
    { title: "Add a PDF", description: "Choose a PDF up to 100 MB. It is read on your device and never uploaded." },
    { title: "Choose pages and quality", description: "Pick the format, resolution and which pages to convert." },
    { title: "Download", description: "Get a single image, or a ZIP of numbered images when you convert several pages." },
  ],
  useCases: [
    {
      title: "Share a page as a picture",
      description: "Export one page as a PNG or JPEG to post in a chat, slide or document.",
    },
    {
      title: "Prepare pages for editing",
      description: "Convert a scanned or designed PDF into images you can open in an image editor.",
    },
    {
      title: "Make thumbnails and previews",
      description: "Render low-resolution images of every page for a catalogue or a preview gallery.",
    },
  ],
  faq: [
    {
      question: "Is my PDF uploaded anywhere?",
      answer: "No. Pages are rendered in your browser with PDF.js and the images are created on your device.",
    },
    {
      question: "Which format and resolution should I choose?",
      answer:
        "PNG is lossless and best for text and line art. JPEG and WebP make smaller files for photos. 150 DPI is a good size for reading on screen, and 300 DPI suits printing. Higher resolutions create much larger files.",
    },
    {
      question: "Will the images have a transparent background?",
      answer: "No. Pages are drawn on a white background, as they would look when printed.",
    },
    {
      question: "Are there limits on page size and output size?",
      answer:
        "A rendered page is limited to 8,192 pixels on its longest side and 50 million pixels in total, and all images together to 600 MB. Larger pages are reduced automatically and you are told. WebP export depends on your browser; you will see a message if it isn't available.",
    },
    {
      question: "Can it convert password-protected PDFs?",
      answer: "No. You will see a message asking you to remove the password first.",
    },
  ],
};

const pdfPageNumbers: ToolPageContent = {
  seoTitle: "Free PDF Page Numbering Tool | Add Page Numbers | TinyUtility",
  seoDescription:
    "Add page numbers to a PDF online for free. Choose the position, format, starting number and pages, privately in your browser with no upload.",
  intro: [
    "Add page numbers to a PDF in the position and format you choose, entirely in your browser. Need to remove or rotate pages first? Use the ",
    { href: "/tools/pdf-page-editor", label: "PDF Page Editor" },
    ".",
  ],
  stepsTitle: "Private PDF page numbering in your browser",
  steps: [
    { title: "Add a PDF", description: "Choose a PDF up to 100 MB. It never leaves your device." },
    { title: "Set the numbering", description: "Pick the label, position, starting number, style and which pages to number." },
    { title: "Download", description: "Check the preview text, add the numbers and download the new PDF." },
  ],
  useCases: [
    {
      title: "Number a report or thesis",
      description: "Add \"Page 3 of 40\" style numbers to a document that was exported without them.",
    },
    {
      title: "Skip the cover page",
      description: "Start numbering at page 2, or use Roman numerals for front matter.",
    },
    {
      title: "Prepare a merged PDF",
      description: "Number a document you combined with the PDF Merger so every page has a continuous number.",
    },
  ],
  faq: [
    {
      question: "Is my PDF uploaded anywhere?",
      answer: "No. The numbers are added in your browser and the file stays on your device.",
    },
    {
      question: "How do the numbers work when I skip pages?",
      answer:
        "Numbers run consecutively across the pages you choose, starting from the first number you set. {total} is the last number used, so numbering pages 2 to 10 from 1 gives \"of 9\".",
    },
    {
      question: "Do numbers appear upright on rotated pages?",
      answer:
        "Yes. Pages that are rotated for display get numbers drawn upright in the chosen corner of the page as you see it, and the page's crop area is respected.",
    },
    {
      question: "Which fonts and characters are supported?",
      answer:
        "Numbers use the built-in Helvetica font, which covers Western European characters. Labels with other scripts are rejected with a message instead of producing broken text.",
    },
    {
      question: "Can I undo the page numbers?",
      answer:
        "They become part of the page content, so they can't be removed automatically afterwards. Keep your original PDF and download the numbered version as a new file.",
    },
  ],
};

const pdfWatermark: ToolPageContent = {
  seoTitle: "Free PDF Watermark Tool | Add Text or Image | TinyUtility",
  seoDescription:
    "Add a text or image watermark to a PDF online for free. Set opacity, rotation, repeat and pages, privately in your browser with no upload.",
  intro: [
    "Stamp a text or image watermark onto some or all pages of a PDF, entirely in your browser. Want to clear a document's hidden details too? Try the ",
    { href: "/tools/pdf-metadata-cleaner", label: "PDF Metadata Cleaner" },
    ".",
  ],
  stepsTitle: "Private PDF watermarking in your browser",
  steps: [
    { title: "Add a PDF", description: "Choose a PDF up to 100 MB. It is processed on your device only." },
    { title: "Design the watermark", description: "Type text or add a PNG/JPEG image, then set opacity, rotation, layout and pages." },
    { title: "Download", description: "Add the watermark and download the new PDF." },
  ],
  useCases: [
    {
      title: "Mark a draft or confidential file",
      description: "Place \"DRAFT\" or \"CONFIDENTIAL\" diagonally across every page.",
    },
    {
      title: "Add a logo",
      description: "Stamp a translucent company logo onto a document before sharing it.",
    },
    {
      title: "Discourage reuse",
      description: "Repeat a name or notice across the page so a copy is clearly attributed.",
    },
  ],
  faq: [
    {
      question: "Is my PDF or image uploaded anywhere?",
      answer: "No. The watermark is added in your browser and nothing leaves your device.",
    },
    {
      question: "Can the watermark be removed afterwards?",
      answer:
        "It is drawn onto the pages, so it can't be switched off like a layer. A determined person can still edit or crop it out, so a watermark discourages reuse but is not security.",
    },
    {
      question: "Is the watermark behind or in front of the page content?",
      answer: "In front. It is drawn on top of the existing content with the opacity you choose, so low opacity keeps the page readable.",
    },
    {
      question: "Which characters and image types work?",
      answer:
        "Text watermarks use the built-in Helvetica Bold font, which supports Western European characters only; use an image watermark for other scripts. Image watermarks must be PNG or JPEG.",
    },
    {
      question: "Does it work on rotated pages and mixed page sizes?",
      answer:
        "Yes. The watermark is centered relative to each page as it is displayed, with its angle adjusted for rotated pages, and image width is a percentage of each page's width.",
    },
  ],
};

const yamlFormatter: ToolPageContent = {
  seoTitle: "Free YAML Formatter & Validator | YAML ↔ JSON | TinyUtility",
  seoDescription:
    "Format and validate YAML online, find errors by line and column, sort keys, and convert YAML to JSON or JSON to YAML. Private, in your browser.",
  intro: [
    "Check that YAML is valid, tidy its indentation, and convert between YAML and JSON, entirely in your browser. Working with the JSON side of a config? Use the ",
    { href: "/tools/json-formatter", label: "JSON Formatter" },
    ".",
  ],
  stepsTitle: "Private YAML formatting and validation in your browser",
  steps: [
    { title: "Paste or load YAML", description: "Paste your YAML, or load a .yaml or .yml file. Nothing is uploaded." },
    { title: "Choose what to do", description: "Format and validate, convert to JSON, or convert JSON to YAML, then set indentation and sorting." },
    { title: "Fix errors or copy the result", description: "Problems are listed with line and column. Copy or download the result when it is valid." },
  ],
  useCases: [
    {
      title: "Debug a broken config",
      description: "Find the exact line of a bad indent, duplicate key or unclosed bracket in a Docker Compose, Kubernetes or CI file.",
    },
    {
      title: "Tidy a file before committing",
      description: "Normalise indentation and optionally sort keys so diffs stay small and readable.",
    },
    {
      title: "Move between YAML and JSON",
      description: "Turn an API response into YAML for a config file, or a config into JSON for a script.",
    },
  ],
  faq: [
    {
      question: "Is my YAML uploaded anywhere?",
      answer: "No. Parsing and formatting happen in your browser. Configuration files often contain secrets, so this matters; nothing is sent to a server.",
    },
    {
      question: "Are comments kept when I format?",
      answer: "Yes. Formatting keeps comments, anchors, aliases and the quoting style of each value. Converting to JSON drops comments because JSON has none.",
    },
    {
      question: "Which YAML version is used?",
      answer:
        "YAML 1.2. Under 1.2, words such as yes, no and on are plain text rather than booleans, unlike some older tools. Merge keys (<<) are understood.",
    },
    {
      question: "What errors does it catch?",
      answer:
        "Syntax errors, bad indentation, tabs used for indentation, unclosed brackets and quotes, duplicate keys, and aliases that point to a missing anchor. Each is shown with its line and column.",
    },
    {
      question: "What can't be converted to JSON?",
      answer:
        "Values JSON has no way to hold: .nan and .inf, mappings whose keys are lists or mappings, and non-text keys that can't be written. These are reported rather than silently changed. A file with several documents becomes a JSON array.",
    },
  ],
};

const sqlFormatterContent: ToolPageContent = {
  seoTitle: "Free SQL Formatter & Beautifier | TinyUtility",
  seoDescription:
    "Format and beautify SQL online for PostgreSQL, MySQL, SQL Server, Oracle, SQLite, BigQuery and more. Change keyword case and indentation, privately in your browser.",
  intro: [
    "Turn a dense one-line query into readable, indented SQL for the database you use, entirely in your browser. Need to compare two versions of a query? Use ",
    { href: "/tools/text-diff", label: "Text Diff" },
    ".",
  ],
  stepsTitle: "Private SQL formatting in your browser",
  steps: [
    { title: "Paste your SQL", description: "Paste one or more statements, or load a .sql file. Nothing is run or uploaded." },
    { title: "Pick a dialect and style", description: "Choose your database, keyword case, indentation and where AND / OR go." },
    { title: "Copy or download", description: "Copy the formatted SQL or download it as a .sql file." },
  ],
  useCases: [
    {
      title: "Read a query from a log",
      description: "Expand a query copied from an application log or an ORM into something you can follow.",
    },
    {
      title: "Keep code review diffs clean",
      description: "Apply one consistent style so reviews focus on what the query does, not how it is spaced.",
    },
    {
      title: "Prepare SQL for documentation",
      description: "Format examples with consistent keyword case and indentation before pasting them into docs.",
    },
  ],
  faq: [
    {
      question: "Is my SQL sent anywhere?",
      answer: "No. Formatting happens in your browser and the query is never run against any database.",
    },
    {
      question: "Does formatting change what my query does?",
      answer:
        "It should only change spacing, line breaks and, if you choose, the case of keywords. The tool checks this and shows a warning if the output differs in any other way. String literals and comments are kept exactly as written.",
    },
    {
      question: "Which databases are supported?",
      answer:
        "Standard SQL plus PostgreSQL, MySQL, MariaDB, SQLite, SQL Server (T-SQL), Oracle (PL/SQL), BigQuery, Snowflake, Redshift, Spark, Hive, Trino, Db2, DuckDB and ClickHouse. Choosing the right dialect matters for vendor-specific syntax.",
    },
    {
      question: "Why do I get a parse error on a valid query?",
      answer:
        "The formatter has to understand the syntax. Vendor-specific features usually need the matching dialect selected. The message shows the line and column where it stopped.",
    },
    {
      question: "Does it validate or minify SQL?",
      answer:
        "It does not validate against a schema or database, and it does not minify: collapsing whitespace can change the meaning of queries that contain comments or strings.",
    },
  ],
};

const markdownEditor: ToolPageContent = {
  seoTitle: "Free Markdown Editor & Live Preview | TinyUtility",
  seoDescription:
    "Write Markdown with a live preview, GitHub Flavored Markdown support, and safe HTML export. Download .md or .html. Private, in your browser.",
  intro: [
    "Write Markdown and see it rendered as you type, then copy the HTML or download the file, entirely in your browser. Counting words for a draft? Try the ",
    { href: "/tools/word-counter", label: "Word Counter" },
    ".",
  ],
  stepsTitle: "Private Markdown editing and preview in your browser",
  steps: [
    { title: "Write or load Markdown", description: "Type in the editor, or load a .md file. A short sample is there to start from." },
    { title: "Watch the preview", description: "The preview updates as you type. Switch between side by side, editor only or preview only." },
    { title: "Export", description: "Copy the Markdown or the cleaned HTML, or download a .md or standalone .html file." },
  ],
  useCases: [
    {
      title: "Draft a README",
      description: "Check headings, lists, tables and code blocks before committing a README or documentation page.",
    },
    {
      title: "Convert Markdown to HTML",
      description: "Get clean HTML for a CMS, an email or a static page without installing anything.",
    },
    {
      title: "Preview notes",
      description: "See how notes or a blog post will look once rendered, including task lists and tables.",
    },
  ],
  faq: [
    {
      question: "Is my document uploaded anywhere?",
      answer: "No. The Markdown is rendered in your browser and never leaves your device.",
    },
    {
      question: "Is the preview safe if the Markdown contains HTML?",
      answer:
        "Yes. Markdown allows raw HTML, so the output is sanitised before it is shown or exported: scripts, event handlers, frames, forms, styles and javascript: links are removed, and links open in a new tab. Anything removed simply doesn't appear.",
    },
    {
      question: "Why don't my images from the web show?",
      answer:
        "Loading an image from another site tells that site you are viewing the page, so web images are off by default. Turn on \"Load images from the web\" if you want them. Images embedded as data: URIs always work.",
    },
    {
      question: "Which Markdown features are supported?",
      answer:
        "CommonMark, plus GitHub Flavored Markdown (tables, strikethrough, task lists, automatic links) when enabled. Footnotes, math, diagrams, front matter and custom containers are not supported and show as plain text.",
    },
    {
      question: "Will it match how GitHub renders my Markdown?",
      answer:
        "Closely for common syntax, but not exactly: GitHub adds its own extensions and styling. Use the preview as a guide rather than a pixel-perfect match.",
    },
  ],
};

const audioReverse: ToolPageContent = {
  seoTitle: "Free Audio Reverse Tool | Play Audio Backwards | TinyUtility",
  seoDescription:
    "Reverse an audio clip online for free so it plays backwards. Preview it first, then export a WAV file, entirely in your browser.",
  intro: [
    "Reverse an audio clip so it plays from end to start, preview the result, and export it as a new WAV file, entirely in your browser. Want to speed it up or slow it down instead? Try the ",
    { href: "/tools/audio-speed-changer", label: "Audio Speed Changer" },
    ".",
  ],
  stepsTitle: "Private audio reversing in your browser",
  steps: [
    { title: "Upload an audio file", description: "Choose or drop an audio file your browser can decode." },
    { title: "Preview it", description: "Listen to the original and the reversed version before committing." },
    { title: "Reverse and download", description: "Export the result as a WAV file and download it with a custom filename." },
  ],
  useCases: [
    {
      title: "Create a reversed sound effect",
      description: "Reverse a recording for a sound effect, transition, or creative audio clip.",
    },
    {
      title: "Check for backmasked audio",
      description: "Play a clip in reverse to hear what, if anything, is hidden when it's played backwards.",
    },
    {
      title: "Make a reveal or intro effect",
      description: "Reverse a short clip as the lead-in to a video or podcast segment.",
    },
  ],
  faq: [
    {
      question: "Is my audio uploaded anywhere?",
      answer: "No. Decoding, preview playback, reversing, and export all happen locally in your browser.",
    },
    {
      question: "What exactly does reversing change?",
      answer:
        "The audio plays from end to start instead of start to end. All channels are reversed together, so stereo placement and timing between channels stay correct. Duration, sample rate, and channel count are unchanged.",
    },
    {
      question: "Can I preview before exporting?",
      answer: "Yes. You can preview the original and the reversed version separately before reversing and downloading.",
    },
    {
      question: "What audio formats can I upload?",
      answer:
        "Whatever your browser's built-in audio decoder supports — most browsers handle MP3, WAV, M4A, and OGG. If a file can't be decoded, you'll see a clear message rather than a silent failure.",
    },
  ],
};

const audioFade: ToolPageContent = {
  seoTitle: "Free Audio Fade In / Fade Out Tool | TinyUtility",
  seoDescription:
    "Add a fade in, fade out, or both to an audio clip online for free. Choose the length and curve, preview it, and export a WAV file in your browser.",
  intro: [
    "Add a smooth fade in, fade out, or both to an audio clip, preview it, and export a new WAV file, entirely in your browser. Need to change the overall level instead? Try the ",
    { href: "/tools/audio-volume-changer", label: "Audio Volume Changer" },
    ".",
  ],
  stepsTitle: "Private audio fading in your browser",
  steps: [
    { title: "Upload an audio file", description: "Choose or drop an audio file your browser can decode." },
    { title: "Set the fades", description: "Choose the fade-in and fade-out length and a curve, then preview the result." },
    { title: "Apply and download", description: "Export the result as a WAV file and download it with a custom filename." },
  ],
  useCases: [
    {
      title: "Smooth out a recording's start or end",
      description: "Avoid an abrupt start or a hard cutoff on a voice memo, podcast clip, or field recording.",
    },
    {
      title: "Prepare a clip for a playlist",
      description: "Add a short fade out so a track doesn't end jarringly before the next one.",
    },
    {
      title: "Soften a sample before looping",
      description: "Fade the edges of a sample slightly so a loop doesn't click or pop at the seam.",
    },
  ],
  faq: [
    {
      question: "Is my audio uploaded anywhere?",
      answer: "No. Decoding, preview playback, fading, and export all happen locally in your browser.",
    },
    {
      question: "What's the difference between the curve options?",
      answer:
        "Linear ramps at a constant rate. Smooth (an S-curve) eases in and out of the ramp, which often sounds more natural. Exponential starts slowly and speeds up, which can sound more even to the ear for fade-outs in particular. All three start at silence and end at full level.",
    },
    {
      question: "Can the fade in and fade out overlap?",
      answer: "No. If the two lengths you choose would overlap, you'll see a message asking you to shorten one of them.",
    },
    {
      question: "Can I preview the fade before exporting?",
      answer: "Yes. Preview plays the clip with the fade applied before you export anything.",
    },
    {
      question: "What audio formats can I upload?",
      answer:
        "Whatever your browser's built-in audio decoder supports — most browsers handle MP3, WAV, M4A, and OGG. If a file can't be decoded, you'll see a clear message rather than a silent failure.",
    },
  ],
};

const imageMetadata: ToolPageContent = {
  seoTitle: "Free Image Metadata Viewer & EXIF Remover | TinyUtility",
  seoDescription:
    "View a photo's camera, date, and GPS metadata, then remove it before sharing online. Works on JPEG, PNG, and WebP, entirely in your browser.",
  intro: [
    "See exactly what metadata a photo carries — camera, date, and GPS location — then remove it before you share the file, entirely in your browser. Need to compress the image too? Try the ",
    { href: "/tools/image-compressor", label: "Image Compressor" },
    ".",
  ],
  stepsTitle: "Private metadata viewing and cleaning in your browser",
  steps: [
    { title: "Add an image", description: "Choose a JPEG, PNG, or WebP file up to 100 MB. It never leaves your device." },
    { title: "Review what it contains", description: "See camera, date, and location details, with sensitive fields clearly marked." },
    { title: "Clean and download", description: "Remove the metadata and download a new file, with the result re-checked to confirm it worked." },
  ],
  useCases: [
    {
      title: "Check a photo before posting it",
      description: "Confirm a picture doesn't reveal your location or device details before sharing it publicly.",
    },
    {
      title: "Strip metadata from a batch of photos",
      description: "Clean identifying details from photos before sending them to a client, buyer, or stranger.",
    },
    {
      title: "Investigate a suspicious image",
      description: "See the camera model and timestamp embedded in a file you were sent.",
    },
  ],
  faq: [
    {
      question: "Is my photo uploaded anywhere?",
      answer: "No. Metadata is read and removed entirely in your browser.",
    },
    {
      question: "Does cleaning guarantee all metadata is gone?",
      answer:
        "It removes everything this tool can detect and act on: EXIF, GPS, and common text/IPTC metadata in JPEG, PNG, and WebP files. It doesn't guarantee removal of every possible embedded object a file could theoretically contain, and it can't act on metadata in formats it doesn't parse. The result is re-read after cleaning, and you'll see a clear warning if anything remains.",
    },
    {
      question: "Does cleaning recompress my photo?",
      answer:
        "Usually no — metadata is removed by deleting the relevant file segments directly, without decoding or re-encoding the image, so pixels are untouched. The one exception is a JPEG whose EXIF says it was taken sideways or upside down: that photo is redrawn upright first (so it still looks correct once the orientation tag is gone), which does recompress it slightly. The tool tells you when this happens.",
    },
    {
      question: "What counts as sensitive metadata?",
      answer:
        "GPS coordinates are the clearest example — they reveal exactly where a photo was taken — and are flagged in red. Software, artist, and copyright fields are also marked, since they can identify you or your equipment.",
    },
    {
      question: "Which formats are supported?",
      answer: "JPEG, PNG, and WebP. Other formats aren't recognized and show a clear error instead of a wrong result.",
    },
  ],
};

const faviconGenerator: ToolPageContent = {
  seoTitle: "Free Favicon Generator | ICO & PNG Icons | TinyUtility",
  seoDescription:
    "Turn an image into a favicon.ico plus the PNG sizes browsers, iOS, and Android need, with a web manifest and HTML snippet. Generated in your browser.",
  intro: [
    "Turn an image into a complete favicon package — an ICO file, the standard PNG sizes, a web manifest, and the HTML to reference them — entirely in your browser. Need the source image resized first? Try the ",
    { href: "/tools/image-resizer", label: "Image Resizer" },
    ".",
  ],
  stepsTitle: "Private favicon generation in your browser",
  steps: [
    { title: "Add an image", description: "Choose a JPEG, PNG, or WebP file. A square image works best." },
    { title: "Name your site", description: "Enter the name used in the generated web manifest." },
    { title: "Generate and download", description: "Download a ZIP with favicon.ico, every PNG size, and the snippet to add to your site." },
  ],
  useCases: [
    {
      title: "Add a favicon to a new site",
      description: "Turn a logo into every icon file modern browsers, iOS, and Android look for.",
    },
    {
      title: "Replace an outdated favicon",
      description: "Regenerate a full icon set from an updated logo without hand-resizing each size.",
    },
    {
      title: "Prepare icons for a PWA",
      description: "Get the 192×192 and 512×512 PNGs and the web manifest a progressive web app needs.",
    },
  ],
  faq: [
    {
      question: "Is my image uploaded anywhere?",
      answer: "No. Every size is rendered locally in your browser using the canvas API.",
    },
    {
      question: "What's in the ZIP file?",
      answer:
        "favicon.ico (16, 32, and 48px, embedded as PNG), favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png (180px), android-chrome-192x192.png, android-chrome-512x512.png, a site.webmanifest, and an HTML snippet referencing all of them.",
    },
    {
      question: "What if my image isn't square?",
      answer: "It's automatically cropped to a centered square before the icons are generated, since favicons must be square. You'll see a note when this happens.",
    },
    {
      question: "Is the ICO file actually valid?",
      answer:
        "Before it's offered for download, the generated ICO is parsed back and checked — its directory structure and every embedded image are verified, not just assumed to be correct because the generation step completed.",
    },
    {
      question: "Is transparency preserved?",
      answer: "Yes, for PNG and WebP sources with transparency. A JPEG source has no transparency to preserve.",
    },
  ],
};

const imagePalette: ToolPageContent = {
  seoTitle: "Free Image Color Palette Extractor | TinyUtility",
  seoDescription:
    "Extract a color palette from any image using median-cut quantization. Get copyable HEX values and CSS variables, entirely in your browser.",
  intro: [
    "Pull a representative color palette out of a photo or design, with copyable HEX values, entirely in your browser. Want to convert a color you found into another format? Try the ",
    { href: "/tools/color-converter", label: "Color Converter" },
    ".",
  ],
  stepsTitle: "Private color palette extraction in your browser",
  steps: [
    { title: "Add an image", description: "Choose a JPEG, PNG, or WebP file up to 100 MB." },
    { title: "Choose how many colors", description: "Pick between 2 and 12 colors; the palette updates immediately." },
    { title: "Copy the result", description: "Copy the HEX values, or as ready-to-use CSS custom properties." },
  ],
  useCases: [
    {
      title: "Build a color scheme from a photo",
      description: "Turn a photo, logo, or piece of art into a usable set of colors for a design.",
    },
    {
      title: "Match brand colors",
      description: "Extract the dominant colors from an existing logo or image to reuse consistently.",
    },
    {
      title: "Check an image's color balance",
      description: "See at a glance which colors actually dominate an image.",
    },
  ],
  faq: [
    {
      question: "Is my image uploaded anywhere?",
      answer: "No. The palette is calculated entirely in your browser.",
    },
    {
      question: "How are the colors chosen?",
      answer:
        "With median-cut quantization: the image's colors are repeatedly split into groups along their widest color range, then each group is averaged into one palette color. It's a standard, deterministic method — running it twice on the same image and settings always gives the same result.",
    },
    {
      question: "Does it find the exact colors in the original file?",
      answer:
        "No. The image is downscaled before analysis for speed, and each palette color is an average of a group of similar pixels, not necessarily a color that appears verbatim. Treat it as a representative palette, not an exact pixel-level readout.",
    },
    {
      question: "What happens with transparent areas?",
      answer: "Transparent and mostly-transparent pixels are excluded from the palette entirely, and the tool tells you what share of the image that was.",
    },
    {
      question: "What if my image has very few colors?",
      answer: "You'll get exactly as many colors as the image actually has — never padded with invented ones to meet the number you chose.",
    },
  ],
};

export const toolPageContent: Record<string, ToolPageContent> = {
  "image-metadata": imageMetadata,
  "favicon-generator": faviconGenerator,
  "image-palette": imagePalette,
  "audio-reverse": audioReverse,
  "audio-fade": audioFade,
  "yaml-formatter": yamlFormatter,
  "sql-formatter": sqlFormatterContent,
  "markdown-editor": markdownEditor,
  "pdf-to-images": pdfToImages,
  "pdf-page-numbers": pdfPageNumbers,
  "pdf-watermark": pdfWatermark,
  "base64-encoder-decoder": base64EncoderDecoder,
  "text-case-converter": textCaseConverter,
  "text-cleaner-line-sorter": textCleanerLineSorter,
  "hash-generator": hashGenerator,
  "jwt-decoder": jwtDecoder,
  "color-converter": colorConverter,
  "json-csv-converter": jsonCsvConverter,
};
