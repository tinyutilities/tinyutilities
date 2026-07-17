import { FAQSection, type FAQItem } from "@/components/tools/faq-section";
import { RelatedTools } from "@/components/tools/related-tools";
import { ToolContainer } from "@/components/tools/tool-container";
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolLayout } from "@/components/tools/tool-layout";
import { QrCodeGeneratorTool } from "@/features/tools/qr-code-generator/qr-code-generator-tool";
import { getToolBySlug, tools } from "@/features/tools/tool-data";
import { createSeoMetadata } from "@/lib/seo";

const qrCodeGenerator = getToolBySlug("qr-code-generator") ?? {
  title: "QR Code Generator",
  description:
    "Generate QR codes instantly for URLs, text, emails, phone numbers, Wi-Fi credentials, and more. Free, fast, and completely private.",
  slug: "qr-code-generator",
  category: "Developer Tools",
  icon: "qr" as const,
};

const faqItems: FAQItem[] = [
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

const relatedTools = ["password-generator", "image-to-pdf", "image-compressor"]
  .map((slug) => tools.find((tool) => tool.slug === slug))
  .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

export const metadata = createSeoMetadata({
  title: "Free QR Code Generator | TinyUtility",
  description:
    "Generate QR codes instantly for URLs, text, emails, Wi-Fi credentials, and more. Free online QR Code Generator by TinyUtility.",
  path: "/tools/qr-code-generator",
});

export default function QrCodeGeneratorPage() {
  return (
    <ToolLayout>
      <ToolContainer>
        <ToolHeader statusLabel={null} tool={qrCodeGenerator} />
        <QrCodeGeneratorTool />
        <FAQSection items={faqItems} />
        <RelatedTools tools={relatedTools} />
      </ToolContainer>
    </ToolLayout>
  );
}
