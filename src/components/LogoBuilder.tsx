/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { Download, Plus, Sparkles, Trash2, Type } from 'lucide-react';
import {
  DEFAULT_LOGO_OPTIONS,
  LogoOptions,
  LogoSegment,
  buildLogoSvg,
} from '../lib/logo';
import { downloadSvg, downloadUrl, rasterizeSvg } from '../lib/raster';
import { parseSvgDimensions } from '../lib/svg';

const FONT_STACKS: { label: string; value: string }[] = [
  { label: 'System Sans', value: DEFAULT_LOGO_OPTIONS.fontFamily },
  { label: 'Georgia Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Monospace', value: "'SFMono-Regular', Menlo, Consolas, monospace" },
  { label: 'Trebuchet', value: "'Trebuchet MS', Verdana, sans-serif" },
];

const SCALES = [1, 2, 4, 8];

const field =
  'w-full px-3 py-2 bg-[#f5f5f5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600';
const cardCls = 'bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4';
const labelCls = 'text-[10px] uppercase tracking-wider text-[#9e9e9e] font-semibold';

export default function LogoBuilder() {
  const [options, setOptions] = useState<LogoOptions>(DEFAULT_LOGO_OPTIONS);
  const [scale, setScale] = useState<number>(2);

  const svg = useMemo(() => buildLogoSvg(options), [options]);
  const fileBase =
    options.segments
      .map((s) => s.text)
      .join('')
      .replace(/[^a-z0-9]+/gi, '') || 'logo';

  const set = (patch: Partial<LogoOptions>) => setOptions((o) => ({ ...o, ...patch }));

  const setSegment = (i: number, patch: Partial<LogoSegment>) =>
    setOptions((o) => ({
      ...o,
      segments: o.segments.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));

  const addSegment = () =>
    setOptions((o) => ({
      ...o,
      segments: [...o.segments, { text: 'Text', color: '#0f172a' }],
    }));

  const removeSegment = (i: number) =>
    setOptions((o) => ({
      ...o,
      segments: o.segments.length > 1 ? o.segments.filter((_, idx) => idx !== i) : o.segments,
    }));

  const downloadPng = async () => {
    const { width, height } = parseSvgDimensions(svg);
    const url = await rasterizeSvg(svg, {
      logicalWidth: width,
      logicalHeight: height,
      crop: { x: 0, y: 0, width, height },
      scale,
    });
    downloadUrl(url, `${fileBase}_${scale}x.png`);
  };

  const badge = options.badge;

  return (
    <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: live preview */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden flex flex-col h-[420px]">
          <div className="p-4 border-b border-black/5 flex items-center gap-2 bg-[#fafafa]">
            <Sparkles size={18} className="text-emerald-600" />
            <span className="text-sm font-medium">Live preview</span>
          </div>
          <div
            className="flex-1 flex items-center justify-center p-10 pattern-grid overflow-auto [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:h-auto"
            style={{
              background: options.background ? undefined : '#f0f0f0',
              backgroundColor: options.background || undefined,
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>

        {/* Export */}
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
              onClick={() => downloadSvg(svg, `${fileBase}.svg`)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#d1d1d1] font-semibold text-sm hover:border-emerald-600 hover:text-emerald-600 transition-colors"
            >
              <Download size={18} /> SVG
            </button>
            <button
              onClick={downloadPng}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#1a1a1a] text-white font-semibold text-sm hover:bg-[#0a0a0a] transition-all active:scale-[0.98]"
            >
              <Download size={18} /> PNG ({scale}x)
            </button>
          </div>
        </div>
      </div>

      {/* Right: controls */}
      <div className="lg:col-span-5 space-y-6">
        {/* Text segments */}
        <div className={cardCls}>
          <div className="flex items-center gap-2">
            <Type size={18} />
            <h3 className="font-semibold">Wordmark</h3>
          </div>
          <p className="text-xs text-[#9e9e9e] -mt-2">
            Add a run per colour, e.g. “Damp” + “App” for a two-tone logo.
          </p>
          <div className="space-y-2">
            {options.segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={seg.text}
                  onChange={(e) => setSegment(i, { text: e.target.value })}
                  className={field}
                  placeholder="Text"
                />
                <input
                  type="color"
                  value={seg.color}
                  onChange={(e) => setSegment(i, { color: e.target.value })}
                  className="h-9 w-10 shrink-0 rounded-lg border border-[#d1d1d1] cursor-pointer bg-white"
                  aria-label="Segment colour"
                />
                <button
                  onClick={() => removeSegment(i)}
                  disabled={options.segments.length <= 1}
                  className="shrink-0 p-2 text-[#9e9e9e] hover:text-red-500 disabled:opacity-30 disabled:hover:text-[#9e9e9e]"
                  aria-label="Remove segment"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addSegment}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            <Plus size={14} /> Add segment
          </button>
        </div>

        {/* Typography */}
        <div className={cardCls}>
          <h3 className="font-semibold">Typography</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Font</label>
              <select
                value={options.fontFamily}
                onChange={(e) => set({ fontFamily: e.target.value })}
                className={field}
              >
                {FONT_STACKS.map((f) => (
                  <option key={f.label} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Weight</label>
              <select
                value={String(options.fontWeight)}
                onChange={(e) => set({ fontWeight: e.target.value })}
                className={field}
              >
                {['400', '600', '700', '800', '900'].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Size ({options.fontSize}px)</label>
              <input
                type="range"
                min="32"
                max="200"
                step="2"
                value={options.fontSize}
                onChange={(e) => set({ fontSize: parseInt(e.target.value) })}
                className="w-full h-1.5 mt-3 bg-[#f0f0f0] rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Tracking ({options.letterSpacing}px)</label>
              <input
                type="range"
                min="-6"
                max="12"
                step="0.5"
                value={options.letterSpacing}
                onChange={(e) => set({ letterSpacing: parseFloat(e.target.value) })}
                className="w-full h-1.5 mt-3 bg-[#f0f0f0] rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Badge */}
        <div className={cardCls}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Badge</h3>
            <button
              onClick={() =>
                set({
                  badge: badge
                    ? null
                    : { text: 'PRO', from: '#facc15', to: '#d97706', textColor: '#ffffff' },
                })
              }
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                badge
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'text-[#9e9e9e] border-[#d1d1d1]'
              }`}
            >
              {badge ? 'On' : 'Off'}
            </button>
          </div>
          {badge && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className={labelCls}>Label</label>
                <input
                  type="text"
                  value={badge.text}
                  onChange={(e) => set({ badge: { ...badge, text: e.target.value } })}
                  className={field}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>From</label>
                  <input
                    type="color"
                    value={badge.from}
                    onChange={(e) => set({ badge: { ...badge, from: e.target.value } })}
                    className="h-9 w-full rounded-lg border border-[#d1d1d1] cursor-pointer bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>To</label>
                  <input
                    type="color"
                    value={badge.to}
                    onChange={(e) => set({ badge: { ...badge, to: e.target.value } })}
                    className="h-9 w-full rounded-lg border border-[#d1d1d1] cursor-pointer bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Text</label>
                  <input
                    type="color"
                    value={badge.textColor}
                    onChange={(e) => set({ badge: { ...badge, textColor: e.target.value } })}
                    className="h-9 w-full rounded-lg border border-[#d1d1d1] cursor-pointer bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Extras */}
        <div className={cardCls}>
          <h3 className="font-semibold">Extras</h3>
          <label className="flex items-center justify-between text-sm">
            <span>Trademark ™</span>
            <input
              type="checkbox"
              checked={!!options.trademark}
              onChange={(e) => set({ trademark: e.target.checked })}
              className="h-4 w-4 accent-emerald-600"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Background</span>
            <span className="flex items-center gap-2">
              <button
                onClick={() => set({ background: options.background ? null : '#ffffff' })}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  options.background
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'text-[#9e9e9e] border-[#d1d1d1]'
                }`}
              >
                {options.background ? 'Solid' : 'Transparent'}
              </button>
              {options.background && (
                <input
                  type="color"
                  value={options.background}
                  onChange={(e) => set({ background: e.target.value })}
                  className="h-9 w-10 rounded-lg border border-[#d1d1d1] cursor-pointer bg-white"
                />
              )}
            </span>
          </label>
        </div>
      </div>
    </main>
  );
}
