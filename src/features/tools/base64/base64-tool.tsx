"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Button,
  ChoiceGroup,
  CheckboxField,
  CopyButton,
  ErrorMessage,
  InfoNote,
  Panel,
  PanelLabel,
  PrivacyNote,
  TextArea,
} from "@/components/tools/tool-ui";
import { buildDownloadFilename, FilenameField, formatBytes, SelectedFileRow, UploadCard } from "@/components/upload";
import {
  base64ToBytes,
  Base64Error,
  bytesToBase64,
  decodeBase64ToText,
  encodeTextToBase64,
  extensionForMimeType,
  parseBase64Input,
  toDataUri,
} from "@/lib/base64/base64";
import { downloadBlob, downloadText } from "@/lib/browser/download";

type Mode = "text-encode" | "text-decode" | "file-encode" | "file-decode";

const modeOptions: Array<{ value: Mode; label: string }> = [
  { value: "text-encode", label: "Encode text" },
  { value: "text-decode", label: "Decode to text" },
  { value: "file-encode", label: "Encode a file" },
  { value: "file-decode", label: "Decode to a file" },
];

/** Largest file the file mode will encode (Base64 text is ~33% larger than the file). */
const maxFileBytes = 25 * 1024 * 1024;
/** Longest output shown in the text box; copy and download always use the full value. */
const maxDisplayChars = 200_000;

export function Base64Tool() {
  const inputId = useId();
  const outputId = useId();
  const filenameId = useId();

  const [mode, setMode] = useState<Mode>("text-encode");
  const [input, setInput] = useState("");
  const [urlSafe, setUrlSafe] = useState(false);
  const [padding, setPadding] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [asDataUri, setAsDataUri] = useState(false);
  const [outputName, setOutputName] = useState("TinyUtility-base64");

  const [decodedFileName, setDecodedFileName] = useState("");
  const [decodedNameEdited, setDecodedNameEdited] = useState(false);

  const encodeOptions = useMemo(
    () => ({ urlSafe, padding, lineLength: wrapLines ? 76 : 0 }),
    [urlSafe, padding, wrapLines],
  );

  // Read and encode the chosen file. Re-runs when options change so the output always matches them.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;

    setIsReadingFile(true);
    setFileError(null);

    file
      .arrayBuffer()
      .then((buffer) => {
        if (cancelled) return;
        setFileBase64(bytesToBase64(new Uint8Array(buffer), encodeOptions));
        setIsReadingFile(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFileError("This file could not be read. It may have been moved or is too large for this browser.");
        setIsReadingFile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file, encodeOptions]);

  const textEncoded = useMemo(
    () => (mode === "text-encode" ? encodeTextToBase64(input, encodeOptions) : ""),
    [mode, input, encodeOptions],
  );

  const textDecoded = useMemo(() => (mode === "text-decode" && input.trim() ? decodeBase64ToText(input) : null), [mode, input]);

  const fileDecoded = useMemo(() => {
    if (mode !== "file-decode" || !input.trim()) return null;
    const parsed = parseBase64Input(input);
    try {
      return { ok: true as const, bytes: base64ToBytes(parsed.payload), mimeType: parsed.mimeType };
    } catch (error) {
      return { ok: false as const, error: error instanceof Base64Error ? error.message : "Could not decode this Base64 text." };
    }
  }, [mode, input]);

  const suggestedDecodedName = `decoded.${extensionForMimeType(fileDecoded?.ok ? fileDecoded.mimeType : null)}`;
  const effectiveDecodedName = decodedNameEdited ? decodedFileName : suggestedDecodedName;

  const fileOutput = useMemo(() => {
    if (!file || !fileBase64) return "";
    return asDataUri ? toDataUri(fileBase64, file.type) : fileBase64;
  }, [file, fileBase64, asDataUri]);

  const isTruncated = fileOutput.length > maxDisplayChars;

  const handleFiles = (files: FileList | File[]) => {
    const chosen = files[0];
    if (!chosen) return;

    if (chosen.size > maxFileBytes) {
      setFile(null);
      setFileBase64("");
      setFileError(`This file is ${formatBytes(chosen.size)}. File encoding is limited to ${formatBytes(maxFileBytes)} so the Base64 text fits in memory.`);
      return;
    }

    setFileError(null);
    setFileBase64("");
    setFile(chosen);
    setOutputName(`${chosen.name.replace(/\.[^.]+$/, "") || "file"}-base64`);
  };

  const swap = () => {
    const nextInput = mode === "text-encode" ? textEncoded : textDecoded?.ok ? textDecoded.text : "";
    setInput(nextInput);
    setMode(mode === "text-encode" ? "text-decode" : "text-encode");
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setInput("");
  };

  const encodeOptionsUi = (
    <div className="grid gap-3 sm:grid-cols-3">
      <CheckboxField checked={urlSafe} hint="Uses - and _ instead of + and /" onChange={setUrlSafe}>
        URL-safe alphabet
      </CheckboxField>
      <CheckboxField checked={padding} hint="Adds = at the end" onChange={setPadding}>
        Include padding
      </CheckboxField>
      <CheckboxField checked={wrapLines} hint="Line break every 76 characters" onChange={setWrapLines}>
        Wrap lines
      </CheckboxField>
    </div>
  );

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your text and files never leave your device. Encoding and decoding happen entirely in your browser.</PrivacyNote>

      <InfoNote>
        Base64 is an <strong className="text-white">encoding, not encryption</strong>: anyone can decode it. Text is converted to and from
        UTF-8.
      </InfoNote>

      <Panel>
        <ChoiceGroup legend="What do you want to do?" onChange={changeMode} options={modeOptions} value={mode} />
      </Panel>

      {mode === "text-encode" || mode === "text-decode" ? (
        <>
          <Panel>
            <PanelLabel htmlFor={inputId} meta={`${input.length.toLocaleString()} characters`}>
              {mode === "text-encode" ? "Text to encode" : "Base64 to decode"}
            </PanelLabel>
            <TextArea
              id={inputId}
              onChange={(event) => setInput(event.target.value)}
              placeholder={mode === "text-encode" ? "Type or paste text here." : "Paste Base64 or a data: URI here."}
              value={input}
            />
            {mode === "text-encode" ? <div className="mt-4">{encodeOptionsUi}</div> : null}
          </Panel>

          <Panel>
            <PanelLabel
              htmlFor={outputId}
              meta={`${(mode === "text-encode" ? textEncoded.length : textDecoded?.ok ? textDecoded.text.length : 0).toLocaleString()} characters`}
            >
              {mode === "text-encode" ? "Base64 output" : "Decoded text"}
            </PanelLabel>
            <TextArea
              id={outputId}
              placeholder="The result appears here."
              readOnly
              value={mode === "text-encode" ? textEncoded : textDecoded?.ok ? textDecoded.text : ""}
            />
            {textDecoded && !textDecoded.ok ? <ErrorMessage>{textDecoded.error}</ErrorMessage> : null}
            {textDecoded?.ok && textDecoded.mimeType ? (
              <p className="mt-3 text-sm text-slate-400">Data URI type: {textDecoded.mimeType}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <CopyButton text={mode === "text-encode" ? textEncoded : textDecoded?.ok ? textDecoded.text : ""} />
              <Button disabled={!input} onClick={swap} variant="neutral">
                Swap input and output
              </Button>
              <Button disabled={!input} onClick={() => setInput("")} variant="danger">
                Clear
              </Button>
            </div>
          </Panel>
        </>
      ) : null}

      {mode === "file-encode" ? (
        <Panel>
          <PanelLabel>File to encode</PanelLabel>
          <div className="mt-3 space-y-4">
            {file ? (
              <SelectedFileRow
                actions={
                  <Button
                    onClick={() => {
                      setFile(null);
                      setFileBase64("");
                      setFileError(null);
                    }}
                    variant="neutral"
                  >
                    Remove
                  </Button>
                }
                name={file.name}
                sizeLabel={formatBytes(file.size)}
                typeLabel={file.type || "Unknown type"}
              />
            ) : (
              <UploadCard
                accept=""
                formatsLabel="any file type"
                helperText={`Maximum ${formatBytes(maxFileBytes)}.`}
                onFiles={handleFiles}
              />
            )}

            {fileError ? <ErrorMessage>{fileError}</ErrorMessage> : null}
            {file ? encodeOptionsUi : null}
            {file ? (
              <CheckboxField checked={asDataUri} hint="Prefixes the result with data:<type>;base64," onChange={setAsDataUri}>
                Output as a data URI
              </CheckboxField>
            ) : null}

            {file && isReadingFile ? (
              <p className="text-sm text-slate-400" role="status">
                Encoding…
              </p>
            ) : null}

            {file && fileOutput && !isReadingFile ? (
              <div>
                <PanelLabel htmlFor={outputId} meta={`${fileOutput.length.toLocaleString()} characters`}>
                  Base64 output
                </PanelLabel>
                <TextArea
                  id={outputId}
                  readOnly
                  value={isTruncated ? `${fileOutput.slice(0, maxDisplayChars)}…` : fileOutput}
                />
                {isTruncated ? (
                  <p className="mt-2 text-xs text-amber-200" role="status">
                    Showing the first {maxDisplayChars.toLocaleString()} characters. Copy and Download include the full output.
                  </p>
                ) : null}
                <div className="mt-4 max-w-md">
                  <FilenameField extension="txt" onChange={setOutputName} value={outputName} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <CopyButton text={fileOutput} />
                  <Button
                    onClick={() => downloadText(fileOutput, buildDownloadFilename(outputName, "txt", "TinyUtility-base64"))}
                    variant="primary"
                  >
                    Download .txt
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {mode === "file-decode" ? (
        <Panel>
          <PanelLabel htmlFor={inputId} meta={`${input.length.toLocaleString()} characters`}>
            Base64 to decode
          </PanelLabel>
          <TextArea
            id={inputId}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste Base64 or a data: URI here."
            value={input}
          />
          {fileDecoded && !fileDecoded.ok ? <ErrorMessage>{fileDecoded.error}</ErrorMessage> : null}
          {fileDecoded?.ok ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-300" role="status">
                Decoded {formatBytes(fileDecoded.bytes.length)}
                {fileDecoded.mimeType ? ` of type ${fileDecoded.mimeType}` : ""}. The file type is only a guess from the data URI; Base64 on
                its own does not say what kind of file it is.
              </p>
              <div className="max-w-md">
                <label className="text-sm font-semibold text-white" htmlFor={filenameId}>
                  File name (with extension)
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  id={filenameId}
                  onChange={(event) => {
                    setDecodedNameEdited(true);
                    setDecodedFileName(event.target.value);
                  }}
                  spellCheck={false}
                  type="text"
                  value={effectiveDecodedName}
                />
              </div>
              <Button
                onClick={() => {
                  const name = buildDownloadFilename(effectiveDecodedName, "", "decoded.bin");
                  downloadBlob(
                    new Blob([fileDecoded.bytes as Uint8Array<ArrayBuffer>], { type: fileDecoded.mimeType ?? "application/octet-stream" }),
                    name,
                  );
                }}
                variant="primary"
              >
                Download file
              </Button>
            </div>
          ) : null}
        </Panel>
      ) : null}
    </section>
  );
}
