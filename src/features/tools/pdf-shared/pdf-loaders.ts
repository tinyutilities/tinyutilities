/**
 * Lazy loaders and error handling shared by the newer PDF tools. Both libraries are large, so
 * they are imported only when a user actually adds a PDF.
 */

export const maxPdfBytes = 100 * 1024 * 1024;

export function loadPdfLib() {
  return import("pdf-lib");
}

/** pdfjs-dist, with its worker self-hosted at /pdf.worker.min.mjs (no third-party CDN). */
export async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function getPdfErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (name === "PasswordException" || message.includes("encrypted") || message.includes("password")) {
    return "This PDF is password-protected. Remove the password and try again.";
  }

  if (name === "InvalidPDFException" || message.includes("invalid pdf") || message.includes("failed to parse") || message.includes("no pdf header")) {
    return "This file could not be read as a PDF. It may be damaged or not a real PDF.";
  }

  return error instanceof Error && error.message ? error.message : "Something went wrong while processing this PDF.";
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
