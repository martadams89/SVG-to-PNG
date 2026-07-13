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

const svgTag = (svg: string) => svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? '';

/**
 * Derive the intrinsic size of an SVG string.
 *
 * Prefers explicit `width`/`height` attributes, falls back to the last two
 * `viewBox` values, and finally to a {@link DEFAULT_SVG_SIZE} square. Mirrors
 * the behaviour the UI relied on previously, minus the DOMParser dependency.
 */
export function parseSvgDimensions(svgContent: string): Dimensions {
  const tag = svgTag(svgContent);
  let width = parseFloat(attr(tag, 'width')) || 0;
  let height = parseFloat(attr(tag, 'height')) || 0;

  if (!width || !height) {
    const parts = attr(tag, 'viewBox')
      .split(/[ ,]+/)
      .map((p) => parseFloat(p))
      .filter((n) => !Number.isNaN(n));
    if (parts.length === 4) {
      width = parts[2];
      height = parts[3];
    }
  }

  if (!width || !height) {
    width = DEFAULT_SVG_SIZE;
    height = DEFAULT_SVG_SIZE;
  }

  return { width, height };
}

/** Strip a trailing `.svg` extension (case-insensitive) to get a base name. */
export function baseName(fileName: string): string {
  return fileName.replace(/\.svg$/i, '');
}

/** Build the download filename for a rendered PNG, e.g. `logo_2x.png`. */
export function outputFileName(base: string, scale: number): string {
  return `${base}_${scale}x.png`;
}
