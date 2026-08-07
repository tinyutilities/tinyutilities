import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FAQSection, type FAQItem } from "@/components/tools/faq-section";
import { HowItWorks, type HowItWorksStep } from "@/components/tools/how-it-works";
import { RelatedTools } from "@/components/tools/related-tools";
import { ToolContainer } from "@/components/tools/tool-container";
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ImageCompressorTool } from "@/features/tools/image-compressor/image-compressor-tool";
import { ImageConverterTool } from "@/features/tools/image-converter/image-converter-tool";
import { ImageToPdfTool } from "@/features/tools/image-to-pdf/image-to-pdf-tool";
import { JsonFormatterTool } from "@/features/tools/json-formatter/json-formatter-tool";
import { PasswordGeneratorTool } from "@/features/tools/password-generator/password-generator-tool";
import { PdfCompressorTool } from "@/features/tools/pdf-compressor/pdf-compressor-tool";
import { PdfMergerTool } from "@/features/tools/pdf-merger/pdf-merger-tool";
import { QrCodeGeneratorTool } from "@/features/tools/qr-code-generator/qr-code-generator-tool";
import { getRelatedTools, getToolBySlug, tools } from "@/features/tools/tool-data";
import { WordCounterTool } from "@/features/tools/word-counter/word-counter-tool";
import { absoluteUrl, createSeoMetadata } from "@/lib/seo";

type ToolPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const passwordGeneratorFaq: FAQItem[] = [
  {
    question: "Are passwords generated on a server?",
    answer: "No. Passwords are generated entirely in your browser and are not uploaded anywhere.",
  },
  {
    question: "What length should I use?",
    answer: "Use at least 16 characters for most accounts. Longer passwords are usually stronger.",
  },
  {
    question: "Should I include symbols?",
    answer: "Symbols can improve strength, but some websites restrict them. Adjust the options as needed.",
  },
];

const passwordGeneratorSteps: HowItWorksStep[] = [
  {
    title: "Choose settings",
    description: "Pick the length and character types that match the account or service requirements.",
  },
  {
    title: "Generate locally",
    description: "The browser creates a random password using the selected character pool.",
  },
  {
    title: "Copy and save",
    description: "Copy the password and store it in a trusted password manager.",
  },
];

const imageToPdfFaq: FAQItem[] = [
  {
    question: "Are my images uploaded anywhere?",
    answer: "No. Images are converted to PDF locally in your browser and never leave your device.",
  },
  {
    question: "Which image formats are supported?",
    answer: "You can add JPG, JPEG, PNG, and WEBP images.",
  },
  {
    question: "Can I control the page order?",
    answer: "Yes. Use the Up and Down controls to reorder images before creating the PDF.",
  },
];

const imageToPdfSteps: HowItWorksStep[] = [
  {
    title: "Add images",
    description: "Drag and drop images or browse for JPG, PNG, and WEBP files on your device.",
  },
  {
    title: "Choose PDF options",
    description: "Pick page size, orientation, margins, and reorder images before conversion.",
  },
  {
    title: "Convert locally",
    description: "Create and download the PDF entirely inside your browser.",
  },
];

const pdfMergerFaq: FAQItem[] = [
  {
    question: "Are my PDFs uploaded anywhere?",
    answer: "No. PDF files are loaded, reordered, rotated, and merged entirely in your browser.",
  },
  {
    question: "Can I merge password-protected PDFs?",
    answer:
      "Password-protected PDFs are currently unsupported. Remove the password first, then add the file again.",
  },
  {
    question: "Can I rotate individual pages?",
    answer:
      "This tool rotates every page in a selected PDF. Individual page editing belongs in a future PDF Editor tool.",
  },
  {
    question: "Can I change the merge order?",
    answer:
      "Yes. Drag PDF cards into the order you want, or use the Up and Down controls for precise reordering.",
  },
];

const pdfMergerSteps: HowItWorksStep[] = [
  {
    title: "Add PDFs",
    description: "Drop PDF files into the upload area or choose them from your device.",
  },
  {
    title: "Arrange and rotate",
    description: "Reorder the PDF queue and rotate complete documents before merging.",
  },
  {
    title: "Merge locally",
    description: "Create one combined PDF in your browser, rename it, and download the result.",
  },
];

const pdfMergerMetadata: Metadata = createSeoMetadata({
  title: "Free PDF Merger | TinyUtility",
  description:
    "Merge PDF files online for free. Reorder, rotate, and combine PDFs privately in your browser with no uploads.",
  keywords: [
    "pdf merger",
    "merge pdf",
    "combine pdf",
    "free pdf merger",
    "reorder pdf",
    "rotate pdf",
    "private pdf merger",
    "TinyUtility",
  ],
  path: "/tools/pdf-merger",
});

const pdfCompressorFaq: FAQItem[] = [
  {
    question: "Are my PDFs uploaded anywhere?",
    answer: "No. Your PDF is loaded, compressed, and saved entirely in your browser. Nothing is uploaded.",
  },
  {
    question: "How does the compression actually work?",
    answer:
      "TinyUtility recompresses embedded JPEG images at your chosen quality level, downsamples oversized images, strips unnecessary metadata, and rebuilds the file using optimized object streams.",
  },
  {
    question: "Why didn't my PDF get much smaller?",
    answer:
      "PDFs made mostly of text and vector graphics, or that use image formats other than JPEG, have little left to compress. TinyUtility never fabricates savings — if a file is already efficient, it says so.",
  },
  {
    question: "Can I compress a password-protected PDF?",
    answer:
      "Not yet. Password-protected PDFs are not supported — remove the password first, then add the file again.",
  },
  {
    question: "Which compression level should I choose?",
    answer:
      "Medium is recommended for most files. Choose Light when image quality matters most, or Strong when file size matters most.",
  },
];

const pdfCompressorSteps: HowItWorksStep[] = [
  {
    title: "Add a PDF",
    description: "Drag and drop or browse for a PDF file up to 100 MB.",
  },
  {
    title: "Pick a compression level",
    description: "Choose Light, Medium, or Strong based on how much quality you're willing to trade for size.",
  },
  {
    title: "Compress locally",
    description: "Images are recompressed and the file is rebuilt in your browser, then ready to download.",
  },
];

const pdfCompressorMetadata: Metadata = createSeoMetadata({
  title: "Free PDF Compressor | TinyUtility",
  description:
    "Compress PDF files online for free. Shrink file size by recompressing embedded images and stripping unneeded data, entirely in your browser.",
  keywords: [
    "pdf compressor",
    "compress pdf",
    "reduce pdf size",
    "shrink pdf",
    "optimize pdf",
    "free pdf compressor",
    "private pdf compressor",
    "TinyUtility",
  ],
  path: "/tools/pdf-compressor",
});

const imageCompressorFaq: FAQItem[] = [
  {
    question: "Are my images uploaded anywhere?",
    answer: "No. Images are compressed entirely in your browser and never leave your device.",
  },
  {
    question: "Which image formats are supported?",
    answer: "You can upload JPEG, PNG, and WebP images and export as JPEG, PNG, or WebP.",
  },
  {
    question: "Does compression remove EXIF metadata?",
    answer:
      "Canvas exports create new image files and strip unnecessary EXIF metadata whenever the browser format encoder allows it.",
  },
  {
    question: "Can I compress multiple images at once?",
    answer:
      "Yes. Add multiple images, compress them together, then download individual files or a ZIP archive.",
  },
  {
    question: "Will transparency be preserved?",
    answer:
      "PNG and WebP can preserve transparency. JPEG cannot, so TinyUtility warns you before exporting transparent-capable images as JPEG.",
  },
];

const imageCompressorSteps: HowItWorksStep[] = [
  {
    title: "Add images",
    description: "Drag and drop or browse for JPG, PNG, and WebP files up to 100 MB each.",
  },
  {
    title: "Pick settings",
    description: "Choose quality, output format, and optional resizing while preserving aspect ratio.",
  },
  {
    title: "Compress locally",
    description: "Export lighter files in your browser, then download each image or a ZIP archive.",
  },
];

const imageCompressorMetadata: Metadata = createSeoMetadata({
  title: "Free Image Compressor | TinyUtility",
  description:
    "Compress JPG, PNG, and WebP images online for free. Resize, convert formats, and download optimized images privately in your browser.",
  keywords: [
    "image compressor",
    "compress images",
    "jpg compressor",
    "png compressor",
    "webp compressor",
    "resize image",
    "private image compression",
    "TinyUtility",
  ],
  path: "/tools/image-compressor",
});

const imageConverterFaq: FAQItem[] = [
  {
    question: "Are my images uploaded anywhere?",
    answer: "No. Images are converted entirely in your browser and never leave your device.",
  },
  {
    question: "Which conversions are supported?",
    answer: "You can convert between JPEG, PNG, and WebP formats in either direction.",
  },
  {
    question: "Can I convert multiple images at once?",
    answer:
      "Yes. Add multiple images, convert the batch locally, then download individual files or a ZIP archive.",
  },
  {
    question: "Can I paste images from the clipboard?",
    answer:
      "Yes. Copy an image from another app, then paste while this page is open to add it to the converter.",
  },
  {
    question: "Will transparency be preserved?",
    answer:
      "PNG and WebP can preserve transparency. JPEG cannot, so transparent pixels are flattened to white when exporting as JPEG.",
  },
];

const imageConverterSteps: HowItWorksStep[] = [
  {
    title: "Add images",
    description: "Drag and drop, browse, or paste JPG, PNG, and WebP images from your clipboard.",
  },
  {
    title: "Choose a format",
    description: "Pick JPEG, PNG, or WebP and adjust quality when the selected format supports it.",
  },
  {
    title: "Convert locally",
    description: "Create converted images in your browser, then download each file or the whole batch as a ZIP.",
  },
];

const imageConverterMetadata: Metadata = createSeoMetadata({
  title: "Free Image Converter | TinyUtility",
  description:
    "Convert JPG, PNG, and WebP images online for free. Batch convert images privately in your browser with no uploads.",
  keywords: [
    "image converter",
    "jpg to png",
    "png to jpg",
    "jpg to webp",
    "png to webp",
    "webp to jpg",
    "webp to png",
    "batch image converter",
    "private image conversion",
    "TinyUtility",
  ],
  path: "/tools/image-converter",
});

const qrCodeGeneratorFaq: FAQItem[] = [
  {
    question: "What is a QR code?",
    answer:
      "A QR code is a scannable two-dimensional barcode that can store text, links, contact details, Wi-Fi credentials, and other information.",
  },
  {
    question: "Is this QR Code Generator free?",
    answer: "Yes. TinyUtility lets you generate and download QR codes for free.",
  },
  {
    question: "Are my QR codes uploaded anywhere?",
    answer:
      "No. QR codes are generated entirely in your browser, and your text never leaves your device.",
  },
  {
    question: "Can I generate Wi-Fi QR codes?",
    answer:
      "Yes. Enter Wi-Fi credentials in the standard Wi-Fi QR format and the generated code can be scanned by supported devices.",
  },
  {
    question: "Can I use these QR codes commercially?",
    answer:
      "Yes. You can use the QR codes you create for personal or commercial projects.",
  },
];

const qrCodeGeneratorSteps: HowItWorksStep[] = [
  {
    title: "Enter your content",
    description: "Paste a URL, message, email address, phone number, or Wi-Fi credentials into the editor.",
  },
  {
    title: "Preview instantly",
    description: "TinyUtility generates the QR code locally in your browser as soon as the text changes.",
  },
  {
    title: "Download or copy",
    description: "Save the QR code as a PNG or copy the original text when you need to reuse it.",
  },
];

const qrCodeGeneratorMetadata: Metadata = createSeoMetadata({
  title: "Free QR Code Generator | TinyUtility",
  description:
    "Generate QR codes instantly for URLs, text, emails, Wi-Fi credentials, and more. Free online QR Code Generator by TinyUtility.",
  keywords: [
    "qr code generator",
    "free qr code",
    "generate qr code",
    "wifi qr code",
    "url qr code",
    "private qr generator",
    "TinyUtility",
  ],
  path: "/tools/qr-code-generator",
});

const wordCounterFaq: FAQItem[] = [
  {
    question: "Is my text uploaded anywhere?",
    answer: "No. Word counting and text analysis happen entirely in your browser.",
  },
  {
    question: "Can it handle large documents?",
    answer:
      "Yes. Analysis is debounced and uses efficient string scanning so typing, pasting, and scrolling stay responsive.",
  },
  {
    question: "How is reading time calculated?",
    answer: "Reading time is estimated at 225 words per minute. Speaking time uses 150 words per minute.",
  },
  {
    question: "Can I upload a text file?",
    answer: "Yes. Choose a TXT file and it will be read locally by your browser without uploading it.",
  },
];

const wordCounterSteps: HowItWorksStep[] = [
  {
    title: "Paste or type text",
    description: "Add text directly in the editor or load a TXT file from your device.",
  },
  {
    title: "Review live stats",
    description: "Word, character, sentence, paragraph, line, and timing metrics update as you write.",
  },
  {
    title: "Copy or export",
    description: "Copy the current text, clear the editor, or download the text as a TXT file.",
  },
];

const wordCounterMetadata: Metadata = createSeoMetadata({
  title: "Free Word Counter | TinyUtility",
  description:
    "Count words, characters, sentences, paragraphs, lines, reading time, and speaking time with a private browser-based word counter.",
  keywords: [
    "word counter",
    "character counter",
    "sentence counter",
    "paragraph counter",
    "reading time calculator",
    "speaking time calculator",
    "text analysis",
    "TinyUtility",
  ],
  path: "/tools/word-counter",
});

const jsonFormatterFaq: FAQItem[] = [
  {
    question: "Is my JSON uploaded anywhere?",
    answer: "No. JSON formatting, minifying, validation, copying, and downloads all happen in your browser.",
  },
  {
    question: "Can I format large JSON files?",
    answer:
      "Yes. The editor uses a lightweight textarea and only parses when needed, so typing stays responsive for typical large JSON files.",
  },
  {
    question: "Does formatting change my data?",
    answer:
      "Formatting preserves valid JSON data and only changes whitespace. Minify removes unnecessary whitespace.",
  },
  {
    question: "Why are Copy and Download disabled?",
    answer:
      "Copy and Download are enabled only when the editor contains valid JSON, which prevents saving an invalid result by mistake.",
  },
];

const jsonFormatterSteps: HowItWorksStep[] = [
  {
    title: "Add JSON",
    description: "Paste, type, upload, or drag and drop a .json file into the editor.",
  },
  {
    title: "Validate locally",
    description: "Live validation checks the JSON in your browser and shows useful error details when possible.",
  },
  {
    title: "Format or minify",
    description: "Pretty print with 2 or 4 spaces, minify, copy, or download the valid JSON file.",
  },
];

const jsonFormatterMetadata: Metadata = createSeoMetadata({
  title: "Free JSON Formatter | TinyUtility",
  description:
    "Format, minify, and validate JSON online for free. A fast private JSON formatter that runs entirely in your browser.",
  keywords: [
    "json formatter",
    "format json",
    "json validator",
    "json minifier",
    "pretty print json",
    "private json formatter",
    "TinyUtility",
  ],
  path: "/tools/json-formatter",
});

function buildPdfCompressorStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "PDF Compressor",
        url: absoluteUrl("/tools/pdf-compressor"),
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any (runs in the browser)",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description:
          "Compress PDF files online for free. Shrink file size by recompressing embedded images and stripping unneeded data, entirely in your browser.",
      },
      {
        "@type": "FAQPage",
        mainEntity: pdfCompressorFaq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export function generateStaticParams() {
  return tools.map((tool) => ({
    slug: tool.slug,
  }));
}

export async function generateMetadata({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return {
      title: "Tool Not Found | TinyUtility",
    };
  }

  if (slug === "image-compressor") {
    return imageCompressorMetadata;
  }

  if (slug === "image-converter") {
    return imageConverterMetadata;
  }

  if (slug === "pdf-merger") {
    return pdfMergerMetadata;
  }

  if (slug === "pdf-compressor") {
    return pdfCompressorMetadata;
  }

  if (slug === "qr-code-generator") {
    return qrCodeGeneratorMetadata;
  }

  if (slug === "word-counter") {
    return wordCounterMetadata;
  }

  if (slug === "json-formatter") {
    return jsonFormatterMetadata;
  }

  return createSeoMetadata({
    title: `${tool.title} | TinyUtility`,
    description: tool.description,
    path: `/tools/${tool.slug}`,
  });
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  const faqItems =
    slug === "password-generator"
      ? passwordGeneratorFaq
      : slug === "image-to-pdf"
        ? imageToPdfFaq
        : slug === "pdf-merger"
          ? pdfMergerFaq
          : slug === "pdf-compressor"
            ? pdfCompressorFaq
          : slug === "image-compressor"
            ? imageCompressorFaq
            : slug === "image-converter"
              ? imageConverterFaq
              : slug === "qr-code-generator"
                ? qrCodeGeneratorFaq
                : slug === "word-counter"
                  ? wordCounterFaq
                  : slug === "json-formatter"
                    ? jsonFormatterFaq
                  : [];
  const isPasswordGenerator = slug === "password-generator";
  const isImageToPdf = slug === "image-to-pdf";
  const isPdfMerger = slug === "pdf-merger";
  const isPdfCompressor = slug === "pdf-compressor";
  const isImageCompressor = slug === "image-compressor";
  const isImageConverter = slug === "image-converter";
  const isQrCodeGenerator = slug === "qr-code-generator";
  const isWordCounter = slug === "word-counter";
  const isJsonFormatter = slug === "json-formatter";

  return (
    <ToolLayout>
      <ToolContainer>
        <ToolHeader
          statusLabel={
            isPasswordGenerator ||
            isImageToPdf ||
            isPdfMerger ||
            isPdfCompressor ||
            isImageCompressor ||
            isImageConverter ||
            isQrCodeGenerator ||
            isWordCounter ||
            isJsonFormatter
              ? null
              : undefined
          }
          tool={tool}
        />
        {isPasswordGenerator ? (
          <>
            <PasswordGeneratorTool />
            <HowItWorks steps={passwordGeneratorSteps} title="Private password generation in your browser" />
          </>
        ) : null}
        {isImageToPdf ? (
          <>
            <ImageToPdfTool />
            <HowItWorks steps={imageToPdfSteps} title="Image to PDF conversion in your browser" />
          </>
        ) : null}
        {isPdfMerger ? (
          <>
            <PdfMergerTool />
            <HowItWorks steps={pdfMergerSteps} title="Private PDF merging in your browser" />
          </>
        ) : null}
        {isPdfCompressor ? (
          <>
            <PdfCompressorTool />
            <HowItWorks steps={pdfCompressorSteps} title="Private PDF compression in your browser" />
          </>
        ) : null}
        {isImageCompressor ? (
          <>
            <ImageCompressorTool />
            <HowItWorks steps={imageCompressorSteps} title="Private image compression in your browser" />
          </>
        ) : null}
        {isImageConverter ? (
          <>
            <ImageConverterTool />
            <HowItWorks steps={imageConverterSteps} title="Private image conversion in your browser" />
          </>
        ) : null}
        {isQrCodeGenerator ? (
          <>
            <QrCodeGeneratorTool />
            <HowItWorks steps={qrCodeGeneratorSteps} title="Private QR code generation in your browser" />
          </>
        ) : null}
        {isWordCounter ? (
          <>
            <WordCounterTool />
            <HowItWorks steps={wordCounterSteps} title="Private word counting in your browser" />
          </>
        ) : null}
        {isJsonFormatter ? (
          <>
            <JsonFormatterTool />
            <HowItWorks steps={jsonFormatterSteps} title="Private JSON formatting in your browser" />
          </>
        ) : null}
        <FAQSection items={faqItems} />
        <RelatedTools tools={getRelatedTools(slug)} />
      </ToolContainer>
      {isPdfCompressor ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildPdfCompressorStructuredData()),
          }}
          type="application/ld+json"
        />
      ) : null}
    </ToolLayout>
  );
}
