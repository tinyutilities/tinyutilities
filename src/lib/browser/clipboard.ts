/**
 * Copies text to the clipboard. Uses the async Clipboard API where it's available (secure
 * contexts only), otherwise falls back to a hidden textarea + `execCommand("copy")`.
 * Resolves to `false` instead of throwing, so callers can show a "copy manually" message.
 *
 * New tools use this instead of re-declaring the fallback inline; existing tools keep their
 * own copies untouched.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy path (e.g. permission denied).
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
