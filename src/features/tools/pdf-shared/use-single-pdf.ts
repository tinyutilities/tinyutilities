"use client";

import { useCallback, useState } from "react";
import { formatBytes } from "@/components/upload";
import { getPdfErrorMessage, isPdfFile, loadPdfJs, loadPdfLib, maxPdfBytes } from "./pdf-loaders";

export type LoadedPdf = { file: File; pageCount: number };

/** Reads the page count with pdf-lib, which also rejects encrypted or damaged files up front. */
export async function readPageCountWithPdfLib(buffer: ArrayBuffer): Promise<number> {
  const pdfLib = await loadPdfLib();
  const document = await pdfLib.PDFDocument.load(buffer, { updateMetadata: false });
  return document.getPageCount();
}

/** Reads the page count with PDF.js, for tools that render pages and never need pdf-lib. */
export async function readPageCountWithPdfJs(buffer: ArrayBuffer): Promise<number> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });

  try {
    return (await task.promise).numPages;
  } finally {
    await task.destroy();
  }
}

/**
 * State for "add one PDF, then work on it": validates type and size, reads the page count with the
 * given reader (pdf-lib by default), and exposes a clear error.
 */
export function useSinglePdf(readPageCount: (buffer: ArrayBuffer) => Promise<number> = readPageCountWithPdfLib) {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (fileList: FileList | File[]) => {
    const file = Array.from(fileList)[0];
    setLoadError(null);

    if (!file) return;

    if (!isPdfFile(file)) {
      setLoadError("Please choose a PDF file.");
      return;
    }

    if (file.size > maxPdfBytes) {
      setLoadError(`This PDF is ${formatBytes(file.size)}. The limit is ${formatBytes(maxPdfBytes)}.`);
      return;
    }

    setIsLoading(true);

    try {
      const pageCount = await readPageCount(await file.arrayBuffer());

      if (pageCount === 0) {
        setLoadError("This PDF has no pages.");
        return;
      }

      setPdf({ file, pageCount });
    } catch (error) {
      setLoadError(getPdfErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [readPageCount]);

  const clear = useCallback(() => {
    setPdf(null);
    setLoadError(null);
  }, []);

  return { pdf, isLoading, loadError, setLoadError, load, clear };
}
