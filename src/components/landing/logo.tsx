import Image from "next/image";
import Link from "next/link";

// Official brand mark — source of truth lives at public/brand/TinyUtilities_icon.jpeg, kept
// unmodified. The source JPEG has a black square canvas around the circular artwork, so the
// rendered image is clipped to a circle here (container overflow-hidden + rounded-full) — this
// only affects on-page display, never the source file.
export function Logo() {
  return (
    <Link className="group flex items-center gap-3" href="/" aria-label="TinyUtility home">
      <span className="size-10 shrink-0 overflow-hidden rounded-full transition duration-300 group-hover:scale-105">
        <Image
          alt="TinyUtility"
          className="size-full object-cover"
          height={400}
          priority
          src="/brand/TinyUtilities_icon.jpeg"
          width={400}
        />
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">TinyUtility</span>
    </Link>
  );
}
