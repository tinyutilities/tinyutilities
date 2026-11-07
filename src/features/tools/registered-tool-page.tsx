import Link from "next/link";
import { Fragment } from "react";
import { HowItWorks } from "@/components/tools/how-it-works";
import { ToolIntro } from "@/components/tools/tool-intro";
import { UseCases } from "@/components/tools/use-cases";
import { RegisteredTool } from "./tool-components";
import type { ToolPageContent } from "./tool-page-content";

const inlineLinkClass = "text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 transition hover:text-cyan-200";

/** Intro, tool UI, "how it works" and use cases for a tool described by `toolPageContent`. */
export function RegisteredToolPage({ slug, content }: { slug: string; content: ToolPageContent }) {
  return (
    <>
      <ToolIntro>
        {content.intro.map((segment, index) =>
          typeof segment === "string" ? (
            <Fragment key={index}>{segment}</Fragment>
          ) : (
            <Link className={inlineLinkClass} href={segment.href} key={index}>
              {segment.label}
            </Link>
          ),
        )}
      </ToolIntro>
      <RegisteredTool slug={slug} />
      <HowItWorks steps={content.steps} title={content.stepsTitle} />
      <UseCases items={content.useCases} />
    </>
  );
}
