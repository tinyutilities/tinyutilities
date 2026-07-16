import { notFound } from "next/navigation";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { ToolPageLayout } from "@/components/tools/tool-page-layout";
import { getRelatedTools, getToolBySlug, tools } from "@/features/tools/tool-data";

type ToolPageProps = {
  params: Promise<{
    slug: string;
  }>;
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

  return (
    <>
      <Navbar />
      <main>
        <ToolPageLayout relatedTools={getRelatedTools(slug)} tool={tool} />
      </main>
      <Footer />
    </>
  );
}
