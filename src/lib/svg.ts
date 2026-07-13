/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Pure, DOM-free helpers for the SVG → PNG converter. Kept free of browser APIs
// so they can be unit-tested in a plain Node context (see tests/svg.test.ts).

export interface Dimensions {
  width: number;
  height: number;
}

/** Default canvas size used when an SVG declares no usable dimensions. */
export const DEFAULT_SVG_SIZE = 500;

const svgOpenTag = (svg: string) => svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? '';

/**
 * Parse a length attribute into pixels. Rejects percentages (e.g. `width="100%"`,
 * common in exported SVGs) and non-positive values by returning `NaN`, so callers
 * fall back to the viewBox. Plain numbers and absolute units (`px`, `pt`) parse.
 */
function parseLength(value: string): number {
  if (!value || value.includes('%')) return NaN;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

/** The four numbers of a `viewBox`, or `null` if absent/malformed. */
export function parseViewBox(
  svgContent: string,
): [number, number, number, number] | null {
  const parts = attr(svgOpenTag(svgContent), 'viewBox')
    .split(/[\s,]+/)
    .map((p) => parseFloat(p))
    .filter((n) => Number.isFinite(n));
  return parts.length === 4
    ? [parts[0], parts[1], parts[2], parts[3]]
    : null;
}

/**
 * Derive the intrinsic size of an SVG string.
 *
 * Prefers usable `width`/`height` attributes, ignores percentage sizes, falls
 * back to the `viewBox` dimensions, and finally to a {@link DEFAULT_SVG_SIZE}
 * square. This is the coordinate space the crop controls operate in.
 */
export function parseSvgDimensions(svgContent: string): Dimensions {
  const tag = svgOpenTag(svgContent);
  let width = parseLength(attr(tag, 'width'));
  let height = parseLength(attr(tag, 'height'));

  if (Number.isNaN(width) || Number.isNaN(height)) {
    const vb = parseViewBox(svgContent);
    if (vb) {
      if (Number.isNaN(width)) width = vb[2];
      if (Number.isNaN(height)) height = vb[3];
    }
  }

  if (!(width > 0)) width = DEFAULT_SVG_SIZE;
  if (!(height > 0)) height = DEFAULT_SVG_SIZE;

  return { width, height };
}

/**
 * Normalise an SVG so it rasterises at a known pixel size.
 *
 * An `<img>` fed an SVG with `width="100%"` (or no size) has no intrinsic
 * dimensions and renders at the browser default (300×150), which breaks
 * crop/scale maths. This forces explicit pixel `width`/`height` on the root and
 * synthesises a `viewBox` (from the logical size) when one is missing, so the
 * raster's natural size always equals `renderWidth × renderHeight`.
 */
export function prepareSvgForRaster(
  svgContent: string,
  logicalWidth: number,
  logicalHeight: number,
  renderWidth: number,
  renderHeight: number,
): string {
  const open = svgOpenTag(svgContent);
  if (!open) return svgContent;

  const hasViewBox = /\bviewBox\s*=/i.test(open);
  // Drop any existing width/height (may be percentages) so ours win.
  let tag = open.replace(/\s(?:width|height)\s*=\s*["'][^"']*["']/gi, '');

  let injected = ` width="${renderWidth}" height="${renderHeight}"`;
  if (!hasViewBox) injected += ` viewBox="0 0 ${logicalWidth} ${logicalHeight}"`;
  tag = tag.replace(/<svg\b/i, `<svg${injected}`);

  return svgContent.replace(open, tag);
}

/** Strip a trailing `.svg` extension (case-insensitive) to get a base name. */
export function baseName(fileName: string): string {
  return fileName.replace(/\.svg$/i, '');
}

/** Build the download filename for a rendered PNG, e.g. `logo_2x.png`. */
export function outputFileName(base: string, scale: number): string {
  return `${base}_${scale}x.png`;
}
