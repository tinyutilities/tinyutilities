"use client";

import { Button } from "@/components/tools/tool-ui";
import { ErrorCard, formatBytes, ProcessingState, UploadCard } from "@/components/upload";
import type { LoadedPdf } from "./use-single-pdf";

type PdfFilePickerProps = {
  pdf: LoadedPdf | null;
  isLoading: boolean;
  error: string | null;
  disabled?: boolean;
  onFiles: (files: FileList | File[]) => void;
  onClear: () => void;
};

/** Upload area before a PDF is chosen; file name, page count and a "change" button afterwards. */
export function PdfFilePicker({ pdf, isLoading, error, disabled = false, onFiles, onClear }: PdfFilePickerProps) {
  return (
    <div className="space-y-4">
      {pdf ? (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{pdf.file.name}</p>
            <p className="mt-1 text-sm text-slate-400">
              {pdf.pageCount} page{pdf.pageCount === 1 ? "" : "s"} · {formatBytes(pdf.file.size)}
            </p>
          </div>
          <Button disabled={disabled} onClick={onClear} variant="neutral">
            Choose a different PDF
          </Button>
        </div>
      ) : (
        <UploadCard
          accept="application/pdf,.pdf"
          disabled={isLoading || disabled}
          formatsLabel="PDF"
          helperText="Maximum 100 MB. One PDF at a time."
          onFiles={onFiles}
        />
      )}
      {isLoading ? <ProcessingState subtitle="Reading your PDF" title="Preparing" /> : null}
      {error ? <ErrorCard message={error} title="Could not use this PDF" /> : null}
    </div>
  );
}
