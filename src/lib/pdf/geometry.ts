/**
 * Geometry for drawing on PDF pages that may be rotated or have a crop box.
 *
 * "Displayed" coordinates are what a viewer shows: origin at the bottom-left of the visible page
 * after rotation, x to the right, y up. "Raw" coordinates are the PDF's own user space, which is
 * what pdf-lib's drawing calls expect. The page's /Rotate value turns the raw page for display,
 * so anything drawn at a displayed position must be mapped back (and its text angle adjusted).
 */

export type PageBox = { x: number; y: number; width: number; height: number };
export type PageRotation = 0 | 90 | 180 | 270;

/** Snaps any angle to the nearest PDF rotation (a multiple of 90, in [0, 360)). */
export function normalizeRotation(angle: number): PageRotation {
  const snapped = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  return snapped as PageRotation;
}

export function displayedSize(box: PageBox, rotation: PageRotation): { width: number; height: number } {
  return rotation === 90 || rotation === 270
    ? { width: box.height, height: box.width }
    : { width: box.width, height: box.height };
}

/** Maps a point given in displayed coordinates to the raw coordinates used for drawing. */
export function displayedToRaw(box: PageBox, rotation: PageRotation, dx: number, dy: number): { x: number; y: number } {
  switch (rotation) {
    case 0:
      return { x: box.x + dx, y: box.y + dy };
    case 90:
      return { x: box.x + box.width - dy, y: box.y + dx };
    case 180:
      return { x: box.x + box.width - dx, y: box.y + box.height - dy };
    case 270:
      return { x: box.x + dy, y: box.y + box.height - dx };
  }
}

/** Text/image angle (degrees, counter-clockwise) to draw in raw space for a displayed angle. */
export function displayedToRawAngle(rotation: PageRotation, displayedAngle: number): number {
  return displayedAngle + rotation;
}

/** Rotates the vector (x, y) counter-clockwise by `degrees`. */
export function rotateVector(x: number, y: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}
