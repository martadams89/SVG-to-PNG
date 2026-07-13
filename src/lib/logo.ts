/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Pure SVG logo generator. Reproduces the "two-tone text + gradient badge"
// wordmark style used across the ProSurvey apps (e.g. Damp·App·PRO™) as a real,
// resolution-independent SVG string. DOM-free so it can be unit-tested and then
// rasterised to PNG through the same pipeline as an uploaded SVG.

export interface LogoSegment {
  /** A run of text. */
  text: string;
  /** Fill colour for this run (any CSS colour). */
  color: string;
}

export interface LogoBadge {
  text: string;
  /** Gradient start colour. */
  from: string;
  /** Gradient end colour. */
  to: string;
  /** Badge label colour. */
  textColor: string;
}

export interface LogoOptions {
  segments: LogoSegment[];
  fontSize: number;
  fontFamily: string;
  fontWeight: number | string;
  /** Extra tracking in px (can be negative). */
  letterSpacing?: number;
  badge?: LogoBadge | null;
  trademark?: boolean;
  /** Background fill; `null`/omitted renders transparent. */
  background?: string | null;
}

export const DEFAULT_LOGO_OPTIONS: LogoOptions = {
  segments: [
    { text: 'Damp', color: '#0f172a' },
    { text: 'App', color: '#3b82f6' },
  ],
  fontSize: 96,
  fontFamily:
    "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontWeight: 800,
  letterSpacing: -1,
  badge: { text: 'PRO', from: '#facc15', to: '#d97706', textColor: '#ffffff' },
  trademark: true,
  background: null,
};

const xml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Rough width of a bold sans-serif string in px. Self-consistent (preview and
 * export share the generated SVG), so approximate glyph metrics are fine for
 * laying out the badge and cropping the viewBox.
 */
export function estimateTextWidth(
  text: string,
  fontSize: number,
  letterSpacing = 0,
): number {
  let units = 0;
  for (const ch of text) {
    if (ch === ' ') units += 0.3;
    else if (/[iIljtf.,'!|]/.test(ch)) units += 0.34;
    else if (/[mwMW]/.test(ch)) units += 0.85;
    else if (/[A-Z]/.test(ch)) units += 0.68;
    else units += 0.56;
  }
  return units * fontSize + Math.max(0, text.length - 1) * letterSpacing;
}

/** Build a complete, standalone SVG wordmark from the given options. */
export function buildLogoSvg(options: LogoOptions): string {
  const {
    segments,
    fontSize,
    fontFamily,
    fontWeight,
    letterSpacing = 0,
    badge,
    trademark,
    background,
  } = options;

  const padX = Math.round(fontSize * 0.4);
  const padY = Math.round(fontSize * 0.32);
  const gap = Math.round(fontSize * 0.28);

  const textWidth = segments.reduce(
    (sum, s) => sum + estimateTextWidth(s.text, fontSize, letterSpacing),
    0,
  );

  const baselineY = padY + fontSize * 0.82;
  const textHeight = fontSize;

  // Text run as coloured tspans on one line.
  let cursor = padX;
  const tspans = segments
    .map((s) => {
      const span = `<tspan fill="${xml(s.color)}">${xml(s.text)}</tspan>`;
      cursor += estimateTextWidth(s.text, fontSize, letterSpacing);
      return span;
    })
    .join('');
  const textEl =
    `<text x="${padX}" y="${baselineY.toFixed(1)}" font-family="${xml(
      fontFamily,
    )}" font-size="${fontSize}" font-weight="${fontWeight}"` +
    (letterSpacing ? ` letter-spacing="${letterSpacing}"` : '') +
    `>${tspans}</text>`;

  let contentRight = padX + textWidth;
  let defs = '';
  let badgeEl = '';

  if (badge && badge.text.trim()) {
    const bFont = Math.round(fontSize * 0.42);
    const bPadX = Math.round(bFont * 0.7);
    const bPadY = Math.round(bFont * 0.45);
    const bTextW = estimateTextWidth(badge.text, bFont, 1);
    const bW = Math.round(bTextW + bPadX * 2);
    const bH = Math.round(bFont + bPadY * 2);
    const bX = Math.round(contentRight + gap);
    const bY = Math.round(baselineY - fontSize * 0.72);
    const r = Math.round(bH * 0.28);
    defs =
      `<defs><linearGradient id="badgeGrad" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${xml(badge.from)}"/>` +
      `<stop offset="1" stop-color="${xml(badge.to)}"/></linearGradient></defs>`;
    badgeEl =
      `<rect x="${bX}" y="${bY}" width="${bW}" height="${bH}" rx="${r}" ry="${r}" fill="url(#badgeGrad)"/>` +
      `<text x="${bX + bW / 2}" y="${bY + bH / 2}" font-family="${xml(
        fontFamily,
      )}" font-size="${bFont}" font-weight="900" letter-spacing="1" ` +
      `fill="${xml(
        badge.textColor,
      )}" text-anchor="middle" dominant-baseline="central">${xml(
        badge.text.toUpperCase(),
      )}</text>`;
    contentRight = bX + bW;
  }

  let tmEl = '';
  if (trademark) {
    const tmFont = Math.round(fontSize * 0.3);
    const tmX = Math.round(contentRight + gap * 0.4);
    const tmY = padY + tmFont * 0.9;
    tmEl =
      `<text x="${tmX}" y="${tmY}" font-family="${xml(
        fontFamily,
      )}" font-size="${tmFont}" font-weight="600" fill="#94a3b8">™</text>`;
    contentRight = tmX + tmFont;
  }

  const width = Math.round(contentRight + padX);
  const height = Math.round(padY * 2 + textHeight);
  const bg = background
    ? `<rect width="${width}" height="${height}" fill="${xml(background)}"/>`
    : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">${defs}${bg}${textEl}${badgeEl}${tmEl}</svg>`
  );
}
