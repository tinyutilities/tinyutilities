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
import { PasswordGeneratorTool } from "@/features/tools/password-generator/password-generator-tool";
import { QrCodeGeneratorTool } from "@/features/tools/qr-code-generator/qr-code-generator-tool";
import { getRelatedTools, getToolBySlug, tools } from "@/features/tools/tool-data";
import { WordCounterTool } from "@/features/tools/word-counter/word-counter-tool";
import { createSeoMetadata } from "@/lib/seo";

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

  if (slug === "qr-code-generator") {
    return qrCodeGeneratorMetadata;
  }

  if (slug === "word-counter") {
    return wordCounterMetadata;
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
        : slug === "image-compressor"
          ? imageCompressorFaq
          : slug === "image-converter"
            ? imageConverterFaq
            : slug === "qr-code-generator"
              ? qrCodeGeneratorFaq
              : slug === "word-counter"
                ? wordCounterFaq
                : [];
  const isPasswordGenerator = slug === "password-generator";
  const isImageToPdf = slug === "image-to-pdf";
  const isImageCompressor = slug === "image-compressor";
  const isImageConverter = slug === "image-converter";
  const isQrCodeGenerator = slug === "qr-code-generator";
  const isWordCounter = slug === "word-counter";

  return (
    <ToolLayout>
      <ToolContainer>
        <ToolHeader
          statusLabel={
            isPasswordGenerator ||
            isImageToPdf ||
            isImageCompressor ||
            isImageConverter ||
            isQrCodeGenerator ||
            isWordCounter
              ? null
              : undefined
          }
          tool={tool}
        />
        {isPasswordGenerator ? (
          <>
            <PasswordGeneratorTool />
            <HowItWorks steps={passwordGeneratorSteps} />
          </>
        ) : null}
        {isImageToPdf ? (
          <>
            <ImageToPdfTool />
            <HowItWorks steps={imageToPdfSteps} />
          </>
        ) : null}
        {isImageCompressor ? (
          <>
            <ImageCompressorTool />
            <HowItWorks steps={imageCompressorSteps} />
          </>
        ) : null}
        {isImageConverter ? (
          <>
            <ImageConverterTool />
            <HowItWorks steps={imageConverterSteps} />
          </>
        ) : null}
        {isQrCodeGenerator ? (
          <>
            <QrCodeGeneratorTool />
            <HowItWorks steps={qrCodeGeneratorSteps} />
          </>
        ) : null}
        {isWordCounter ? (
          <>
            <WordCounterTool />
            <HowItWorks steps={wordCounterSteps} />
          </>
        ) : null}
        <FAQSection items={faqItems} />
        <RelatedTools tools={getRelatedTools(slug)} />
      </ToolContainer>
    </ToolLayout>
  );
}
