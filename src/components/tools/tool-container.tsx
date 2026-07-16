import type { ReactNode } from "react";

type ToolContainerProps = {
  children: ReactNode;
};

export function ToolContainer({ children }: ToolContainerProps) {
  return <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">{children}</div>;
}
