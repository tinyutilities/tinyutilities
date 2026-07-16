import { FAQSection, type FAQItem } from "@/components/tools/faq-section";
import { RelatedTools } from "@/components/tools/related-tools";
import { ToolContainer } from "@/components/tools/tool-container";
import { ToolHeader } from "@/components/tools/tool-header";
import type { Tool } from "@/features/tools/tool-data";

type ToolPageLayoutProps = {
  tool: Tool;
  relatedTools: Tool[];
  faqItems?: FAQItem[];
};

export function ToolPageLayout({ tool, relatedTools, faqItems = [] }: ToolPageLayoutProps) {
  return (
    <ToolContainer>
      <ToolHeader tool={tool} />
      <FAQSection items={faqItems} />
      <RelatedTools tools={relatedTools} />
    </ToolContainer>
  );
}
