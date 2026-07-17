import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FAQSection, type FAQItem } from "@/components/tools/faq-section";
import { HowItWorks, type HowItWorksStep } from "@/components/tools/how-it-works";
import { RelatedTools } from "@/components/tools/related-tools";
import { ToolContainer } from "@/components/tools/tool-container";
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolLayout } from "@/components/tools/tool-layout";
import { ImageCompressorTool } from "@/features/tools/image-compressor/image-compressor-tool";
import { ImageToPdfTool } from "@/features/tools/image-to-pdf/image-to-pdf-tool";
import { PasswordGeneratorTool } from "@/features/tools/password-generator/password-generator-tool";
import { getRelatedTools, getToolBySlug, tools } from "@/features/tools/tool-data";

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

const imageCompressorMetadata: Metadata = {
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

  return {
    title: `${tool.title} | TinyUtility`,
    description: tool.description,
  };
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
          : [];
  const isPasswordGenerator = slug === "password-generator";
  const isImageToPdf = slug === "image-to-pdf";
  const isImageCompressor = slug === "image-compressor";

  return (
    <ToolLayout>
      <ToolContainer>
        <ToolHeader statusLabel={isPasswordGenerator || isImageToPdf || isImageCompressor ? null : undefined} tool={tool} />
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
        <FAQSection items={faqItems} />
        <RelatedTools tools={getRelatedTools(slug)} />
      </ToolContainer>
    </ToolLayout>
  );
}
