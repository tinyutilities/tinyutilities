# TinyUtility

TinyUtility is being initialized as a modern Next.js application for hosting online utilities.

## Tech Stack

- Next.js 15
- TypeScript
- App Router
- Tailwind CSS
- ESLint
- npm

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Project Structure

```text
src/
  app/          App Router routes, layouts, and global metadata
  components/   Shared React components
  config/       Application configuration
  features/     Feature domains such as tools
  lib/          Shared helpers and utilities
  styles/       Global styles
  types/        Shared TypeScript types
legacy/         Original static HTML, CSS, and JavaScript files
```

The original static files are preserved in `legacy/`.
