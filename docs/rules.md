# TinyUtility AI Rules

## Goal

TinyUtility is a fast, modern, privacy-focused collection of browser-based utilities.

Everything should feel clean, simple, responsive, and trustworthy.

Users should never need to upload files to a server unless explicitly required.

Our long-term goal is to build 100+ high-quality tools.

---

## Technology

- Next.js 15
- TypeScript
- Tailwind CSS

---

## Design Principles

- Mobile-first
- Minimal but beautiful
- Fast loading
- Accessible
- Consistent spacing
- Soft animations only
- Professional appearance

---

## Architecture

Reuse existing components.

Avoid duplicate code.

Every tool page should use:

- ToolLayout
- ToolHeader
- ToolContainer
- FAQSection
- RelatedTools

Never create a second version of an existing component.

---

## Performance

Prefer browser-side processing.

Avoid unnecessary JavaScript.

Keep bundle sizes small.

Do not install npm packages unless absolutely necessary.

---

## SEO

Every tool must include:

- unique page title
- unique meta description
- H1 heading
- introductory paragraph
- FAQ section
- Related tools section

---

## Code Quality

Keep components small.

Write readable TypeScript.

Comment only when necessary.

Prefer reusable code.

Avoid overengineering.

---

## User Experience

Every tool should include:

- loading state
- error state
- success state

Buttons should have hover and disabled states.

---

## Future

The project will eventually include:

- Image tools
- PDF tools
- Text tools
- Developer tools
- AI tools
- Unit converters
- Calculators

Build everything with future scalability in mind.