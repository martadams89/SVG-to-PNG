import { describe, expect, it } from 'vitest';
import {
  createSvgElement,
  createSvgFragment,
  detectInputKind,
  extractSvg,
  jsxToSvg,
} from '../src/lib/paste';

describe('detectInputKind', () => {
  it('classifies empty/whitespace input', () => {
    expect(detectInputKind('')).toBe('empty');
    expect(detectInputKind('   \n\t ')).toBe('empty');
  });

  it('classifies raw SVG', () => {
    expect(detectInputKind('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe('svg');
  });

  it('skips a leading XML prologue and comments before detecting svg', () => {
    const src = '<?xml version="1.0"?><!-- comment --><svg></svg>';
    expect(detectInputKind(src)).toBe('svg');
  });

  it('classifies everything else as jsx', () => {
    expect(detectInputKind('function Foo() { return <svg /> }')).toBe('jsx');
    expect(detectInputKind('<div><svg /></div>')).toBe('jsx');
  });
});

describe('extractSvg', () => {
  it('extracts the svg substring from surrounding text', () => {
    const src = 'here is markup:\n<svg width="10"><rect/></svg>\nthanks';
    expect(extractSvg(src)).toBe('<svg width="10"><rect/></svg>');
  });

  it('spans from the first <svg to the last </svg>', () => {
    const src = '<svg><svg-inner-looking-thing/></svg> trailing <svg>second</svg>';
    const result = extractSvg(src);
    expect(result.startsWith('<svg>')).toBe(true);
    expect(result.endsWith('</svg>')).toBe(true);
  });

  it('returns empty string when no svg root is present', () => {
    expect(extractSvg('<div>no svg here</div>')).toBe('');
    expect(extractSvg('')).toBe('');
  });
});

describe('createSvgElement', () => {
  it('renames className to class', () => {
    const out = createSvgElement('svg', { className: 'icon' });
    expect(out).toBe('<svg class="icon"/>');
  });

  it('serialises a style object to kebab-case inline CSS', () => {
    const out = createSvgElement('rect', { style: { fillOpacity: 0.5, strokeWidth: 2 } });
    expect(out).toContain('style="fill-opacity: 0.5; stroke-width: 2"');
  });

  it('converts strokeWidth to stroke-width and preserves viewBox casing', () => {
    const out = createSvgElement('svg', { viewBox: '0 0 10 10', strokeWidth: 3 });
    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('stroke-width="3"');
  });

  it('handles boolean/null/undefined props', () => {
    const out = createSvgElement('path', { 'data-active': true, hidden: false, fill: null });
    expect(out).toContain('data-active');
    expect(out).not.toContain('hidden');
    expect(out).not.toContain('fill=');
  });

  it('escapes text children', () => {
    const out = createSvgElement('text', null, 'A & B <C>');
    expect(out).toBe('<text>A &amp; B &lt;C&gt;</text>');
  });

  it('self-closes elements with no children', () => {
    const out = createSvgElement('circle', { cx: 5, cy: 5, r: 4 });
    expect(out).toBe('<circle cx="5" cy="5" r="4"/>');
  });

  it('nests children and flattens arrays', () => {
    const child1 = createSvgElement('rect', { x: 0 });
    const child2 = createSvgElement('rect', { x: 10 });
    const out = createSvgElement('g', null, [child1, child2]);
    expect(out).toBe('<g><rect x="0"/><rect x="10"/></g>');
  });
});

describe('createSvgFragment', () => {
  it('joins serialised children without a wrapping tag', () => {
    const a = createSvgElement('rect', { x: 1 });
    const b = createSvgElement('rect', { x: 2 });
    const out = createSvgFragment(a, b);
    expect(out).toBe('<rect x="1"/><rect x="2"/>');
  });

  it('escapes plain text children', () => {
    const out = createSvgFragment('A & B');
    expect(out).toBe('A &amp; B');
  });
});

// A minimal, hand-written "transpiler" used in tests so we don't depend on
// sucrase for pure Node unit tests. It only needs to understand the tiny
// subset of JSX used below.
function fakeTransformBareSvg(): string {
  return '__h("svg", {viewBox: "0 0 10 10"}, __h("rect", {x: 1, y: 1, width: 8, height: 8}));';
}

function fakeTransformComponent(): string {
  return [
    'function Logo() {',
    '  return __h("svg", {viewBox: "0 0 10 10"}, __h("circle", {cx: 5, cy: 5, r: 4}));',
    '}',
  ].join('\n');
}

function fakeTransformConstComponent(): string {
  return 'const Logo = () => __h("svg", null, __h("circle", {cx: 1, cy: 1, r: 1}));';
}

function fakeTransformReactCreateElement(): string {
  return 'React.createElement("svg", null, React.createElement("rect", {x: 0}));';
}

describe('jsxToSvg', () => {
  it('evaluates a bare JSX expression via the injected transform', () => {
    const svg = jsxToSvg('<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8"/></svg>', fakeTransformBareSvg);
    expect(svg).toBe('<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8"/></svg>');
  });

  it('detects and invokes a function component', () => {
    const svg = jsxToSvg('function Logo() { return <svg viewBox="0 0 10 10"><circle cx={5} cy={5} r={4}/></svg>; }', fakeTransformComponent);
    expect(svg).toBe('<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>');
  });

  it('detects and invokes a const arrow-function component', () => {
    const svg = jsxToSvg('const Logo = () => <svg><circle cx={1} cy={1} r={1}/></svg>;', fakeTransformConstComponent);
    expect(svg).toBe('<svg><circle cx="1" cy="1" r="1"/></svg>');
  });

  it('supports the React.createElement call form', () => {
    const svg = jsxToSvg('React.createElement("svg", null, React.createElement("rect", {x: 0}));', fakeTransformReactCreateElement);
    expect(svg).toBe('<svg><rect x="0"/></svg>');
  });

  it('wraps non-svg output in a default svg wrapper', () => {
    const svg = jsxToSvg('<rect/>', () => '__h("rect", null);');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<rect/>');
  });

  it('propagates errors thrown while evaluating the snippet', () => {
    expect(() =>
      jsxToSvg('whatever', () => 'throw new Error("boom");'),
    ).toThrow('boom');
  });
});
