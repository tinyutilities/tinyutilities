import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
      // Vendored, pre-minified pdf.js worker script copied verbatim from pdfjs-dist —
      // not source we maintain, so it shouldn't be linted.
      "public/pdf.worker.min.mjs",
    ],
  },
];

export default eslintConfig;
