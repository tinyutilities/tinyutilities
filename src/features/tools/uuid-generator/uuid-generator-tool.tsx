"use client";

import { useId, useMemo, useState } from "react";

const minQuantity = 1;
const maxQuantity = 100;

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Generates a single RFC 4122 UUID v4. Prefers the native `crypto.randomUUID()` (backed by the
 * browser's CSPRNG). Where that's unavailable, falls back to `crypto.getRandomValues()` — still
 * cryptographically secure — and manually sets the version (4) and variant (RFC 4122, `10xx`)
 * bits before formatting. Never falls back to `Math.random()`, which is not cryptographically
 * secure and unsuitable for generating identifiers meant to be effectively unique.
 */
function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }

  throw new Error(
    "Your browser doesn't support the secure random generation this tool requires (crypto.randomUUID or crypto.getRandomValues).",
  );
}

function validateQuantity(rawValue: string): { value: number | null; error: string | null } {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return { value: null, error: "Enter a number between 1 and 100." };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { value: null, error: "Enter a whole number, with no decimals or symbols." };
  }

  const parsed = Number(trimmed);

  if (parsed < minQuantity) {
    return { value: null, error: "Minimum is 1." };
  }

  if (parsed > maxQuantity) {
    return { value: null, error: "Maximum is 100 per generation." };
  }

  return { value: parsed, error: null };
}

export function UuidGeneratorTool() {
  const quantityId = useId();
  const [quantityInput, setQuantityInput] = useState("1");
  const [uuids, setUuids] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { value: quantity, error: quantityError } = useMemo(
    () => validateQuantity(quantityInput),
    [quantityInput],
  );

  const generate = () => {
    if (quantity === null) return;

    try {
      const next = Array.from({ length: quantity }, () => generateUuidV4());
      setUuids(next);
      setMessage({ text: `Generated ${next.length} UUID${next.length === 1 ? "" : "s"}.`, isError: false });
      setCopiedIndex(null);
    } catch (error) {
      setUuids([]);
      setMessage({
        text: error instanceof Error ? error.message : "Could not generate UUIDs in this browser.",
        isError: true,
      });
    }
  };

  const clearAll = () => {
    setUuids([]);
    setMessage(null);
    setCopiedIndex(null);
  };

  const copyOne = async (uuid: string, index: number) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(uuid);
      } else if (!copyWithFallback(uuid)) {
        throw new Error("Fallback copy failed.");
      }
      setCopiedIndex(index);
      setMessage({ text: "UUID copied to clipboard.", isError: false });
    } catch {
      setMessage({ text: "Could not copy automatically. Select the UUID and copy it manually.", isError: true });
    }
  };

  const copyAll = async () => {
    if (uuids.length === 0) return;
    const joined = uuids.join("\n");

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(joined);
      } else if (!copyWithFallback(joined)) {
        throw new Error("Fallback copy failed.");
      }
      setCopiedIndex(null);
      setMessage({ text: `Copied all ${uuids.length} UUIDs to clipboard.`, isError: false });
    } catch {
      setMessage({ text: "Could not copy automatically. Select the UUIDs and copy them manually.", isError: true });
    }
  };

  return (
    <section className="mt-16 space-y-6">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm font-medium leading-6 text-cyan-100">
        UUIDs are generated locally using your browser&apos;s secure random number generator. Nothing is sent anywhere.
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block" htmlFor={quantityId}>
            <span className="text-sm font-semibold text-white">Number of UUIDs</span>
            <input
              className="mt-2 w-32 rounded-xl border border-white/10 bg-[#080b1a] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              id={quantityId}
              inputMode="numeric"
              onChange={(event) => setQuantityInput(event.target.value)}
              type="text"
              value={quantityInput}
            />
            <span className="mt-1 block text-xs text-slate-500">1–100 per generation</span>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={quantity === null}
              onClick={generate}
              type="button"
            >
              Generate
            </button>
            <button
              className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              disabled={uuids.length === 0}
              onClick={copyAll}
              type="button"
            >
              Copy All
            </button>
            <button
              className="rounded-full border border-red-300/25 bg-red-300/10 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:-translate-y-0.5 hover:border-red-200/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              disabled={uuids.length === 0}
              onClick={clearAll}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>

        {quantityError ? (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {quantityError}
          </p>
        ) : null}

        {message ? (
          <p aria-live="polite" className={`mt-3 text-sm ${message.isError ? "text-red-300" : "text-teal-300"}`} role={message.isError ? "alert" : "status"}>
            {message.text}
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Results</h2>

        {uuids.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No UUIDs generated yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {uuids.map((uuid, index) => (
              <li
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#080b1a]/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                key={`${uuid}-${index}`}
              >
                <output aria-label={`UUID ${index + 1}`} className="min-w-0 flex-1 select-all break-all font-mono text-sm text-white">
                  {uuid}
                </output>
                <button
                  aria-label={copiedIndex === index ? `Copied UUID ${index + 1}` : `Copy UUID ${index + 1}`}
                  className="shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/10"
                  onClick={() => copyOne(uuid, index)}
                  type="button"
                >
                  {copiedIndex === index ? "Copied ✓" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
