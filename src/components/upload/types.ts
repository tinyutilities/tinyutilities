/**
 * Shared state machine every upload-based tool should progress through:
 *
 *   idle -> preparing -> processing -> completed -> (downloaded)
 *
 * "downloaded" is a transient confirmation state layered on top of "completed" —
 * tools return to "completed" a few seconds after showing it.
 */
export type UploadPhase = "idle" | "preparing" | "processing" | "completed" | "downloaded" | "error";

export type StatValue = {
  label: string;
  value: string;
  /** Marks the "hero" number (e.g. percentage saved) for extra emphasis. */
  emphasize?: boolean;
  /** Spans both columns in a 2-column grid — for a longer value (e.g. a caveat message) that shouldn't be truncated. */
  span?: boolean;
};
