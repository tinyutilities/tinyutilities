import type { Metadata } from "next";
import { FAQSection, type FAQItem } from "@/components/tools/faq-section";
import { HowItWorks, type HowItWorksStep } from "@/components/tools/how-it-works";
import { RelatedTools } from "@/components/tools/related-tools";
import { ToolContainer } from "@/components/tools/tool-container";
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ImageCompressorTool } from "@/features/tools/image-compressor/image-compressor-tool";
import { getRelatedTools, getToolBySlug } from "@/features/tools/tool-data";

const imageCompressor = getToolBySlug("image-compressor") ?? {
  title: "Image Compressor",
  description:
    "Compress JPG, PNG, and WebP images privately in your browser with resize and format controls.",
  slug: "image-compressor",
  category: "Image Tools",
  icon: "image" as const,
};

const faqItems: FAQItem[] = [
  {
    question: "Are my images uploaded anywhere?",
    answer:
      "No. Images are compressed entirely in your browser and never leave your device.",
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

const howItWorksSteps: HowItWorksStep[] = [
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

export const metadata: Metadata = {
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
  alternates: {
    canonical: "/tools/image-compressor",
  },
  openGraph: {
    title: "Free Image Compressor | TinyUtility",
    description:
      "Compress JPG, PNG, and WebP images online for free with private browser-only processing.",
    type: "website",
    url: "/tools/image-compressor",
  },
  twitter: {
    card: "summary",
    title: "Free Image Compressor | TinyUtility",
    description:
      "Compress JPG, PNG, and WebP images online for free with private browser-only processing.",
  },
};

export default function ImageCompressorPage() {
  return (
    <ToolLayout>
      <ToolContainer>
        <ToolHeader statusLabel={null} tool={imageCompressor} />
        <ImageCompressorTool />
        <HowItWorks steps={howItWorksSteps} />
        <FAQSection items={faqItems} />
        <RelatedTools tools={getRelatedTools("image-compressor")} />
      </ToolContainer>
    </ToolLayout>
  );
}
