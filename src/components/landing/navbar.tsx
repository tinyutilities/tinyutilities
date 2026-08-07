import Link from "next/link";
import { Logo } from "./logo";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Tools", href: "/tools" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "#blog" },
  { label: "About", href: "/about" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060816]/80 backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8"
        aria-label="Primary navigation"
      >
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
  key={item.label}
  href={item.href}
  className="
    group
    relative
    text-sm
    font-medium
    text-slate-300
    transition-all
    duration-300
    hover:text-white
  "
>
  {item.label}

  <span
    className="
      absolute
      -bottom-1
      left-0
      h-[2px]
      w-0
      rounded-full
      bg-cyan-400
      transition-all
      duration-300
      group-hover:w-full
    "
  />
</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
