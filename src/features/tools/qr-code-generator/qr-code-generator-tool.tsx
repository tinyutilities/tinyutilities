"use client";

import { useEffect, useRef, useState } from "react";

type ToolStatus = "idle" | "success" | "error";

const defaultDownloadName = "tinyutility-qr.png";

function sanitizeFilename(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
    .replace(/^-|-$/g, "");

  return normalized ? `tinyutility-${normalized}-qr.png` : defaultDownloadName;
}

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

export function QrCodeGeneratorTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [status, setStatus] = useState<ToolStatus>("idle");
  const [message, setMessage] = useState("Enter text, a URL, contact detail, or Wi-Fi credentials to create a QR code.");

  const trimmedText = text.trim();
  const hasQrCode = trimmedText.length > 0 && status !== "error";
  const downloadName = sanitizeFilename(filename);

  useEffect(() => {
    let isActive = true;
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!trimmedText) {
      context?.clearRect(0, 0, canvas.width, canvas.height);
      setStatus("idle");
      setMessage("Enter text, a URL, contact detail, or Wi-Fi credentials to create a QR code.");
      return;
    }

    async function renderQrCode() {
      try {
        const QRCode = await import("qrcode");

        if (!isActive) {
          return;
        }

        await QRCode.toCanvas(canvas, trimmedText, {
          color: {
            dark: "#060816",
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
          margin: 2,
          scale: 8,
          width: 320,
        });

        if (isActive) {
          setStatus("success");
          setMessage("QR code updated live.");
        }
      } catch {
        if (isActive) {
          setStatus("error");
          setMessage("Could not generate this QR code. Try shortening the text.");
        }
      }
    }

    void renderQrCode();

    return () => {
      isActive = false;
    };
  }, [trimmedText]);

  const copyText = async () => {
    if (!trimmedText) {
      setStatus("error");
      setMessage("Add text before copying.");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else if (!copyWithFallback(text)) {
        throw new Error("Fallback copy failed.");
      }

      setStatus("success");
      setMessage("Text copied to clipboard.");
    } catch {
      setStatus("error");
      setMessage("Could not copy the text. Select it manually instead.");
    }
  };

  const clearTool = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    setText("");
    setFilename("");
    setStatus("idle");
    setMessage("Enter text, a URL, contact detail, or Wi-Fi credentials to create a QR code.");
  };

  const downloadQrCode = async () => {
    if (!trimmedText) {
      setStatus("error");
      setMessage("Add text before downloading a QR code.");
      return;
    }

    try {
      const QRCode = await import("qrcode");
      const downloadCanvas = document.createElement("canvas");

      await QRCode.toCanvas(downloadCanvas, trimmedText, {
        color: {
          dark: "#060816",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
        margin: 4,
        scale: 16,
        width: 1024,
      });

      const link = document.createElement("a");
      link.download = downloadName;
      link.href = downloadCanvas.toDataURL("image/png");
      link.click();

      setStatus("success");
      setMessage(`Downloaded ${downloadName}.`);
    } catch {
      setStatus("error");
      setMessage("Could not download the QR code. Try a shorter input.");
    }
  };

  const statusColor =
    status === "error" ? "text-red-300" : status === "success" ? "text-teal-300" : "text-slate-400";

  return (
    <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <label className="block" htmlFor="qr-code-text">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Text input
            </span>
            <textarea
              className="mt-4 min-h-64 w-full resize-y rounded-2xl border border-white/10 bg-[#080b1a] px-5 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
              id="qr-code-text"
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste a URL, write a message, enter an email address, phone number, Wi-Fi credentials, or any custom text..."
              value={text}
            />
          </label>

          <label className="block" htmlFor="qr-code-filename">
            <span className="text-sm font-semibold text-white">Download filename (optional)</span>
            <input
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-300/20"
              id="qr-code-filename"
              onChange={(event) => setFilename(event.target.value)}
              placeholder="My Portfolio Website"
              type="text"
              value={filename}
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={!trimmedText}
              onClick={copyText}
              type="button"
            >
              Copy Text
            </button>
            <button
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={!text && !filename}
              onClick={clearTool}
              type="button"
            >
              Clear
            </button>
          </div>

          <p className={`text-sm ${statusColor}`} role={status === "error" ? "alert" : "status"}>
            {message}
          </p>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-[#080b1a]/70 p-5">
          <h2 className="text-lg font-semibold text-white">Live QR Preview</h2>
          <div className="mt-5 grid min-h-96 place-items-center rounded-2xl border border-dashed border-cyan-300/25 bg-white/[0.03] p-5">
            <div className="grid size-full place-items-center">
              <div className={hasQrCode ? "rounded-2xl bg-white p-4 shadow-2xl shadow-cyan-500/10" : "hidden"}>
                <canvas
                  aria-label="Generated QR code preview"
                  className="size-72 max-w-full"
                  height={320}
                  ref={canvasRef}
                  width={320}
                />
              </div>
              {!hasQrCode ? (
                <div className="max-w-xs text-center">
                  <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl font-semibold text-cyan-200">
                    QR
                  </div>
                  <p className="mt-5 text-sm leading-6 text-slate-400">
                    Your QR code will appear here automatically as soon as you type.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <p className="mt-4 text-center text-xs font-medium text-slate-400">
            Generated privately in your browser &bull; Powered by TinyUtility
          </p>
        </aside>
      </div>

      <button
        className="mt-8 w-full rounded-full bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#14B8A6] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={!trimmedText}
        onClick={downloadQrCode}
        type="button"
      >
        Download PNG
      </button>
    </section>
  );
}
