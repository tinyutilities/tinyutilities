/** Triggers a browser download for `blob` under `filename`, then releases the object URL. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on a later tick so the browser has started the download first.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads `text` as a UTF-8 file. Pass `bom` for CSV files that Excel must read as UTF-8. */
export function downloadText(text: string, filename: string, mimeType = "text/plain", bom = false) {
  const blob = new Blob(bom ? ["﻿", text] : [text], { type: `${mimeType};charset=utf-8` });
  downloadBlob(blob, filename);
}
