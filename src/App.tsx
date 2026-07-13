/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Braces, ImageDown, Sparkles } from 'lucide-react';
import Converter from './components/Converter';
import LogoBuilder from './components/LogoBuilder';
import PasteCode from './components/PasteCode';

type Tab = 'convert' | 'logo' | 'paste';

export default function App() {
  const [tab, setTab] = useState<Tab>('convert');

  const tabs: { id: Tab; label: string; icon: typeof ImageDown }[] = [
    { id: 'convert', label: 'SVG → PNG', icon: ImageDown },
    { id: 'logo', label: 'Logo Builder', icon: Sparkles },
    { id: 'paste', label: 'Paste Code', icon: Braces },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-light tracking-tight text-[#0a0a0a]">
                SVG <span className="font-semibold text-emerald-600">to</span> PNG
              </h1>
              <p className="text-[#9e9e9e] mt-1">
                Convert &amp; resize SVGs, or build a wordmark logo — export SVG or PNG.
              </p>
            </div>

            <nav className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm border border-black/5 self-start">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    tab === id
                      ? 'bg-[#1a1a1a] text-white shadow-sm'
                      : 'text-[#9e9e9e] hover:text-[#1a1a1a]'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {tab === 'convert' ? (
          <Converter />
        ) : tab === 'logo' ? (
          <LogoBuilder />
        ) : (
          <PasteCode />
        )}
      </div>

      <style>{`
        .pattern-grid {
          background-image: radial-gradient(#d1d1d1 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
