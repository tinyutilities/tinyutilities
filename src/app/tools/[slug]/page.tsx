import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/tools/breadcrumbs";
import { FAQSection, type FAQItem } from "@/components/tools/faq-section";
import { HowItWorks, type HowItWorksStep } from "@/components/tools/how-it-works";
import { RelatedTools } from "@/components/tools/related-tools";
import { ToolContainer } from "@/components/tools/tool-container";
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ToolLayout } from "@/components/tools/tool-layout";
import { UseCases, type UseCase } from "@/components/tools/use-cases";
import { FindAndReplaceTool } from "@/features/tools/find-and-replace/find-and-replace-tool";
import { TextDiffTool } from "@/features/tools/text-diff/text-diff-tool";
import { ImageCompressorTool } from "@/features/tools/image-compressor/image-compressor-tool";
import { ImageConverterTool } from "@/features/tools/image-converter/image-converter-tool";
import { ImageCropperTool } from "@/features/tools/image-cropper/image-cropper-tool";
import { ImageResizerTool } from "@/features/tools/image-resizer/image-resizer-tool";
import { ImageToPdfTool } from "@/features/tools/image-to-pdf/image-to-pdf-tool";
import { JsonFormatterTool } from "@/features/tools/json-formatter/json-formatter-tool";
import { UrlEncoderDecoderTool } from "@/features/tools/url-encoder-decoder/url-encoder-decoder-tool";
import { UuidGeneratorTool } from "@/features/tools/uuid-generator/uuid-generator-tool";
import { TimestampConverterTool } from "@/features/tools/timestamp-converter/timestamp-converter-tool";
import { RegexTesterTool } from "@/features/tools/regex-tester/regex-tester-tool";
import { PasswordGeneratorTool } from "@/features/tools/password-generator/password-generator-tool";
import { PdfCompressorTool } from "@/features/tools/pdf-compressor/pdf-compressor-tool";
import { PdfMergerTool } from "@/features/tools/pdf-merger/pdf-merger-tool";
import { PdfMetadataCleanerTool } from "@/features/tools/pdf-metadata-cleaner/pdf-metadata-cleaner-tool";
import { PdfPageEditorTool } from "@/features/tools/pdf-page-editor/pdf-page-editor-tool";
import { PdfPageExtractorTool } from "@/features/tools/pdf-page-extractor/pdf-page-extractor-tool";
import { PdfSplitterTool } from "@/features/tools/pdf-splitter/pdf-splitter-tool";
import { QrCodeGeneratorTool } from "@/features/tools/qr-code-generator/qr-code-generator-tool";
import { getRelatedTools, getToolBySlug, toolCategories, tools, type Tool } from "@/features/tools/tool-data";
import { WordCounterTool } from "@/features/tools/word-counter/word-counter-tool";
import { ZipCreatorTool } from "@/features/tools/zip-creator/zip-creator-tool";
import { ZipExtractorTool } from "@/features/tools/zip-extractor/zip-extractor-tool";
import { absoluteUrl, createSeoMetadata } from "@/lib/seo";

type ToolPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

// Shared style for a contextual link inside a ToolIntro paragraph, e.g. "Try the Image
// Converter." — a real sentence, not a "related tools" card (that already exists further down).
const inlineLinkClass = "text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 transition hover:text-cyan-200";

function PasswordGeneratorIntro() {
  return (
    <ToolIntro>
      Create a strong, random password with the character types you choose — generated locally
      in your browser and never sent anywhere. Sharing Wi-Fi access instead of a password?
      Turn the result into a scannable code with the{" "}
      <Link className={inlineLinkClass} href="/tools/qr-code-generator">
        QR Code Generator
      </Link>
      .
    </ToolIntro>
  );
}

const passwordGeneratorUseCases: UseCase[] = [
  {
    title: "New account signup",
    description: "Generate a strong password instead of reusing an old one when creating an account.",
  },
  {
    title: "Password manager habit",
    description: "Create a random password to save directly in a password manager.",
  },
  {
    title: "Shared Wi-Fi",
    description: "Generate a strong Wi-Fi password, especially before sharing it with guests.",
  },
];

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

function ImageToPdfIntro() {
  return (
    <ToolIntro>
      Turn a set of JPG, PNG, or WEBP images — scanned pages, receipts, or a small photo set —
      into a single, shareable PDF, reordered and sized entirely in your browser. Already have
      PDF files to combine instead? Use{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-merger">
        PDF Merger
      </Link>
      , or shrink the result afterward with{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-compressor">
        PDF Compressor
      </Link>
      .
    </ToolIntro>
  );
}

const imageToPdfUseCases: UseCase[] = [
  {
    title: "Scanned documents",
    description: "Combine photos of a signed form or receipt into one PDF for submission.",
  },
  {
    title: "Simple portfolios",
    description: "Turn a handful of images into a single PDF to send or print.",
  },
  {
    title: "Print-ready pages",
    description: "Choose a standard page size and orientation before printing a photo set.",
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

function PdfMergerIntro() {
  return (
    <ToolIntro>
      Combine multiple PDF files into a single document, reordering and rotating pages before
      you download — entirely in your browser. If the merged file ends up too large to email or
      upload, run it through{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-compressor">
        PDF Compressor
      </Link>{" "}
      afterward.
    </ToolIntro>
  );
}

const pdfMergerUseCases: UseCase[] = [
  {
    title: "Combine reports",
    description: "Merge separate chapters or sections into one final document.",
  },
  {
    title: "Fix page order",
    description: "Reorder or rotate pages from a scanned document that came out of order.",
  },
  {
    title: "One file, not five",
    description: "Merge multiple invoices or receipts before submitting them together.",
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
  path: "/tools/pdf-merger",
});

function PdfCompressorIntro() {
  return (
    <ToolIntro>
      Shrink a PDF that&apos;s too large to email or upload by recompressing its embedded
      images — entirely in your browser. Need to combine files first? Merge them with{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-merger">
        PDF Merger
      </Link>{" "}
      before compressing the result.
    </ToolIntro>
  );
}

const pdfCompressorUseCases: UseCase[] = [
  {
    title: "Email attachments",
    description: "Get a scanned or image-heavy PDF under your email provider's size limit.",
  },
  {
    title: "Upload limits",
    description: "Meet a job application, form, or portal's maximum file size.",
  },
  {
    title: "Faster sharing",
    description: "Shrink a large PDF before sending it over a slow connection.",
  },
];

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
  path: "/tools/pdf-compressor",
});

function PdfPageExtractorIntro() {
  return (
    <ToolIntro>
      Pull specific pages out of a PDF — say, pages 1, 3, and 8 through 12 — and save them as a
      new PDF, entirely in your browser. Need to combine the result with another file afterward?
      Use{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-merger">
        PDF Merger
      </Link>
      , or shrink it with{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-compressor">
        PDF Compressor
      </Link>
      .
    </ToolIntro>
  );
}

const pdfPageExtractorUseCases: UseCase[] = [
  {
    title: "Just the relevant pages",
    description: "Pull the pages you actually need from a long report instead of sending the whole thing.",
  },
  {
    title: "Assignment or problem set",
    description: "Save only your solutions from a scanned assignment or worksheet packet.",
  },
  {
    title: "A smaller, focused PDF",
    description: "Create a shorter PDF containing just the pages relevant to one topic or section.",
  },
];

const pdfPageExtractorFaq: FAQItem[] = [
  {
    question: "Is my PDF uploaded anywhere?",
    answer: "No. Your PDF is loaded, and the new PDF is created, entirely in your browser.",
  },
  {
    question: "What order are the extracted pages in?",
    answer:
      "Extracted pages always keep their original order from the source PDF, regardless of the order you selected them in.",
  },
  {
    question: "Can I select pages with a text field instead of clicking?",
    answer:
      "Yes. Type page numbers and ranges like \"1, 3, 5-8\" and click Apply — it replaces the current selection.",
  },
  {
    question: "Can I extract pages from a password-protected PDF?",
    answer: "Not yet. Remove the password first, then add the file again.",
  },
];

const pdfPageExtractorSteps: HowItWorksStep[] = [
  {
    title: "Add a PDF",
    description: "Drag and drop or browse for a PDF file up to 100 MB.",
  },
  {
    title: "Select pages",
    description: "Tap the pages you want to keep, or type page numbers and ranges.",
  },
  {
    title: "Extract locally",
    description: "Create the new PDF in your browser, rename it, and download the result.",
  },
];

const pdfPageExtractorMetadata: Metadata = createSeoMetadata({
  title: "PDF Page Extractor – Extract Pages from PDF | TinyUtility",
  description:
    "Select specific pages from a PDF and save them as a new PDF, entirely in your browser. No uploads, no page limit beyond your own file.",
  path: "/tools/pdf-page-extractor",
});

function PdfPageEditorIntro() {
  return (
    <ToolIntro>
      Rotate pages that scanned in sideways and remove the ones you don&apos;t need, then save the
      result as a new PDF — entirely in your browser. Need only a handful of pages instead? Try{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-page-extractor">
        PDF Page Extractor
      </Link>
      , or combine the result with another file using{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-merger">
        PDF Merger
      </Link>
      .
    </ToolIntro>
  );
}

const pdfPageEditorUseCases: UseCase[] = [
  {
    title: "Fix a sideways scan",
    description: "Rotate pages that came out of a scanner rotated 90° or upside down.",
  },
  {
    title: "Remove blank or unwanted pages",
    description: "Delete cover sheets, blank pages, or scanned pages you don't need before sharing a PDF.",
  },
  {
    title: "Clean up before sending",
    description: "Straighten and trim a document down to just the pages that matter.",
  },
];

const pdfPageEditorFaq: FAQItem[] = [
  {
    question: "Is my PDF uploaded anywhere?",
    answer: "No. Your PDF is loaded, and the new PDF is created, entirely in your browser.",
  },
  {
    question: "How do I rotate or delete pages?",
    answer:
      "Select one or more pages in the grid, then use Rotate Left, Rotate Right, or Delete Selected. Each page's thumbnail shows its current rotation and deletion state.",
  },
  {
    question: "Can I undo a deletion before exporting?",
    answer:
      "Yes. Deleted pages stay visible in the grid marked \"Deleted\" — select them and click Restore Selected any time before you export.",
  },
  {
    question: "Can I export a PDF with zero pages?",
    answer: "No. Export is disabled if every page is marked for deletion — keep at least one page.",
  },
  {
    question: "Can I edit a password-protected PDF?",
    answer: "Not yet. Remove the password first, then add the file again.",
  },
];

const pdfPageEditorSteps: HowItWorksStep[] = [
  {
    title: "Add a PDF",
    description: "Drag and drop or browse for a PDF file up to 100 MB.",
  },
  {
    title: "Rotate and delete pages",
    description: "Select pages, then rotate them left/right or mark them for deletion.",
  },
  {
    title: "Export locally",
    description: "Create the new PDF in your browser, rename it, and download the result.",
  },
];

const pdfPageEditorMetadata: Metadata = createSeoMetadata({
  title: "PDF Page Editor – Rotate & Delete PDF Pages | TinyUtility",
  description:
    "Rotate and delete pages in a PDF, then save the result as a new PDF, entirely in your browser. No uploads, no page limit beyond your own file.",
  path: "/tools/pdf-page-editor",
});

function PdfSplitterIntro() {
  return (
    <ToolIntro>
      Split one PDF into several smaller PDFs — by page range, every few pages, or wherever you
      want a new file to start — entirely in your browser. Only need a few pages pulled out
      instead? Try{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-page-extractor">
        PDF Page Extractor
      </Link>
      , or put files back together afterward with{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-merger">
        PDF Merger
      </Link>
      .
    </ToolIntro>
  );
}

const pdfSplitterUseCases: UseCase[] = [
  {
    title: "Break up a long report",
    description: "Split a large report into separate PDFs for each chapter or section.",
  },
  {
    title: "Share only part of a scan",
    description: "Split a scanned batch into individual PDFs for each document it contains.",
  },
  {
    title: "Even-sized chunks",
    description: "Split a long PDF into equal-sized pieces, like every 10 pages, for easier review.",
  },
];

const pdfSplitterFaq: FAQItem[] = [
  {
    question: "Is my PDF uploaded anywhere?",
    answer: "No. Your PDF is loaded, and the new PDFs are created, entirely in your browser.",
  },
  {
    question: "How does the page range syntax work?",
    answer:
      "Each comma-separated group becomes its own PDF — \"1-3, 4-6\" creates two files. Every page must belong to exactly one group.",
  },
  {
    question: "What happens if my ranges overlap or skip a page?",
    answer:
      "You'll see a clear error message, such as which page is included in more than one group, and Split stays disabled until it's fixed.",
  },
  {
    question: "How do I download the results?",
    answer:
      "All generated PDFs are packaged into one ZIP file by default. You can also download each PDF individually from the results list.",
  },
  {
    question: "Can I split a password-protected PDF?",
    answer: "Not yet. Remove the password first, then add the file again.",
  },
];

const pdfSplitterSteps: HowItWorksStep[] = [
  {
    title: "Add a PDF",
    description: "Drag and drop or browse for a PDF file up to 100 MB.",
  },
  {
    title: "Choose how to split it",
    description: "Define page ranges, split every N pages, or split after specific pages.",
  },
  {
    title: "Split locally",
    description: "Create the PDFs in your browser, then download them as a ZIP or individually.",
  },
];

const pdfSplitterMetadata: Metadata = createSeoMetadata({
  title: "Free PDF Splitter | TinyUtility",
  description:
    "Split a PDF into multiple PDFs by page range, every N pages, or page breaks, entirely in your browser. Download the results as a ZIP or individually.",
  path: "/tools/pdf-splitter",
});

function PdfMetadataCleanerIntro() {
  return (
    <ToolIntro>
      See what standard metadata your PDF carries — Title, Author, Creator, and more — and clear
      it in your browser before sharing the file. Want to change the file itself first? Try{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-compressor">
        PDF Compressor
      </Link>{" "}
      or{" "}
      <Link className={inlineLinkClass} href="/tools/pdf-page-editor">
        PDF Page Editor
      </Link>
      .
    </ToolIntro>
  );
}

const pdfMetadataCleanerUseCases: UseCase[] = [
  {
    title: "Before sharing externally",
    description: "Clear the author name and organization details left in a document's properties.",
  },
  {
    title: "Reused templates",
    description: "Remove leftover Title, Subject, or Keywords from a document created from an old template.",
  },
  {
    title: "Check what's in a file",
    description: "See a PDF's metadata fields before deciding whether they need to be cleared.",
  },
];

const pdfMetadataCleanerFaq: FAQItem[] = [
  {
    question: "Is my PDF uploaded anywhere?",
    answer: "No. Your PDF is inspected, cleaned, and re-checked entirely in your browser.",
  },
  {
    question: "What metadata does this clear?",
    answer:
      "The standard PDF document properties: Title, Author, Subject, Keywords, Creator, Producer, Creation Date, and Modification Date, plus an embedded XMP metadata packet if one is present.",
  },
  {
    question: "Does this remove everything that could identify me in the PDF?",
    answer:
      "No. This clears the standard metadata fields listed above. It doesn't guarantee removal of embedded objects, attachments, annotations, hidden layers, or other application-specific data a PDF can contain.",
  },
  {
    question: "How do I know the cleaning actually worked?",
    answer:
      "After cleaning, the tool reloads the generated PDF and shows you its actual resulting metadata, rather than just assuming the operation succeeded.",
  },
  {
    question: "Can I clean a password-protected PDF?",
    answer: "Not yet. Remove the password first, then add the file again.",
  },
];

const pdfMetadataCleanerSteps: HowItWorksStep[] = [
  {
    title: "Add a PDF",
    description: "Drag and drop or browse for a PDF file up to 100 MB.",
  },
  {
    title: "Review its metadata",
    description: "See the standard document fields detected in your PDF.",
  },
  {
    title: "Clean locally",
    description: "Clear the supported fields in your browser, then download the result.",
  },
];

const pdfMetadataCleanerMetadata: Metadata = createSeoMetadata({
  title: "Free PDF Metadata Cleaner | TinyUtility",
  description:
    "View and clear standard PDF metadata — Title, Author, Creator, and more — entirely in your browser. No uploads, and the result is re-checked after cleaning.",
  path: "/tools/pdf-metadata-cleaner",
});

function ImageCompressorIntro() {
  return (
    <ToolIntro>
      Large photos slow down uploads, fill up storage, and can bounce email attachment limits.
      Compress JPG, PNG, or WebP images entirely in your browser and pick a quality level that
      keeps them looking sharp. Need a different file format instead? Try the{" "}
      <Link className={inlineLinkClass} href="/tools/image-converter">
        Image Converter
      </Link>
      .
    </ToolIntro>
  );
}

const imageCompressorUseCases: UseCase[] = [
  {
    title: "Email attachments",
    description: "Shrink a photo below your email provider's size limit before attaching it.",
  },
  {
    title: "Faster websites",
    description: "Compress product photos or blog images so pages load quicker.",
  },
  {
    title: "Save storage",
    description: "Reduce a batch of photos before backing them up or archiving them.",
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
  path: "/tools/image-compressor",
});

function ImageConverterIntro() {
  return (
    <ToolIntro>
      Not every app or platform accepts every image format. Convert JPG, PNG, and WebP files
      into each other locally in your browser, then use{" "}
      <Link className={inlineLinkClass} href="/tools/image-compressor">
        Image Compressor
      </Link>{" "}
      if the result is still too large, or{" "}
      <Link className={inlineLinkClass} href="/tools/image-to-pdf">
        Image to PDF
      </Link>{" "}
      to turn a batch of images into one document.
    </ToolIntro>
  );
}

const imageConverterUseCases: UseCase[] = [
  {
    title: "Platform requirements",
    description: "Convert a WebP image to JPG when a site or app doesn't accept WebP.",
  },
  {
    title: "Smaller web images",
    description: "Convert PNG screenshots to WebP for a smaller file at similar quality.",
  },
  {
    title: "Consistent formats",
    description: "Standardize a folder of mixed image formats before sharing them.",
  },
];

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
  path: "/tools/image-converter",
});

function ImageResizerIntro() {
  return (
    <ToolIntro>
      Change an image&apos;s dimensions for a website, social media post, or upload limit —
      entirely in your browser. Lock the aspect ratio to scale proportionally, or unlock it for
      exact width and height. Need a specific crop instead of a resize? Try the{" "}
      <Link className={inlineLinkClass} href="/tools/image-cropper">
        Image Cropper
      </Link>
      , or shrink the file size with{" "}
      <Link className={inlineLinkClass} href="/tools/image-compressor">
        Image Compressor
      </Link>
      .
    </ToolIntro>
  );
}

const imageResizerUseCases: UseCase[] = [
  {
    title: "Resize for the web",
    description: "Scale a photo down to the exact dimensions a website or CMS expects.",
  },
  {
    title: "Social media dimensions",
    description: "Match the pixel dimensions a platform recommends for posts, banners, or avatars.",
  },
  {
    title: "Smaller uploads",
    description: "Shrink a large camera photo before attaching it somewhere with a size limit.",
  },
];

const imageResizerFaq: FAQItem[] = [
  {
    question: "Are my images uploaded anywhere?",
    answer: "No. Images are resized entirely in your browser and never leave your device.",
  },
  {
    question: "Which image formats are supported?",
    answer: "You can upload JPEG, PNG, or WebP images. The resized image keeps the same format.",
  },
  {
    question: "Does resizing keep the aspect ratio?",
    answer:
      "Yes, when the lock is on. Turn it off if you need to set width and height independently.",
  },
  {
    question: "Can I resize the same image again with different dimensions?",
    answer: "Yes. Adjust the width or height and resize again without re-uploading the file.",
  },
];

const imageResizerSteps: HowItWorksStep[] = [
  {
    title: "Add an image",
    description: "Drag and drop or browse for a JPG, PNG, or WebP file up to 100 MB.",
  },
  {
    title: "Set dimensions",
    description: "Enter a width and height, keeping the aspect ratio locked or setting it free.",
  },
  {
    title: "Resize locally",
    description: "Create the resized image in your browser, rename it, and download the result.",
  },
];

const imageResizerMetadata: Metadata = createSeoMetadata({
  title: "Free Image Resizer | TinyUtility",
  description:
    "Resize JPG, PNG, and WebP images online for free. Change image dimensions with a locked or free aspect ratio, entirely in your browser.",
  path: "/tools/image-resizer",
});

function ImageCropperIntro() {
  return (
    <ToolIntro>
      Crop an image to the exact area or aspect ratio you need — for a profile photo, a social
      post, or just to remove the edges — entirely in your browser. Drag the box to reposition it
      or a corner handle to resize it. Need exact pixel dimensions instead of a crop area? Try the{" "}
      <Link className={inlineLinkClass} href="/tools/image-resizer">
        Image Resizer
      </Link>
      .
    </ToolIntro>
  );
}

const imageCropperUseCases: UseCase[] = [
  {
    title: "Profile and avatar photos",
    description: "Crop a photo to a square before uploading it as a profile picture.",
  },
  {
    title: "Social media crops",
    description: "Crop to a platform's recommended aspect ratio, like 1:1, 4:3, or 16:9.",
  },
  {
    title: "Remove unwanted edges",
    description: "Trim distracting background or empty space from a screenshot or photo.",
  },
];

const imageCropperFaq: FAQItem[] = [
  {
    question: "Are my images uploaded anywhere?",
    answer: "No. Images are cropped entirely in your browser and never leave your device.",
  },
  {
    question: "Which image formats are supported?",
    answer: "You can upload JPEG, PNG, or WebP images. The cropped image keeps the same format.",
  },
  {
    question: "Can I use a specific aspect ratio?",
    answer: "Yes. Choose Free, 1:1, 4:3, or 16:9, or drag the crop box freely with no preset.",
  },
  {
    question: "Does this work on a phone?",
    answer: "Yes. The crop box supports touch dragging and resizing on mobile, not just a mouse.",
  },
  {
    question: "Can I crop the same image again with a different area?",
    answer: "Yes. Adjust the crop box and crop again without re-uploading the file.",
  },
];

const imageCropperSteps: HowItWorksStep[] = [
  {
    title: "Add an image",
    description: "Drag and drop or browse for a JPG, PNG, or WebP file up to 100 MB.",
  },
  {
    title: "Select the crop area",
    description: "Drag the box to move it or a corner handle to resize it, with optional aspect-ratio presets.",
  },
  {
    title: "Crop locally",
    description: "Create the cropped image in your browser, rename it, and download the result.",
  },
];

const imageCropperMetadata: Metadata = createSeoMetadata({
  title: "Free Image Cropper | TinyUtility",
  description:
    "Crop JPG, PNG, and WebP images online for free. Drag to select the area, choose a preset aspect ratio, and download privately from your browser.",
  path: "/tools/image-cropper",
});

function QrCodeGeneratorIntro() {
  return (
    <ToolIntro>
      Turn a URL, message, Wi-Fi login, or contact detail into a scannable QR code, generated
      locally and ready to download as a PNG. Generated a strong Wi-Fi password with the{" "}
      <Link className={inlineLinkClass} href="/tools/password-generator">
        Password Generator
      </Link>
      ? Turn it into a code guests can scan instead of typing.
    </ToolIntro>
  );
}

const qrCodeGeneratorUseCases: UseCase[] = [
  {
    title: "Wi-Fi sharing",
    description: "Let guests join your Wi-Fi by scanning a code instead of typing a password.",
  },
  {
    title: "Print materials",
    description: "Add a scannable link to a flyer, menu, or business card.",
  },
  {
    title: "Quick sharing",
    description: "Share a URL or message with someone nearby without reading it aloud.",
  },
];

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
  path: "/tools/qr-code-generator",
});

function WordCounterIntro() {
  return (
    <ToolIntro>
      Check word count, character count, and estimated reading time for an essay, article, or
      script — updated live as you type or paste, entirely in your browser.
    </ToolIntro>
  );
}

const wordCounterUseCases: UseCase[] = [
  {
    title: "Meet a word limit",
    description: "Check an essay, application, or article against a required word count.",
  },
  {
    title: "Estimate reading time",
    description: "See how long a blog post or script will take to read or narrate.",
  },
  {
    title: "Clean text stats",
    description: "Get character and sentence counts for captions or metadata fields.",
  },
];

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
  path: "/tools/word-counter",
});

function FindAndReplaceIntro() {
  return (
    <ToolIntro>
      Find every occurrence of a word or phrase and replace it, with case-sensitive and
      whole-word options, entirely in your browser. Just need to count words instead? Try the{" "}
      <Link className={inlineLinkClass} href="/tools/word-counter">
        Word Counter
      </Link>
      .
    </ToolIntro>
  );
}

const findAndReplaceUseCases: UseCase[] = [
  {
    title: "Clean up pasted text",
    description: "Replace smart quotes, stray characters, or inconsistent spacing in pasted content.",
  },
  {
    title: "Update repeated terms",
    description: "Swap a name, term, or placeholder that appears many times throughout a document.",
  },
  {
    title: "Remove unwanted text",
    description: "Delete every occurrence of a word or phrase by replacing it with nothing.",
  },
];

const findAndReplaceFaq: FAQItem[] = [
  {
    question: "Is my text uploaded anywhere?",
    answer: "No. Text is searched and replaced entirely in your browser.",
  },
  {
    question: "Is Find treated as plain text or a pattern?",
    answer: "Plain text only. There's no regex mode, so characters like . * and ( are matched literally.",
  },
  {
    question: "Can I remove text instead of replacing it?",
    answer: "Yes. Leave \"Replace with\" empty and click Replace All to delete every match.",
  },
  {
    question: "How does \"Match whole word\" handle non-English text?",
    answer:
      "It treats letters and numbers from any language as word characters, not just English ones. Languages without spaces between words, like Japanese, may not segment the way you expect.",
  },
  {
    question: "Can I undo a replacement?",
    answer: "Yes. \"Restore Original\" brings back the text from immediately before your last Replace All.",
  },
];

const findAndReplaceSteps: HowItWorksStep[] = [
  {
    title: "Add your text",
    description: "Type, paste, or upload a TXT file into the editor.",
  },
  {
    title: "Set Find and Replace",
    description: "Enter what to find and what to replace it with, and adjust the match options.",
  },
  {
    title: "Replace and download",
    description: "Click Replace All, then download the result as a TXT file.",
  },
];

const findAndReplaceMetadata: Metadata = createSeoMetadata({
  title: "Free Find & Replace | TinyUtility",
  description:
    "Find and replace text online for free, with case-sensitive and whole-word options, entirely in your browser. No uploads.",
  path: "/tools/find-and-replace",
});

function TextDiffIntro() {
  return (
    <ToolIntro>
      Paste or upload two versions of a text and instantly see every line that was added,
      removed, or left unchanged, entirely in your browser. Need to search and replace text
      instead? Try{" "}
      <Link className={inlineLinkClass} href="/tools/find-and-replace">
        Find &amp; Replace
      </Link>
      .
    </ToolIntro>
  );
}

const textDiffUseCases: UseCase[] = [
  {
    title: "Review edits to a document",
    description: "Compare an earlier draft against a newer one to see exactly what changed.",
  },
  {
    title: "Check config or data files",
    description: "Spot line-level changes between two versions of a config, log, or export.",
  },
  {
    title: "Verify a copy-paste or migration",
    description: "Confirm that copied or migrated text matches the original, line for line.",
  },
];

const textDiffFaq: FAQItem[] = [
  {
    question: "Is my text uploaded anywhere?",
    answer: "No. Both texts are compared entirely in your browser, and nothing is sent anywhere.",
  },
  {
    question: "Does it compare whole words or characters, or just lines?",
    answer:
      "Lines. Each line is compared as a whole, so a single-character change makes that whole line show as removed and re-added.",
  },
  {
    question: "What if the two texts are identical?",
    answer: "You'll see a clear \"no differences\" message instead of an empty result.",
  },
  {
    question: "Is there a size limit?",
    answer:
      "There's no fixed limit, but extremely large and almost entirely different texts (tens of thousands of lines) may take a few seconds or be blocked to avoid freezing your browser.",
  },
  {
    question: "Can I compare uploaded TXT files?",
    answer: "Yes. Upload a TXT file into either side, and you can still edit it afterward.",
  },
];

const textDiffSteps: HowItWorksStep[] = [
  {
    title: "Add Text A and Text B",
    description: "Type, paste, or upload a TXT file into each side.",
  },
  {
    title: "Click Compare",
    description: "See a line-by-line diff with a summary of what was added, removed, and unchanged.",
  },
  {
    title: "Copy or download",
    description: "Copy the diff to your clipboard, or download it as a TXT file.",
  },
];

const textDiffMetadata: Metadata = createSeoMetadata({
  title: "Free Text Diff / Compare Tool | TinyUtility",
  description:
    "Compare two blocks of text online for free and see exactly what changed, line by line, entirely in your browser. No uploads.",
  path: "/tools/text-diff",
});

function ZipCreatorIntro() {
  return (
    <ToolIntro>
      Select multiple files and package them into one ZIP archive, entirely in your browser.
      Review what&apos;s included, remove anything you don&apos;t need, and rename the archive
      before downloading — duplicate filenames are handled automatically so nothing gets
      overwritten.
    </ToolIntro>
  );
}

const zipCreatorUseCases: UseCase[] = [
  {
    title: "Send several files at once",
    description: "Package a handful of documents or images into one file before emailing them.",
  },
  {
    title: "Back up a small set of files",
    description: "Bundle related files together into a single archive for storage.",
  },
  {
    title: "Organize files for upload",
    description: "Combine files into one ZIP for platforms that only accept a single upload.",
  },
];

const zipCreatorFaq: FAQItem[] = [
  {
    question: "Are my files uploaded anywhere?",
    answer: "No. Your files are read and packaged into a ZIP entirely in your browser.",
  },
  {
    question: "What happens if two files have the same name?",
    answer:
      "The first keeps its name. Later files with the same name are automatically renamed, like \"report (2).pdf\", so nothing is overwritten.",
  },
  {
    question: "Will the ZIP make my files much smaller?",
    answer:
      "It depends on the file type. Text-like files often shrink noticeably. Already-compressed formats like JPG, PNG, and MP4 usually won't shrink much.",
  },
  {
    question: "Is there a file size limit?",
    answer: "Each file must be 500 MB or smaller. Very large combined selections may be limited by your browser's available memory.",
  },
];

const zipCreatorSteps: HowItWorksStep[] = [
  {
    title: "Add files",
    description: "Drag and drop or browse for the files you want to package, up to 500 MB each.",
  },
  {
    title: "Review the list",
    description: "Check what's included and remove anything you don't want in the archive.",
  },
  {
    title: "Create the ZIP",
    description: "Build the archive locally, rename it, and download the result.",
  },
];

const zipCreatorMetadata: Metadata = createSeoMetadata({
  title: "Free ZIP Creator | TinyUtility",
  description:
    "Combine multiple files into one ZIP archive online for free, entirely in your browser. No uploads, with automatic handling of duplicate filenames.",
  path: "/tools/zip-creator",
});

function ZipExtractorIntro() {
  return (
    <ToolIntro>
      Open a ZIP archive, see what&apos;s inside, and extract the files you need — entirely in
      your browser. Need to go the other way and package files together instead? Try{" "}
      <Link className={inlineLinkClass} href="/tools/zip-creator">
        ZIP Creator
      </Link>
      .
    </ToolIntro>
  );
}

const zipExtractorUseCases: UseCase[] = [
  {
    title: "Open a downloaded ZIP",
    description: "See what's inside an archive before extracting everything from it.",
  },
  {
    title: "Grab just a few files",
    description: "Extract only the files you need from a large archive instead of all of them.",
  },
  {
    title: "Recover files from an old backup",
    description: "Open an archive and pull out specific files without extra desktop software.",
  },
];

const zipExtractorFaq: FAQItem[] = [
  {
    question: "Is my ZIP uploaded anywhere?",
    answer: "No. Your ZIP is inspected and extracted entirely in your browser.",
  },
  {
    question: "What happens with folders inside the ZIP?",
    answer: "Folder structure is preserved in file paths and in the extracted ZIP you download.",
  },
  {
    question: "Can I extract a password-protected ZIP?",
    answer: "Not currently. Password-protected ZIPs aren't supported yet.",
  },
  {
    question: "Is there a limit on archive size?",
    answer:
      "Archives are checked against their actual uncompressed size, not just the upload size, and extraction is blocked if that's over 1 GB or the archive has more than 10,000 files — this protects your browser tab from archives designed to expand enormously.",
  },
  {
    question: "How do I download the extracted files?",
    answer:
      "Extracted files are packaged into one ZIP by default. You can also download individual files from the results list.",
  },
];

const zipExtractorSteps: HowItWorksStep[] = [
  {
    title: "Add a ZIP",
    description: "Drag and drop or browse for a ZIP file up to 500 MB.",
  },
  {
    title: "Review the contents",
    description: "See every file inside, then select specific files or extract everything.",
  },
  {
    title: "Extract locally",
    description: "Build the extracted files in your browser, then download them as a ZIP or individually.",
  },
];

const zipExtractorMetadata: Metadata = createSeoMetadata({
  title: "Free ZIP Extractor | TinyUtility",
  description:
    "Open and extract ZIP archives online for free, entirely in your browser. Inspect the contents, select files, and download the result. No uploads.",
  path: "/tools/zip-extractor",
});

function JsonFormatterIntro() {
  return (
    <ToolIntro>
      Paste messy or minified JSON to format, validate, or minify it, with live error feedback —
      all processed locally in your browser. Working on an API or config file? Pair this with the{" "}
      <Link className={inlineLinkClass} href="/tools/password-generator">
        Password Generator
      </Link>{" "}
      for secrets, or the{" "}
      <Link className={inlineLinkClass} href="/tools/qr-code-generator">
        QR Code Generator
      </Link>{" "}
      to share a quick link.
    </ToolIntro>
  );
}

const jsonFormatterUseCases: UseCase[] = [
  {
    title: "Debug API responses",
    description: "Paste a minified API response to make it readable and spot errors.",
  },
  {
    title: "Clean up config files",
    description: "Format JSON config files consistently before committing them.",
  },
  {
    title: "Validate before use",
    description: "Check that hand-written JSON is valid before pasting it into code.",
  },
];

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
  path: "/tools/json-formatter",
});

function UrlEncoderDecoderIntro() {
  return (
    <ToolIntro>
      Encode text into a URI-safe component or decode a percent-encoded string, entirely in your
      browser. This encodes and decodes URI components — the same behavior as JavaScript&apos;s{" "}
      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">encodeURIComponent</code> — not a full-URL parser. Need to
      compare two versions of text instead? Try{" "}
      <Link className={inlineLinkClass} href="/tools/text-diff">
        Text Diff
      </Link>
      .
    </ToolIntro>
  );
}

const urlEncoderDecoderUseCases: UseCase[] = [
  {
    title: "Build a query string value",
    description: "Encode a value like a search term or redirect URL before adding it to a query string.",
  },
  {
    title: "Debug a percent-encoded URL",
    description: "Decode a URL from logs or a browser address bar to read it in plain text.",
  },
  {
    title: "Check what a link actually contains",
    description: "Decode a shared link to verify its parameters before clicking or sharing it further.",
  },
];

const urlEncoderDecoderFaq: FAQItem[] = [
  {
    question: "Is my text uploaded anywhere?",
    answer: "No. Encoding and decoding happen entirely in your browser.",
  },
  {
    question: "Does this encode a whole URL or just part of it?",
    answer:
      "It encodes URI components, matching encodeURIComponent(). Delimiter characters like : / ? & = are encoded too, so it's meant for encoding a single value such as a query parameter, not an entire URL.",
  },
  {
    question: "What happens if I decode invalid percent-encoding?",
    answer:
      "You'll see a clear error message instead of a crash. Fix the encoded text and click Decode again.",
  },
  {
    question: "Does it handle Unicode and emoji?",
    answer: "Yes. Unicode text, emoji, and non-Latin scripts are encoded and decoded correctly.",
  },
];

const urlEncoderDecoderSteps: HowItWorksStep[] = [
  {
    title: "Add your text",
    description: "Type or paste plain text or a percent-encoded string into the input.",
  },
  {
    title: "Encode or decode",
    description: "Click Encode to percent-encode it, or Decode to reveal the original text.",
  },
  {
    title: "Copy the result",
    description: "Copy the output, or click Swap to run the result back through the tool.",
  },
];

const urlEncoderDecoderMetadata: Metadata = createSeoMetadata({
  title: "Free URL Encoder / Decoder | TinyUtility",
  description:
    "Encode and decode URI components online for free, matching encodeURIComponent/decodeURIComponent behavior, entirely in your browser. No uploads.",
  path: "/tools/url-encoder-decoder",
});

function UuidGeneratorIntro() {
  return (
    <ToolIntro>
      Generate standards-compliant, random UUID v4 values using your browser&apos;s secure random
      number generator — entirely on your device. Need a random password instead? Try the{" "}
      <Link className={inlineLinkClass} href="/tools/password-generator">
        Password Generator
      </Link>
      .
    </ToolIntro>
  );
}

const uuidGeneratorUseCases: UseCase[] = [
  {
    title: "Seed test data",
    description: "Generate unique identifiers for test fixtures, mock records, or sample data.",
  },
  {
    title: "Create database keys",
    description: "Get a batch of UUIDs to use as primary keys or reference IDs during development.",
  },
  {
    title: "Tag resources",
    description: "Generate a unique ID for a file, request, session, or other tracked resource.",
  },
];

const uuidGeneratorFaq: FAQItem[] = [
  {
    question: "Are these UUIDs uploaded anywhere?",
    answer: "No. UUIDs are generated and stay entirely in your browser.",
  },
  {
    question: "What UUID version does this generate?",
    answer: "UUID version 4 (random), generated using your browser's cryptographically secure random number generator.",
  },
  {
    question: "How many UUIDs can I generate at once?",
    answer: "Up to 100 per generation. Click Generate again for more.",
  },
  {
    question: "Are the UUIDs guaranteed to be unique?",
    answer:
      "Each UUID v4 is generated from 122 random bits, making collisions astronomically unlikely — the same guarantee any standard UUID v4 generator relies on.",
  },
];

const uuidGeneratorSteps: HowItWorksStep[] = [
  {
    title: "Choose a quantity",
    description: "Enter how many UUIDs you need, from 1 to 100.",
  },
  {
    title: "Generate",
    description: "Click Generate to create random, standards-compliant UUID v4 values.",
  },
  {
    title: "Copy what you need",
    description: "Copy an individual UUID, or copy the entire list at once.",
  },
];

const uuidGeneratorMetadata: Metadata = createSeoMetadata({
  title: "UUID Generator | Generate Random UUID v4 | TinyUtility",
  description:
    "Generate random UUID v4 values online for free, securely in your browser using crypto.randomUUID(). Copy results — nothing is sent to a server.",
  path: "/tools/uuid-generator",
});

function TimestampConverterIntro() {
  return (
    <ToolIntro>
      Convert Unix timestamps to human-readable UTC dates, or dates back to timestamps, entirely
      in your browser. Working with JSON from an API? Pair this with the{" "}
      <Link className={inlineLinkClass} href="/tools/json-formatter">
        JSON Formatter
      </Link>
      .
    </ToolIntro>
  );
}

const timestampConverterUseCases: UseCase[] = [
  {
    title: "Debug an API response",
    description: "Turn a raw Unix timestamp from a log or API payload into a readable date.",
  },
  {
    title: "Build a test fixture",
    description: "Get the exact timestamp for a specific UTC date and time for test data.",
  },
  {
    title: "Compare timestamps across formats",
    description: "Check whether a seconds or milliseconds timestamp matches the date you expect.",
  },
];

const timestampConverterFaq: FAQItem[] = [
  {
    question: "Is my data uploaded anywhere?",
    answer: "No. Conversion happens entirely in your browser using native JavaScript Date logic.",
  },
  {
    question: "Are timestamps in seconds or milliseconds?",
    answer:
      "Whichever you choose with the unit selector. It applies to both the timestamp input and the timestamp result, so there's no guessing from digit count.",
  },
  {
    question: "What timezone is used?",
    answer:
      "Results are shown in UTC first and labeled clearly, since that's an unambiguous, deterministic result. Your local time is also shown, explicitly labeled with its UTC offset.",
  },
  {
    question: "What date formats can I enter?",
    answer:
      "YYYY-MM-DD HH:mm:ss (interpreted as UTC), or ISO 8601 with an explicit timezone, like 2026-01-01T00:00:00Z or with a +/-HH:mm offset.",
  },
  {
    question: "What happens with an invalid or out-of-range date?",
    answer: "You'll see a clear error message instead of an incorrect result or a crash.",
  },
];

const timestampConverterSteps: HowItWorksStep[] = [
  {
    title: "Choose a unit",
    description: "Pick Seconds or Milliseconds — it applies to both conversion directions.",
  },
  {
    title: "Convert a timestamp or a date",
    description: "Enter a Unix timestamp to get its date, or a UTC/ISO 8601 date to get its timestamp.",
  },
  {
    title: "Copy the result",
    description: "Copy the UTC date, ISO 8601 string, local time, or timestamp you need.",
  },
];

const timestampConverterMetadata: Metadata = createSeoMetadata({
  title: "Timestamp Converter | Unix Timestamp to Date | TinyUtility",
  description:
    "Convert Unix timestamps to UTC dates and back, in seconds or milliseconds, entirely in your browser. No uploads, no server processing.",
  path: "/tools/timestamp-converter",
});

function RegexTesterIntro() {
  return (
    <ToolIntro>
      Test a JavaScript regular expression against sample text — see matches, capture groups, and
      match positions — entirely in your browser, using your browser&apos;s native RegExp engine.
      Need to actually replace matched text? Try{" "}
      <Link className={inlineLinkClass} href="/tools/find-and-replace">
        Find &amp; Replace
      </Link>
      .
    </ToolIntro>
  );
}

const regexTesterUseCases: UseCase[] = [
  {
    title: "Debug a pattern",
    description: "Check why a regular expression isn't matching the text you expect.",
  },
  {
    title: "Validate input formats",
    description: "Test a pattern for emails, IDs, or codes against a handful of real examples.",
  },
  {
    title: "Extract structured data",
    description: "Check capture groups pull out the right pieces of matched text.",
  },
];

const regexTesterFaq: FAQItem[] = [
  {
    question: "Is my pattern or text uploaded anywhere?",
    answer: "No. Matching runs entirely in your browser using the native JavaScript RegExp engine.",
  },
  {
    question: "Do I need to include slashes, like /pattern/g?",
    answer: "No. Enter just the raw pattern, like \\bhello\\b, and choose flags separately using the checkboxes.",
  },
  {
    question: "Why does it only show one match?",
    answer: "The g (global) flag is off. Turn it on to find every match instead of just the first.",
  },
  {
    question: "Does this support every regex flavor?",
    answer: "It uses your browser's native JavaScript RegExp engine, so it follows JavaScript regex syntax and semantics rather than PCRE, Python, or other flavors.",
  },
  {
    question: "What happens with an invalid pattern?",
    answer: "You'll see a clear error message instead of a crash. Fix the pattern and test again.",
  },
];

const regexTesterSteps: HowItWorksStep[] = [
  {
    title: "Enter a pattern and flags",
    description: "Type the raw regex pattern and choose flags like g (global) or i (ignore case).",
  },
  {
    title: "Add test text",
    description: "Paste or type the text you want to check the pattern against.",
  },
  {
    title: "Test and review matches",
    description: "See match count, matched text, positions, and capture groups.",
  },
];

const regexTesterMetadata: Metadata = createSeoMetadata({
  title: "Regex Tester | Test Regular Expressions Online | TinyUtility",
  description:
    "Test JavaScript regular expressions online for free — flags, matches, and capture groups — entirely in your browser. No uploads.",
  path: "/tools/regex-tester",
});

const passwordGeneratorMetadata: Metadata = createSeoMetadata({
  title: "Free Password Generator | TinyUtility",
  description:
    "Generate strong, random passwords online for free. Choose length and character types entirely in your browser — nothing is sent to a server.",
  path: "/tools/password-generator",
});

const imageToPdfMetadata: Metadata = createSeoMetadata({
  title: "Free Image to PDF Converter | TinyUtility",
  description:
    "Convert JPG, PNG, and WEBP images into a single PDF online for free. Reorder pages and choose page size privately in your browser.",
  path: "/tools/image-to-pdf",
});

/**
 * WebApplication + a BreadcrumbList matching the visible breadcrumb trail exactly. Applied to
 * every tool, not just one — every field here is drawn from data already shown on the page,
 * nothing invented: no ratings, no review counts, no download counts, no fabricated pricing
 * beyond the real "free, $0" price.
 *
 * No FAQPage entry: FAQ rich results have no current benefit to chase here, and the visible
 * FAQ content (see `FAQSection` below) is the useful part regardless of whether a schema
 * wrapper around it does anything for search results today.
 */
function buildToolStructuredData(tool: Tool, breadcrumbItems: BreadcrumbItem[]) {
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "WebApplication",
      name: tool.title,
      url: absoluteUrl(`/tools/${tool.slug}`),
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (runs in the browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: tool.description,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        ...(item.href ? { item: absoluteUrl(item.href) } : {}),
      })),
    },
  ];

  return { "@context": "https://schema.org", "@graph": graph };
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

  if (slug === "image-resizer") {
    return imageResizerMetadata;
  }

  if (slug === "image-cropper") {
    return imageCropperMetadata;
  }

  if (slug === "pdf-merger") {
    return pdfMergerMetadata;
  }

  if (slug === "pdf-compressor") {
    return pdfCompressorMetadata;
  }

  if (slug === "pdf-page-extractor") {
    return pdfPageExtractorMetadata;
  }

  if (slug === "pdf-page-editor") {
    return pdfPageEditorMetadata;
  }

  if (slug === "pdf-splitter") {
    return pdfSplitterMetadata;
  }

  if (slug === "pdf-metadata-cleaner") {
    return pdfMetadataCleanerMetadata;
  }

  if (slug === "qr-code-generator") {
    return qrCodeGeneratorMetadata;
  }

  if (slug === "word-counter") {
    return wordCounterMetadata;
  }

  if (slug === "find-and-replace") {
    return findAndReplaceMetadata;
  }

  if (slug === "text-diff") {
    return textDiffMetadata;
  }

  if (slug === "zip-creator") {
    return zipCreatorMetadata;
  }

  if (slug === "zip-extractor") {
    return zipExtractorMetadata;
  }

  if (slug === "json-formatter") {
    return jsonFormatterMetadata;
  }

  if (slug === "url-encoder-decoder") {
    return urlEncoderDecoderMetadata;
  }

  if (slug === "uuid-generator") {
    return uuidGeneratorMetadata;
  }

  if (slug === "timestamp-converter") {
    return timestampConverterMetadata;
  }

  if (slug === "regex-tester") {
    return regexTesterMetadata;
  }

  if (slug === "password-generator") {
    return passwordGeneratorMetadata;
  }

  if (slug === "image-to-pdf") {
    return imageToPdfMetadata;
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
          : slug === "pdf-page-extractor"
            ? pdfPageExtractorFaq
          : slug === "pdf-page-editor"
            ? pdfPageEditorFaq
          : slug === "pdf-splitter"
            ? pdfSplitterFaq
          : slug === "pdf-metadata-cleaner"
            ? pdfMetadataCleanerFaq
          : slug === "image-compressor"
            ? imageCompressorFaq
            : slug === "image-converter"
              ? imageConverterFaq
            : slug === "image-resizer"
              ? imageResizerFaq
            : slug === "image-cropper"
              ? imageCropperFaq
              : slug === "qr-code-generator"
                ? qrCodeGeneratorFaq
                : slug === "word-counter"
                  ? wordCounterFaq
                : slug === "find-and-replace"
                  ? findAndReplaceFaq
                : slug === "text-diff"
                  ? textDiffFaq
                : slug === "zip-creator"
                  ? zipCreatorFaq
                : slug === "zip-extractor"
                  ? zipExtractorFaq
                  : slug === "json-formatter"
                    ? jsonFormatterFaq
                    : slug === "url-encoder-decoder"
                      ? urlEncoderDecoderFaq
                      : slug === "uuid-generator"
                        ? uuidGeneratorFaq
                        : slug === "timestamp-converter"
                          ? timestampConverterFaq
                          : slug === "regex-tester"
                            ? regexTesterFaq
                  : [];

  const categorySlug = toolCategories.find((category) => category.title === tool.category)?.slug;
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Tools", href: "/tools" },
    ...(categorySlug ? [{ label: tool.category, href: `/tools#${categorySlug}-tools` }] : []),
    { label: tool.title },
  ];
  const structuredData = buildToolStructuredData(tool, breadcrumbItems);

  const isPasswordGenerator = slug === "password-generator";
  const isImageToPdf = slug === "image-to-pdf";
  const isPdfMerger = slug === "pdf-merger";
  const isPdfCompressor = slug === "pdf-compressor";
  const isPdfPageExtractor = slug === "pdf-page-extractor";
  const isPdfPageEditor = slug === "pdf-page-editor";
  const isPdfSplitter = slug === "pdf-splitter";
  const isPdfMetadataCleaner = slug === "pdf-metadata-cleaner";
  const isImageCompressor = slug === "image-compressor";
  const isImageConverter = slug === "image-converter";
  const isImageResizer = slug === "image-resizer";
  const isImageCropper = slug === "image-cropper";
  const isQrCodeGenerator = slug === "qr-code-generator";
  const isWordCounter = slug === "word-counter";
  const isFindAndReplace = slug === "find-and-replace";
  const isTextDiff = slug === "text-diff";
  const isZipCreator = slug === "zip-creator";
  const isZipExtractor = slug === "zip-extractor";
  const isJsonFormatter = slug === "json-formatter";
  const isUrlEncoderDecoder = slug === "url-encoder-decoder";
  const isUuidGenerator = slug === "uuid-generator";
  const isTimestampConverter = slug === "timestamp-converter";
  const isRegexTester = slug === "regex-tester";

  return (
    <ToolLayout>
      <ToolContainer>
        <Breadcrumbs items={breadcrumbItems} />
        <ToolHeader
          statusLabel={
            isPasswordGenerator ||
            isImageToPdf ||
            isPdfMerger ||
            isPdfCompressor ||
            isPdfPageExtractor ||
            isPdfPageEditor ||
            isPdfSplitter ||
            isPdfMetadataCleaner ||
            isImageCompressor ||
            isImageConverter ||
            isImageResizer ||
            isImageCropper ||
            isQrCodeGenerator ||
            isWordCounter ||
            isFindAndReplace ||
            isTextDiff ||
            isZipCreator ||
            isZipExtractor ||
            isJsonFormatter ||
            isUrlEncoderDecoder ||
            isUuidGenerator ||
            isTimestampConverter ||
            isRegexTester
              ? null
              : undefined
          }
          tool={tool}
        />
        {isPasswordGenerator ? (
          <>
            <PasswordGeneratorIntro />
            <PasswordGeneratorTool />
            <HowItWorks steps={passwordGeneratorSteps} title="Private password generation in your browser" />
            <UseCases items={passwordGeneratorUseCases} />
          </>
        ) : null}
        {isImageToPdf ? (
          <>
            <ImageToPdfIntro />
            <ImageToPdfTool />
            <HowItWorks steps={imageToPdfSteps} title="Image to PDF conversion in your browser" />
            <UseCases items={imageToPdfUseCases} />
          </>
        ) : null}
        {isPdfMerger ? (
          <>
            <PdfMergerIntro />
            <PdfMergerTool />
            <HowItWorks steps={pdfMergerSteps} title="Private PDF merging in your browser" />
            <UseCases items={pdfMergerUseCases} />
          </>
        ) : null}
        {isPdfCompressor ? (
          <>
            <PdfCompressorIntro />
            <PdfCompressorTool />
            <HowItWorks steps={pdfCompressorSteps} title="Private PDF compression in your browser" />
            <UseCases items={pdfCompressorUseCases} />
          </>
        ) : null}
        {isPdfPageExtractor ? (
          <>
            <PdfPageExtractorIntro />
            <PdfPageExtractorTool />
            <HowItWorks steps={pdfPageExtractorSteps} title="Private PDF page extraction in your browser" />
            <UseCases items={pdfPageExtractorUseCases} />
          </>
        ) : null}
        {isPdfPageEditor ? (
          <>
            <PdfPageEditorIntro />
            <PdfPageEditorTool />
            <HowItWorks steps={pdfPageEditorSteps} title="Private PDF page editing in your browser" />
            <UseCases items={pdfPageEditorUseCases} />
          </>
        ) : null}
        {isPdfSplitter ? (
          <>
            <PdfSplitterIntro />
            <PdfSplitterTool />
            <HowItWorks steps={pdfSplitterSteps} title="Private PDF splitting in your browser" />
            <UseCases items={pdfSplitterUseCases} />
          </>
        ) : null}
        {isPdfMetadataCleaner ? (
          <>
            <PdfMetadataCleanerIntro />
            <PdfMetadataCleanerTool />
            <HowItWorks steps={pdfMetadataCleanerSteps} title="Private PDF metadata cleaning in your browser" />
            <UseCases items={pdfMetadataCleanerUseCases} />
          </>
        ) : null}
        {isImageCompressor ? (
          <>
            <ImageCompressorIntro />
            <ImageCompressorTool />
            <HowItWorks steps={imageCompressorSteps} title="Private image compression in your browser" />
            <UseCases items={imageCompressorUseCases} />
          </>
        ) : null}
        {isImageConverter ? (
          <>
            <ImageConverterIntro />
            <ImageConverterTool />
            <HowItWorks steps={imageConverterSteps} title="Private image conversion in your browser" />
            <UseCases items={imageConverterUseCases} />
          </>
        ) : null}
        {isImageResizer ? (
          <>
            <ImageResizerIntro />
            <ImageResizerTool />
            <HowItWorks steps={imageResizerSteps} title="Private image resizing in your browser" />
            <UseCases items={imageResizerUseCases} />
          </>
        ) : null}
        {isImageCropper ? (
          <>
            <ImageCropperIntro />
            <ImageCropperTool />
            <HowItWorks steps={imageCropperSteps} title="Private image cropping in your browser" />
            <UseCases items={imageCropperUseCases} />
          </>
        ) : null}
        {isQrCodeGenerator ? (
          <>
            <QrCodeGeneratorIntro />
            <QrCodeGeneratorTool />
            <HowItWorks steps={qrCodeGeneratorSteps} title="Private QR code generation in your browser" />
            <UseCases items={qrCodeGeneratorUseCases} />
          </>
        ) : null}
        {isWordCounter ? (
          <>
            <WordCounterIntro />
            <WordCounterTool />
            <HowItWorks steps={wordCounterSteps} title="Private word counting in your browser" />
            <UseCases items={wordCounterUseCases} />
          </>
        ) : null}
        {isFindAndReplace ? (
          <>
            <FindAndReplaceIntro />
            <FindAndReplaceTool />
            <HowItWorks steps={findAndReplaceSteps} title="Private find and replace in your browser" />
            <UseCases items={findAndReplaceUseCases} />
          </>
        ) : null}
        {isTextDiff ? (
          <>
            <TextDiffIntro />
            <TextDiffTool />
            <HowItWorks steps={textDiffSteps} title="Private text comparison in your browser" />
            <UseCases items={textDiffUseCases} />
          </>
        ) : null}
        {isZipCreator ? (
          <>
            <ZipCreatorIntro />
            <ZipCreatorTool />
            <HowItWorks steps={zipCreatorSteps} title="Private ZIP creation in your browser" />
            <UseCases items={zipCreatorUseCases} />
          </>
        ) : null}
        {isZipExtractor ? (
          <>
            <ZipExtractorIntro />
            <ZipExtractorTool />
            <HowItWorks steps={zipExtractorSteps} title="Private ZIP extraction in your browser" />
            <UseCases items={zipExtractorUseCases} />
          </>
        ) : null}
        {isJsonFormatter ? (
          <>
            <JsonFormatterIntro />
            <JsonFormatterTool />
            <HowItWorks steps={jsonFormatterSteps} title="Private JSON formatting in your browser" />
            <UseCases items={jsonFormatterUseCases} />
          </>
        ) : null}
        {isUrlEncoderDecoder ? (
          <>
            <UrlEncoderDecoderIntro />
            <UrlEncoderDecoderTool />
            <HowItWorks steps={urlEncoderDecoderSteps} title="Private URL encoding and decoding in your browser" />
            <UseCases items={urlEncoderDecoderUseCases} />
          </>
        ) : null}
        {isUuidGenerator ? (
          <>
            <UuidGeneratorIntro />
            <UuidGeneratorTool />
            <HowItWorks steps={uuidGeneratorSteps} title="Private UUID generation in your browser" />
            <UseCases items={uuidGeneratorUseCases} />
          </>
        ) : null}
        {isTimestampConverter ? (
          <>
            <TimestampConverterIntro />
            <TimestampConverterTool />
            <HowItWorks steps={timestampConverterSteps} title="Private timestamp conversion in your browser" />
            <UseCases items={timestampConverterUseCases} />
          </>
        ) : null}
        {isRegexTester ? (
          <>
            <RegexTesterIntro />
            <RegexTesterTool />
            <HowItWorks steps={regexTesterSteps} title="Private regex testing in your browser" />
            <UseCases items={regexTesterUseCases} />
          </>
        ) : null}
        <FAQSection items={faqItems} />
        <RelatedTools tools={getRelatedTools(slug)} />
      </ToolContainer>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
    </ToolLayout>
  );
}
