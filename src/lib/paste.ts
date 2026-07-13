/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Pure, DOM-free helpers for the "Paste Code" tab: detect whether pasted text
// is raw SVG or a JSX/TSX snippet, extract the SVG markup, and (best-effort)
// serialise a JSX snippet to an SVG string via an injected transpile function.
// Kept free of browser APIs so this can be unit-tested in a plain Node context
// (see tests/paste.test.ts).

export type InputKind = 'empty' | 'svg' | 'jsx';

/**
 * Classify pasted source as empty, raw SVG, or JSX/TSX.
 *
 * Leading `<?xml ...?>` prologues and `<!-- comments -->` are skipped before
 * checking for a `<svg` root tag.
 */
export function detectInputKind(src: string): InputKind {
  const trimmed = src.trim();
  if (!trimmed) return 'empty';

  let rest = trimmed;
  // Skip a leading XML prologue.
  rest = rest.replace(/^<\?xml[^>]*\?>\s*/i, '');
  // Skip any leading HTML/XML comments.
  rest = rest.replace(/^(\s*<!--[\s\S]*?-->\s*)+/, '');

  return /^<svg\b/i.test(rest) ? 'svg' : 'jsx';
}

/**
 * Extract the `<svg …>…</svg>` substring from arbitrary pasted text (the
 * first `<svg` to the last `</svg>`), or `''` if no SVG root is present.
 */
export function extractSvg(src: string): string {
  const start = src.search(/<svg\b/i);
  if (start === -1) return '';
  const endMatches = src.match(/<\/svg\s*>/gi);
  if (!endMatches) return '';
  const lastTag = endMatches[endMatches.length - 1];
  const end = src.lastIndexOf(lastTag);
  if (end === -1 || end < start) return '';
  return src.slice(start, end + lastTag.length);
}

// ---------------------------------------------------------------------------
// JSX runtime pragma: `createSvgElement`/`createSvgFragment` serialise a JSX
// call tree straight to an XML string instead of a real DOM/vdom, so pasted
// JSX can be rendered without React reconciliation.
// ---------------------------------------------------------------------------

/** SVG attributes that are legitimately camelCase and must NOT be hyphenated. */
const CAMEL_CASE_ALLOWLIST = new Set([
  'viewBox',
  'preserveAspectRatio',
  'gradientUnits',
  'gradientTransform',
  'patternUnits',
  'patternContentUnits',
  'spreadMethod',
  'stdDeviation',
  'baseFrequency',
  'numOctaves',
  'tableValues',
  'clipPathUnits',
  'refX',
  'refY',
  'markerWidth',
  'markerHeight',
  'markerUnits',
]);

/** Explicit renames for attributes that don't follow a simple kebab rule. */
const ATTR_RENAMES: Record<string, string> = {
  className: 'class',
  xmlnsXlink: 'xmlns:xlink',
  xlinkHref: 'xlink:href',
};

const xmlEscape = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const kebabCase = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Convert a camelCase JSX prop name to its SVG attribute name. */
function toAttrName(name: string): string {
  if (name in ATTR_RENAMES) return ATTR_RENAMES[name];
  if (CAMEL_CASE_ALLOWLIST.has(name)) return name;
  if (/^(data|aria)-/.test(name)) return name;
  if (/^[a-z][a-zA-Z0-9]*$/.test(name) && /[A-Z]/.test(name)) return kebabCase(name);
  return name;
}

/** Convert a `style` object's camelCase keys to a kebab inline CSS string. */
function styleObjectToCss(style: Record<string, unknown>): string {
  return Object.entries(style)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => `${kebabCase(k)}: ${v}`)
    .join('; ');
}

function serializeProps(props: Record<string, unknown> | null | undefined): string {
  if (!props) return '';
  let out = '';
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key' || key === 'ref') continue;
    if (/^on[A-Z]/.test(key)) continue; // event handlers
    if (typeof value === 'function') continue;
    if (value === null || value === undefined || value === false) continue;

    const attrName = toAttrName(key);

    if (value === true) {
      out += ` ${attrName}`;
      continue;
    }

    if (key === 'style' && typeof value === 'object') {
      const css = styleObjectToCss(value as Record<string, unknown>);
      if (css) out += ` style="${xmlEscape(css)}"`;
      continue;
    }

    out += ` ${attrName}="${xmlEscape(String(value))}"`;
  }
  return out;
}

// `createSvgElement`/`createSvgFragment` must return plain strings (per their
// public signature), so a nested call's output and a literal JSX text child
// are both just `string` by the time a parent call receives them as
// `children`. To tell them apart (and avoid re-escaping already-serialised
// markup) every string this module produces is recorded here; anything not
// in the registry is treated as literal text and escaped.
const knownMarkup = new Set<string>();

function registerMarkup(html: string): string {
  knownMarkup.add(html);
  return html;
}

function serializeChild(child: unknown): string {
  if (child === null || child === undefined || child === false || child === true) return '';
  if (Array.isArray(child)) return child.map(serializeChild).join('');
  if (typeof child === 'string') return knownMarkup.has(child) ? child : xmlEscape(child);
  if (typeof child === 'number') return String(child);
  return String(child);
}

/**
 * JSX pragma target: serialise one element (and its children) to an XML
 * string. Used as `__h` by transpiled JSX (`jsxPragma: '__h'`). A function
 * `tag` is treated as a component and invoked directly (its return value,
 * itself a serialised string, is used as-is).
 */
export function createSvgElement(
  tag: unknown,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): string {
  if (typeof tag === 'function') {
    const mergedChildren = children.length === 0 ? undefined : children.length === 1 ? children[0] : children;
    const componentProps = { ...(props ?? {}) };
    if (mergedChildren !== undefined) componentProps.children = mergedChildren;
    return registerMarkup(String(tag(componentProps)));
  }

  const tagName = String(tag);
  const attrs = serializeProps(props);
  const kids = children.length > 0 ? children : props?.children !== undefined ? [props.children] : [];
  const inner = kids.map(serializeChild).join('');

  return registerMarkup(inner ? `<${tagName}${attrs}>${inner}</${tagName}>` : `<${tagName}${attrs}/>`);
}

/**
 * JSX pragma target for fragments (`<>...</>`). Used as `__f`.
 */
export function createSvgFragment(...children: unknown[]): string {
  return registerMarkup(children.map(serializeChild).join(''));
}

const DEFAULT_WRAPPER_SIZE = 256;

/**
 * Best-effort JSX/TSX → SVG string conversion.
 *
 * `transform` is an injected transpile function (JSX/TS → plain JS calling
 * `__h`/`__f`), kept as a parameter so this stays pure and Node-testable
 * without depending on a real transpiler. The browser caller passes a
 * sucrase-backed transform; tests pass a trivial/fake one.
 *
 * Handles two common shapes of pasted snippet:
 *  - a bare JSX expression, e.g. `<svg>...</svg>`
 *  - a component declaration (`function Foo() {...}` / `const Foo = () =>
 *    (...)`), which is detected and invoked with `{}` props.
 *
 * This is intentionally bounded: no hooks, state, imports, or Tailwind.
 */
export function jsxToSvg(jsxSource: string, transform: (code: string) => string): string {
  let code = jsxSource;

  // Strip import statements (imports/Tailwind classes aren't evaluated).
  code = code.replace(/^\s*import\s[^;]*;?\s*$/gm, '');
  // Strip a leading `export default` / `export` keyword.
  code = code.replace(/^\s*export\s+default\s+/m, '');
  code = code.replace(/^\s*export\s+/gm, '');

  const transpiled = transform(code).trim();

  // Bound the markup registry's lifetime to a single conversion so repeated
  // pastes in a long-lived session don't accumulate strings indefinitely.
  knownMarkup.clear();

  const React = { createElement: createSvgElement, Fragment: createSvgFragment };
  const args: [typeof createSvgElement, typeof createSvgFragment, typeof React] = [
    createSvgElement,
    createSvgFragment,
    React,
  ];

  let result = evaluateAsExpression(transpiled, args);
  if (result === undefined) {
    result = evaluateAsStatements(transpiled, args);
  }
  if (typeof result === 'function') {
    result = result({});
  }

  if (typeof result !== 'string' || !result.trim()) {
    throw new Error(
      'Pasted JSX did not evaluate to renderable markup. Make sure it renders a single SVG element.',
    );
  }

  if (!/<svg\b/i.test(result)) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${DEFAULT_WRAPPER_SIZE}" height="${DEFAULT_WRAPPER_SIZE}" viewBox="0 0 ${DEFAULT_WRAPPER_SIZE} ${DEFAULT_WRAPPER_SIZE}">${result}</svg>`;
  }
  return result;
}

type SandboxArgs = [typeof createSvgElement, typeof createSvgFragment, unknown];

/**
 * Try treating the whole transpiled snippet as a single expression (the
 * common "bare JSX" paste). Returns `undefined` (without executing anything)
 * if it isn't valid as one, so the caller can fall back to statement mode.
 */
function evaluateAsExpression(transpiled: string, args: SandboxArgs): unknown {
  const stripped = transpiled.replace(/;\s*$/, '');
  let fn: (...a: SandboxArgs) => unknown;
  try {
    // eslint-disable-next-line no-new-func
    fn = new Function('__h', '__f', 'React', `"use strict"; return (\n${stripped}\n);`) as (
      ...a: SandboxArgs
    ) => unknown;
  } catch {
    return undefined;
  }
  return fn(...args);
}

/**
 * Run the transpiled snippet as statements (function/const declarations),
 * then locate the last declared component and invoke it with `{}` props.
 */
function evaluateAsStatements(transpiled: string, args: SandboxArgs): unknown {
  const invokeName = findComponentName(transpiled);
  const trailer = invokeName
    ? `if (typeof ${invokeName} !== 'undefined') { __result = typeof ${invokeName} === 'function' ? ${invokeName}({}) : ${invokeName}; }`
    : '';
  const body = `
    "use strict";
    let __result;
    ${transpiled}
    ${trailer}
    return __result;
  `;
  // eslint-disable-next-line no-new-func
  const fn = new Function('__h', '__f', 'React', body) as (...a: SandboxArgs) => unknown;
  return fn(...args);
}

/** Find the last top-level function/const declaration name in a snippet. */
function findComponentName(code: string): string | undefined {
  const fnDeclMatch = code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
  const constFnMatches = [
    ...code.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g),
  ];
  const constExprMatches = [...code.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=/g)];

  return (
    fnDeclMatch?.[1] ??
    constFnMatches[constFnMatches.length - 1]?.[1] ??
    constExprMatches[constExprMatches.length - 1]?.[1]
  );
}
