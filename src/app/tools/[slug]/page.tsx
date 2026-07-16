import { notFound } from "next/navigation";
import { FAQSection, type FAQItem } from "@/components/tools/faq-section";
import { RelatedTools } from "@/components/tools/related-tools";
import { ToolContainer } from "@/components/tools/tool-container";
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolLayout } from "@/components/tools/tool-layout";
import { getRelatedTools, getToolBySlug, tools } from "@/features/tools/tool-data";

type ToolPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const passwordGeneratorFaq: FAQItem[] = [
  {
    question: "Can I generate passwords yet?",
    answer: "Not yet. This page is a placeholder for the future Password Generator tool.",
  },
  {
    question: "Will this tool be free?",
    answer: "Yes. TinyUtility is planned around free, fast utilities for everyday productivity.",
  },
];

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

  const faqItems = slug === "password-generator" ? passwordGeneratorFaq : [];

  return (
    <ToolLayout>
      <ToolContainer>
        <ToolHeader tool={tool} />
        <FAQSection items={faqItems} />
        <RelatedTools tools={getRelatedTools(slug)} />
      </ToolContainer>
    </ToolLayout>
  );
}
