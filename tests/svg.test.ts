import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SVG_SIZE,
  baseName,
  outputFileName,
  parseSvgDimensions,
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
