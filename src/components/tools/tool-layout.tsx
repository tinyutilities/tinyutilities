import type { ReactNode } from "react";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";

type ToolLayoutProps = {
  children: ReactNode;
};

export function ToolLayout({ children }: ToolLayoutProps) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
