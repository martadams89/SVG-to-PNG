import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOGO_OPTIONS,
  buildLogoSvg,
  estimateTextWidth,
} from '../src/lib/logo';
import { parseSvgDimensions } from '../src/lib/svg';

describe('estimateTextWidth', () => {
  it('scales with font size', () => {
    expect(estimateTextWidth('Damp', 100)).toBeGreaterThan(estimateTextWidth('Damp', 50));
  });

  it('grows with more characters', () => {
    expect(estimateTextWidth('Damp', 100)).toBeGreaterThan(estimateTextWidth('Da', 100));
  });
});

describe('buildLogoSvg', () => {
  it('produces a well-formed, sized SVG', () => {
    const svg = buildLogoSvg(DEFAULT_LOGO_OPTIONS);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    const { width, height } = parseSvgDimensions(svg);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('renders each coloured segment', () => {
    const svg = buildLogoSvg({
      ...DEFAULT_LOGO_OPTIONS,
      segments: [
        { text: 'Damp', color: '#111111' },
        { text: 'App', color: '#3b82f6' },
      ],
    });
    expect(svg).toContain('>Damp</tspan>');
    expect(svg).toContain('>App</tspan>');
    expect(svg).toContain('#3b82f6');
  });

  it('includes the gradient badge when set', () => {
    const svg = buildLogoSvg(DEFAULT_LOGO_OPTIONS);
    expect(svg).toContain('linearGradient');
    expect(svg).toContain('>PRO</text>');
  });

  it('omits the badge when null', () => {
    const svg = buildLogoSvg({ ...DEFAULT_LOGO_OPTIONS, badge: null });
    expect(svg).not.toContain('linearGradient');
  });

  it('adds a background rect only when requested', () => {
    const transparent = buildLogoSvg({ ...DEFAULT_LOGO_OPTIONS, background: null });
    expect(transparent).not.toContain('<rect width=');
    const solid = buildLogoSvg({ ...DEFAULT_LOGO_OPTIONS, background: '#ffffff' });
    expect(solid).toContain('fill="#ffffff"');
  });

  it('escapes XML-special characters in text', () => {
    const svg = buildLogoSvg({
      ...DEFAULT_LOGO_OPTIONS,
      segments: [{ text: 'A & B <C>', color: '#000000' }],
      badge: null,
    });
    expect(svg).toContain('A &amp; B &lt;C&gt;');
    expect(svg).not.toContain('<C>');
  });
});
