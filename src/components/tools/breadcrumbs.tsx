import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  /** Omitted for the current page — it renders as plain text, not a link. */
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

/** Accessible breadcrumb trail. Render `buildBreadcrumbStructuredData` with the exact same
 *  `items` alongside this so the BreadcrumbList JSON-LD always matches what's visible. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="flex items-center gap-1.5" key={item.label}>
              {index > 0 ? (
                <span aria-hidden="true" className="text-slate-600">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link className="transition hover:text-cyan-200" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "text-slate-300" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
