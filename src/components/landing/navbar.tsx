"use client";

import Link from "next/link";
import { useState } from "react";
import { CloseIcon, MenuIcon } from "./icons";
import { Logo } from "./logo";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Tools", href: "/tools" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

        <button
          aria-controls="mobile-nav-menu"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#060816] md:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
        >
          {isMenuOpen ? (
            <CloseIcon className="size-5 fill-none stroke-current stroke-2" />
          ) : (
            <MenuIcon className="size-5 fill-none stroke-current stroke-2" />
          )}
        </button>
      </nav>

      {isMenuOpen ? (
        <div
          className="border-t border-white/10 bg-[#060816]/95 px-4 pb-4 pt-2 backdrop-blur-xl md:hidden"
          id="mobile-nav-menu"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                className="rounded-xl px-3 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                href={item.href}
                key={item.label}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
