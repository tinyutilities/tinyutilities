import { notFound } from "next/navigation";
import { FAQSection, type FAQItem } from "@/components/tools/faq-section";
import { HowItWorks, type HowItWorksStep } from "@/components/tools/how-it-works";
import { RelatedTools } from "@/components/tools/related-tools";
import { ToolContainer } from "@/components/tools/tool-container";
import { ToolHeader } from "@/components/tools/tool-header";
import { ToolLayout } from "@/components/tools/tool-layout";
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
  const isPasswordGenerator = slug === "password-generator";

  return (
    <ToolLayout>
      <ToolContainer>
        <ToolHeader statusLabel={isPasswordGenerator ? null : undefined} tool={tool} />
        {isPasswordGenerator ? (
          <>
            <PasswordGeneratorTool />
            <HowItWorks steps={passwordGeneratorSteps} />
          </>
        ) : null}
        <FAQSection items={faqItems} />
        <RelatedTools tools={getRelatedTools(slug)} />
      </ToolContainer>
    </ToolLayout>
  );
}
