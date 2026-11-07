"use client";

import { useEffect, useId, useState } from "react";
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
import { ErrorCard, formatBytes, SelectedFileRow, UploadCard } from "@/components/upload";
import {
  algorithmsForChecksumLength,
  checksumsMatch,
  hashAlgorithms,
  hashBytesMany,
  maxHashFileBytes,
  normalizeChecksum,
  type HashAlgorithm,
} from "@/lib/hash/hash";

type Mode = "text" | "file";
type Hashes = Record<HashAlgorithm, string>;

const modeOptions: Array<{ value: Mode; label: string }> = [
  { value: "text", label: "Hash text" },
  { value: "file", label: "Hash a file" },
];

export function HashGeneratorTool() {
  const inputId = useId();
  const compareId = useId();

  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hashes, setHashes] = useState<Hashes | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upperCase, setUpperCase] = useState(false);
  const [expected, setExpected] = useState("");

  // Text mode: re-hash whenever the text changes. A stale async result is discarded.
  useEffect(() => {
    if (mode !== "text") return;
    let cancelled = false;

    if (text === "") {
      setHashes(null);
      setError(null);
      return;
    }

    hashBytesMany(new TextEncoder().encode(text))
      .then((result) => {
        if (!cancelled) {
          setHashes(result);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Your browser could not calculate these hashes. Hashing needs a modern browser and a secure (HTTPS) page.");
      });

    return () => {
      cancelled = true;
    };
  }, [mode, text]);

  // File mode: hash the chosen file once.
  useEffect(() => {
    if (mode !== "file" || !file) return;
    let cancelled = false;

    setIsHashing(true);
    setHashes(null);
    setError(null);

    file
      .arrayBuffer()
      .then((buffer) => hashBytesMany(new Uint8Array(buffer)))
      .then((result) => {
        if (cancelled) return;
        setHashes(result);
        setIsHashing(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("This file could not be hashed. It may be too large for this browser's memory, or hashing is unavailable on this page.");
        setIsHashing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, file]);

  const handleFiles = (files: FileList | File[]) => {
    const chosen = files[0];
    if (!chosen) return;

    if (chosen.size > maxHashFileBytes) {
      setFile(null);
      setHashes(null);
      setError(`This file is ${formatBytes(chosen.size)}. File hashing is limited to ${formatBytes(maxHashFileBytes)} because the browser needs the whole file in memory.`);
      return;
    }

    setFile(chosen);
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setHashes(null);
    setError(null);
    setIsHashing(false);
  };

  const display = (value: string) => (upperCase ? value.toUpperCase() : value);
  const normalizedExpected = normalizeChecksum(expected);
  const matches = hashes ? hashAlgorithms.filter((entry) => checksumsMatch(expected, hashes[entry.value])) : [];
  const lengthHint = algorithmsForChecksumLength(normalizedExpected.length);

  return (
    <section className="mt-16 space-y-6">
      <PrivacyNote>Your text and files never leave your device. Hashes are calculated entirely in your browser.</PrivacyNote>

      <InfoNote>
        Hashes are shown for text as <strong className="text-white">UTF-8</strong>, exactly as typed (line breaks included). MD5 and SHA-1
        are <strong className="text-white">not secure</strong> against deliberate collisions; use SHA-256 or stronger for anything
        security-related.
      </InfoNote>

      <Panel>
        <ChoiceGroup legend="Input" onChange={changeMode} options={modeOptions} value={mode} />
      </Panel>

      {mode === "text" ? (
        <Panel>
          <PanelLabel htmlFor={inputId} meta={`${text.length.toLocaleString()} characters`}>
            Text
          </PanelLabel>
          <TextArea
            id={inputId}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or paste text to hash."
            value={text}
          />
        </Panel>
      ) : (
        <Panel>
          <PanelLabel>File</PanelLabel>
          <div className="mt-3 space-y-4">
            {file ? (
              <SelectedFileRow
                actions={
                  <Button
                    onClick={() => {
                      setFile(null);
                      setHashes(null);
                      setError(null);
                      setIsHashing(false);
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
                helperText={`Maximum ${formatBytes(maxHashFileBytes)}.`}
                onFiles={handleFiles}
              />
            )}
            {isHashing ? (
              <p className="text-sm text-slate-400" role="status">
                Calculating hashes…
              </p>
            ) : null}
          </div>
        </Panel>
      )}

      {error && mode === "file" ? <ErrorCard message={error} title="Could not hash this file" /> : null}
      {error && mode === "text" ? <ErrorMessage>{error}</ErrorMessage> : null}

      {hashes ? (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Hashes</h3>
            <CheckboxField checked={upperCase} onChange={setUpperCase}>
              Uppercase hex
            </CheckboxField>
          </div>

          <ul className="mt-4 space-y-3">
            {hashAlgorithms.map((entry) => (
              <li className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-4" key={entry.value}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {entry.label} <span className="font-normal text-slate-500">· {entry.bits}-bit</span>
                    {entry.weak ? <span className="ml-2 text-xs font-normal text-amber-200">not collision-resistant</span> : null}
                  </p>
                  <CopyButton label={`Copy ${entry.label}`} text={display(hashes[entry.value])} />
                </div>
                <p className="mt-2 break-all font-mono text-sm leading-6 text-slate-200">{display(hashes[entry.value])}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <label className="text-sm font-semibold text-white" htmlFor={compareId}>
              Compare with a checksum
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#080b1a] px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
              id={compareId}
              onChange={(event) => setExpected(event.target.value)}
              placeholder="Paste the expected hash"
              spellCheck={false}
              type="text"
              value={expected}
            />
            {normalizedExpected ? (
              <p
                className={`mt-3 text-sm ${matches.length > 0 ? "text-emerald-300" : "text-amber-200"}`}
                role="status"
              >
                {matches.length > 0
                  ? `Match: this is the ${matches.map((entry) => entry.label).join(" / ")} hash.`
                  : lengthHint.length > 0
                    ? `No match. A hash of this length is ${lengthHint.join(" / ")}, and it differs from the calculated ${lengthHint.join(" / ")} value.`
                    : "No match, and the length does not fit any supported algorithm."}
              </p>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </section>
  );
}
