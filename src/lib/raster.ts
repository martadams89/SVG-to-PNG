/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Browser-only helpers: rasterise an SVG string to a PNG data URL, and trigger
// downloads. Kept out of svg.ts so the pure helpers there stay Node-testable.

import { prepareSvgForRaster } from './svg';

export interface RasterCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RasterOptions {
  /** Coordinate space the crop is expressed in (usually the SVG's intrinsic size). */
  logicalWidth: number;
  logicalHeight: number;
  crop: RasterCrop;
  /** Output multiplier. 1 renders at logical size. */
  scale: number;
  /** Optional solid background painted behind the (otherwise transparent) SVG. */
  background?: string | null;
}

/**
 * Render an SVG string to a PNG data URL.
 *
 * The SVG is normalised to an explicit pixel size (`logical × scale`) so its
 * raster matches the crop coordinate space, then the crop region is copied 1:1
 * into the output canvas — keeping vector edges crisp at any scale.
 */
export function rasterizeSvg(
  svgContent: string,
  options: RasterOptions,
): Promise<string> {
  const { logicalWidth, logicalHeight, crop, scale, background } = options;
  const renderWidth = Math.max(1, Math.round(logicalWidth * scale));
  const renderHeight = Math.max(1, Math.round(logicalHeight * scale));
  const normalized = prepareSvgForRaster(
    svgContent,
    logicalWidth,
    logicalHeight,
    renderWidth,
    renderHeight,
  );

  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([normalized], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        const sx = crop.x * scale;
        const sy = crop.y * scale;
        const sw = Math.max(1, Math.round(crop.width * scale));
        const sh = Math.max(1, Math.round(crop.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, sw, sh);
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for rasterisation'));
    };
    img.src = url;
  });
}

/** Trigger a browser download of a data/blob URL under the given filename. */
export function downloadUrl(url: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Download a raw SVG string as a `.svg` file. */
export function downloadSvg(svgContent: string, filename: string): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  URL.revokeObjectURL(url);
}
