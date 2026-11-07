"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  Button,
  CheckboxField,
  ErrorMessage,
  InfoNote,
  Panel,
  PanelLabel,
  PrivacyNote,
  SelectField,
} from "@/components/tools/tool-ui";
import { buildDownloadFilename, ErrorCard, FilenameField, formatBytes, ProcessingState, SuccessCard } from "@/components/upload";
import { downloadBlob } from "@/lib/browser/download";
import { parsePageRange } from "@/lib/pdf/page-range";
import {
  addPageNumbers,
  defaultPageNumberOptions,
  formatPageLabel,
  numberPositions,
  numberStyles,
  validatePageNumberOptions,
  type NumberPosition,
  type NumberStyle,
  type PageNumberResult,
} from "@/lib/pdf/page-numbers";
import { getPdfErrorMessage, loadPdfLib, toArrayBuffer } from "../pdf-shared/pdf-loaders";
import { PdfFilePicker } from "../pdf-shared/pdf-file-picker";
import { useSinglePdf } from "../pdf-shared/use-single-pdf";

const formatPresets = [
  { value: "{n}", label: "1" },
  { value: "Page {n}", label: "Page 1" },
  { value: "Page {n} of {total}", label: "Page 1 of 10" },
  { value: "{n} / {total}", label: "1 / 10" },
  { value: "- {n} -", label: "- 1 -" },
  { value: "custom", label: "Custom…" },
];

const previewPlacement: Record<NumberPosition, string> = {
  "bottom-center": "bottom-2 left-1/2 -translate-x-1/2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-2 right-2",
  "top-center": "top-2 left-1/2 -translate-x-1/2",
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
};

const defaultFilenameBase = "TinyUtility-numbered";

export function PdfPageNumbersTool() {
  const rangeId = useId();
  const startId = useId();
  const sizeId = useId();
  const marginId = useId();
  const colorId = useId();
  const customId = useId();
  const downloadedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { pdf, isLoading, loadError, load, clear } = useSinglePdf();
  const [preset, setPreset] = useState("{n}");
  const [customFormat, setCustomFormat] = useState("{n}");
  const [style, setStyle] = useState<NumberStyle>("arabic");
  const [position, setPosition] = useState<NumberPosition>(defaultPageNumberOptions.position);
  const [startNumber, setStartNumber] = useState("1");
  const [pageRange, setPageRange] = useState("");
  const [fontSize, setFontSize] = useState(String(defaultPageNumberOptions.fontSize));
  const [margin, setMargin] = useState(String(defaultPageNumberOptions.margin));
  const [color, setColor] = useState("#000000");
  const [skipFirst, setSkipFirst] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<(PageNumberResult & { blob: Blob }) | null>(null);
  const [filenameBase, setFilenameBase] = useState(defaultFilenameBase);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const format = preset === "custom" ? customFormat : preset;

  const selection = useMemo(() => {
    if (!pdf) return null;
    // "Don't number the first page" is a shortcut that removes page 1 from whatever is selected.
    const parsed = parsePageRange(pageRange, pdf.pageCount);
    if (!parsed.ok) return parsed;
    const pages = skipFirst ? parsed.pages.filter((page) => page !== 1) : parsed.pages;
    return { ok: true as const, pages };
  }, [pdf, pageRange, skipFirst]);

  const options = useMemo(
    () => ({
      format,
      style,
      position,
      margin: Number(margin),
      fontSize: Number(fontSize),
      color,
      startNumber: Number(startNumber),
      pages: selection?.ok ? selection.pages : [],
    }),
    [format, style, position, margin, fontSize, color, startNumber, selection],
  );

  const validationError = selection && !selection.ok ? selection.error : validatePageNumberOptions(options);
  const sampleLast = Number(startNumber) + Math.max(options.pages.length, 1) - 1;
  const sampleLabel = (() => {
    try {
      return formatPageLabel(format, Number(startNumber) || 1, sampleLast || 1, style);
    } catch {
      return "";
    }
  })();

  const apply = async () => {
    if (!pdf || validationError) return;

    setIsProcessing(true);
    setProcessError(null);

    try {
      const pdfLib = await loadPdfLib();
      const output = await addPageNumbers(pdfLib, await pdf.file.arrayBuffer(), options);
      setResult({ ...output, blob: new Blob([toArrayBuffer(output.bytes)], { type: "application/pdf" }) });
      setFilenameBase(`${pdf.file.name.replace(/\.pdf$/i, "") || "document"}-numbered`);
    } catch (error) {
      setProcessError(getPdfErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    if (downloadedTimeout.current) clearTimeout(downloadedTimeout.current);
    setResult(null);
    setJustDownloaded(false);
    clear();
  };

  const download = () => {
    if (!result) return;
    downloadBlob(result.blob, buildDownloadFilename(filenameBase, "pdf", defaultFilenameBase));
    setJustDownloaded(true);
    if (downloadedTimeout.current) clearTimeout(downloadedTimeout.current);
    downloadedTimeout.current = setTimeout(() => setJustDownloaded(false), 3000);
  };

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your PDF never leaves your device. Page numbers are added entirely in your browser.</PrivacyNote>

      {result ? (
        <SuccessCard
          beforeActions={<FilenameField extension="pdf" onChange={setFilenameBase} value={filenameBase} />}
          downloadLabel="Download PDF"
          heroStat={{ label: result.numberedPages === 1 ? "page numbered" : "pages numbered", value: String(result.numberedPages) }}
          justDownloaded={justDownloaded}
          onDownload={download}
          onReset={reset}
          resetLabel="Number Another PDF"
          stats={[
            { label: "First label", value: result.firstLabel },
            { label: "Last label", value: result.lastLabel },
            { label: "File size", value: formatBytes(result.blob.size) },
          ]}
          subtitle="Your numbered PDF is ready."
          title="Page Numbers Added"
        >
          <button
            className="mx-auto block text-sm font-medium text-teal-300 transition hover:text-teal-100"
            onClick={() => setResult(null)}
            type="button"
          >
            Change the numbering options
          </button>
        </SuccessCard>
      ) : (
        <>
          <Panel>
            <PdfFilePicker disabled={isProcessing} error={loadError} isLoading={isLoading} onClear={clear} onFiles={(files) => void load(files)} pdf={pdf} />
          </Panel>

          {pdf ? (
            <Panel>
              <PanelLabel>Numbering options</PanelLabel>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SelectField id={`${customId}-format`} label="Label" onChange={setPreset} options={formatPresets} value={preset} />
                {preset === "custom" ? (
                  <div>
                    <label className="text-sm font-semibold text-white" htmlFor={customId}>
                      Custom label
                    </label>
                    <input
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                      id={customId}
                      maxLength={60}
                      onChange={(event) => setCustomFormat(event.target.value)}
                      value={customFormat}
                    />
                    <p className="mt-1 text-xs text-slate-500">Use {"{n}"} for the number and {"{total}"} for the last number.</p>
                  </div>
                ) : null}
                <SelectField id={`${customId}-style`} label="Number style" onChange={setStyle} options={numberStyles} value={style} />
                <SelectField id={`${customId}-position`} label="Position" onChange={setPosition} options={numberPositions} value={position} />

                <div>
                  <label className="text-sm font-semibold text-white" htmlFor={rangeId}>
                    Pages to number
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    id={rangeId}
                    onChange={(event) => setPageRange(event.target.value)}
                    placeholder={`All pages (e.g. 2-${pdf.pageCount})`}
                    value={pageRange}
                  />
                  <p className="mt-1 text-xs text-slate-500">Numbers run in order across the pages you choose.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-white" htmlFor={startId}>
                    First number
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    id={startId}
                    inputMode="numeric"
                    onChange={(event) => setStartNumber(event.target.value)}
                    value={startNumber}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-white" htmlFor={sizeId}>
                    Font size (pt)
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    id={sizeId}
                    inputMode="decimal"
                    onChange={(event) => setFontSize(event.target.value)}
                    value={fontSize}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-white" htmlFor={marginId}>
                    Margin from edge (pt)
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                    id={marginId}
                    inputMode="decimal"
                    onChange={(event) => setMargin(event.target.value)}
                    value={margin}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-white" htmlFor={colorId}>
                    Text color
                  </label>
                  <input
                    className="mt-2 h-11 w-20 cursor-pointer rounded-lg border border-white/10 bg-[#080b1a] p-1"
                    id={colorId}
                    onChange={(event) => setColor(event.target.value)}
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#000000"}
                  />
                </div>
                <div className="self-end">
                  <CheckboxField checked={skipFirst} hint="Handy for a cover page" onChange={setSkipFirst}>
                    Don&apos;t number the first page
                  </CheckboxField>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-6">
                <div
                  aria-label={`Preview of label position: ${position.replace("-", " ")}`}
                  className="relative aspect-[8.5/11] w-24 shrink-0 rounded-md bg-white shadow-lg"
                  role="img"
                >
                  <span className={`absolute whitespace-nowrap text-[7px] font-semibold ${previewPlacement[position]}`} style={{ color }}>
                    {sampleLabel || "1"}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {options.pages.length > 0 ? (
                    <>
                      {options.pages.length} page{options.pages.length === 1 ? "" : "s"} will be numbered, starting with{" "}
                      <strong className="text-white">{sampleLabel}</strong>. Position is approximate.
                    </>
                  ) : (
                    "No pages selected."
                  )}
                </p>
              </div>

              {validationError ? <ErrorMessage>{validationError}</ErrorMessage> : null}

              <div className="mt-6">
                <InfoNote>
                  Numbers use the built-in Helvetica font and are drawn on top of each page, upright even on rotated pages. They are added to
                  the page content, so they can&apos;t be removed later by editing the numbers; keep your original file.
                </InfoNote>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button disabled={isProcessing || Boolean(validationError)} onClick={() => void apply()} variant="primary">
                  {isProcessing ? "Adding numbers…" : "Add Page Numbers"}
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {isProcessing ? <ProcessingState subtitle="Drawing page numbers locally" title="Processing" /> : null}
                {processError ? <ErrorCard message={processError} title="Could not add page numbers" /> : null}
              </div>
            </Panel>
          ) : null}
        </>
      )}
    </section>
  );
}
