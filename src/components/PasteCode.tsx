/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileCode2 } from 'lucide-react';
import { InputKind, detectInputKind, extractSvg, jsxToSvg } from '../lib/paste';
import { downloadSvg, downloadUrl, rasterizeSvg } from '../lib/raster';
import { parseSvgDimensions } from '../lib/svg';

const SCALES = [1, 2, 4, 8];

const cardCls = 'bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4';
const labelCls = 'text-[10px] uppercase tracking-wider text-[#9e9e9e] font-semibold';

const PLACEHOLDER = `Paste an SVG file's contents, e.g.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="#3b82f6" />
</svg>

...or a JSX/TSX snippet whose markup is SVG with inline attributes:

function Logo() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" style={{ fill: '#3b82f6' }} />
    </svg>
  );
}`;

type Mode = 'auto' | 'svg' | 'jsx';

const MODES: { id: Mode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'svg', label: 'SVG' },
  { id: 'jsx', label: 'JSX' },
];

export default function PasteCode() {
  const [source, setSource] = useState('');
  const [mode, setMode] = useState<Mode>('auto');
  const [scale, setScale] = useState<number>(2);
  const [jsxSvg, setJsxSvg] = useState<string>('');
  const [jsxError, setJsxError] = useState<string | null>(null);
  const [jsxBusy, setJsxBusy] = useState(false);

  const effectiveKind: InputKind = useMemo(() => {
    if (mode === 'svg') return source.trim() ? 'svg' : 'empty';
    if (mode === 'jsx') return source.trim() ? 'jsx' : 'empty';
    return detectInputKind(source);
  }, [source, mode]);

  const svgFromSvgMode = useMemo(
    () => (effectiveKind === 'svg' ? extractSvg(source) : ''),
    [effectiveKind, source],
  );

  // JSX conversion is async (sucrase is dynamically imported), so it runs in
  // an effect rather than useMemo, and recomputes whenever the source/mode
  // changes.
  useEffect(() => {
    if (effectiveKind !== 'jsx') {
      setJsxSvg('');
      setJsxError(null);
      return;
    }
    let cancelled = false;
    setJsxBusy(true);
    setJsxError(null);
    import('sucrase')
      .then(({ transform }) => {
        if (cancelled) return;
        const svg = jsxToSvg(source, (code) =>
          transform(code, {
            transforms: ['jsx', 'typescript'],
            jsxPragma: '__h',
            jsxFragmentPragma: '__f',
            production: true,
          }).code,
        );
        setJsxSvg(svg);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setJsxSvg('');
        setJsxError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setJsxBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveKind, source]);

  const svg = effectiveKind === 'svg' ? svgFromSvgMode : effectiveKind === 'jsx' ? jsxSvg : '';

  const svgError =
    effectiveKind === 'svg' && source.trim() && !svgFromSvgMode
      ? 'No <svg>...</svg> markup found in the pasted text.'
      : null;

  const error = svgError ?? jsxError;

  const fileBase = 'logo';

  const downloadPng = async () => {
    if (!svg) return;
    const { width, height } = parseSvgDimensions(svg);
    const url = await rasterizeSvg(svg, {
      logicalWidth: width,
      logicalHeight: height,
      crop: { x: 0, y: 0, width, height },
      scale,
    });
    downloadUrl(url, `${fileBase}_${scale}x.png`);
  };

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: input + preview */}
      <div className="lg:col-span-7 space-y-6">
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode2 size={18} />
              <h3 className="font-semibold">Paste code</h3>
            </div>
            <div className="flex gap-1 bg-[#f5f5f5] p-1 rounded-xl">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    mode === m.id
                      ? 'bg-white shadow-sm text-[#1a1a1a]'
                      : 'text-[#9e9e9e] hover:text-[#1a1a1a]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            className="w-full h-64 px-3 py-2 bg-[#f5f5f5] rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-y"
          />
          <p className="text-xs text-[#9e9e9e]">
            Inline SVG only — Tailwind classes and imports aren&apos;t evaluated.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden flex flex-col h-[360px]">
          <div className="p-4 border-b border-black/5 flex items-center gap-2 bg-[#fafafa]">
            <FileCode2 size={18} className="text-emerald-600" />
            <span className="text-sm font-medium">Live preview</span>
            {jsxBusy && <span className="text-xs text-[#9e9e9e]">Rendering…</span>}
          </div>
          {error ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="flex items-start gap-3 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 max-w-md">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : svg ? (
            <div
              className="flex-1 flex items-center justify-center p-10 pattern-grid overflow-auto [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-sm text-[#9e9e9e]">
              Paste SVG or JSX above to see a preview.
            </div>
          )}
        </div>
      </div>

      {/* Right: export */}
      <div className="lg:col-span-5 space-y-6">
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Export</h3>
            <div className="flex gap-2">
              {SCALES.map((s) => (
                <button
                  key={s}
                  onClick={() => setScale(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    scale === s
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                      : 'bg-[#f5f5f5] text-[#9e9e9e] hover:bg-[#f0f0f0]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => svg && downloadSvg(svg, `${fileBase}.svg`)}
              disabled={!svg}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#d1d1d1] font-semibold text-sm hover:border-emerald-600 hover:text-emerald-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <Download size={18} /> SVG
            </button>
            <button
              onClick={downloadPng}
              disabled={!svg}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#1a1a1a] text-white font-semibold text-sm hover:bg-[#0a0a0a] transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              <Download size={18} /> PNG ({scale}x)
            </button>
          </div>
        </div>

        <div className={cardCls}>
          <h3 className="font-semibold">How it works</h3>
          <ul className={`${labelCls} normal-case font-normal text-[#6b7280] space-y-2 list-disc pl-4`}>
            <li>
              <span className="font-semibold text-[#1a1a1a]">SVG mode</span> extracts the first{' '}
              <code>&lt;svg&gt;…&lt;/svg&gt;</code> block from what you paste. Reliable — this is
              just your markup, rendered as-is.
            </li>
            <li>
              <span className="font-semibold text-[#1a1a1a]">JSX mode</span> transpiles your
              snippet in the browser and evaluates it against a minimal SVG-only renderer. It
              understands inline attributes and <code>style={'{{ }}'}</code> objects, but not
              Tailwind <code>className</code>s, hooks, state, or imports.
            </li>
            <li>Auto mode picks SVG or JSX based on what you paste.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
