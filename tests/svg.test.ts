import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SVG_SIZE,
  baseName,
  outputFileName,
  parseSvgDimensions,
  parseViewBox,
  prepareSvgForRaster,
} from '../src/lib/svg';

describe('parseSvgDimensions', () => {
  it('reads explicit width/height attributes', () => {
    const svg = '<svg width="120" height="80" xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(parseSvgDimensions(svg)).toEqual({ width: 120, height: 80 });
  });

  it('strips units from width/height', () => {
    const svg = '<svg width="120px" height="80px"></svg>';
    expect(parseSvgDimensions(svg)).toEqual({ width: 120, height: 80 });
  });

  it('ignores percentage sizes and uses the viewBox instead', () => {
    // The exact shape that caused the 100x100 crop bug.
    const svg = '<svg width="100%" height="100%" viewBox="0 0 1024 1024"></svg>';
    expect(parseSvgDimensions(svg)).toEqual({ width: 1024, height: 1024 });
  });

  it('falls back to viewBox when width/height are missing', () => {
    const svg = '<svg viewBox="0 0 640 480"></svg>';
    expect(parseSvgDimensions(svg)).toEqual({ width: 640, height: 480 });
  });

  it('accepts comma-separated viewBox values', () => {
    const svg = '<svg viewBox="0,0,300,150"></svg>';
    expect(parseSvgDimensions(svg)).toEqual({ width: 300, height: 150 });
  });

  it('falls back to a default square when nothing is declared', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    expect(parseSvgDimensions(svg)).toEqual({
      width: DEFAULT_SVG_SIZE,
      height: DEFAULT_SVG_SIZE,
    });
  });
});

describe('parseViewBox', () => {
  it('returns the four numbers', () => {
    expect(parseViewBox('<svg viewBox="0 0 10 20"></svg>')).toEqual([0, 0, 10, 20]);
  });

  it('returns null when absent', () => {
    expect(parseViewBox('<svg width="10"></svg>')).toBeNull();
  });
});

describe('prepareSvgForRaster', () => {
  it('replaces percentage sizes with explicit render pixels', () => {
    const svg = '<svg width="100%" height="100%" viewBox="0 0 1024 1024"><rect/></svg>';
    const out = prepareSvgForRaster(svg, 1024, 1024, 2048, 2048);
    expect(out).toContain('width="2048"');
    expect(out).toContain('height="2048"');
    expect(out).not.toContain('100%');
    // Existing viewBox is preserved.
    expect(out).toContain('viewBox="0 0 1024 1024"');
    expect(out).toContain('<rect/>');
  });

  it('synthesises a viewBox when the SVG has none', () => {
    const svg = '<svg><rect/></svg>';
    const out = prepareSvgForRaster(svg, 300, 200, 300, 200);
    expect(out).toContain('viewBox="0 0 300 200"');
    expect(out).toContain('width="300"');
  });

  it('leaves content untouched when there is no svg tag', () => {
    expect(prepareSvgForRaster('not svg', 10, 10, 10, 10)).toBe('not svg');
  });
});

describe('baseName', () => {
  it('removes a trailing .svg extension', () => {
    expect(baseName('logo.svg')).toBe('logo');
  });

  it('is case-insensitive', () => {
    expect(baseName('Logo.SVG')).toBe('Logo');
  });

  it('leaves other names untouched', () => {
    expect(baseName('diagram')).toBe('diagram');
    expect(baseName('my.svg.icon')).toBe('my.svg.icon');
  });
});

describe('outputFileName', () => {
  it('composes base name and scale', () => {
    expect(outputFileName('logo', 2)).toBe('logo_2x.png');
  });
});
