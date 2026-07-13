/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Crop, Download, FileImage, Maximize, RefreshCw, Settings2, Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { baseName, outputFileName, parseSvgDimensions } from '../lib/svg';
import { downloadUrl, rasterizeSvg } from '../lib/raster';

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Converter() {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('image');
  const [scale, setScale] = useState<number>(1);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<CropData>({ x: 0, y: 0, width: 0, height: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSvgContent(content);
        setFileName(baseName(file.name));

        // Attributes, then viewBox, then default — ignores width="100%".
        const { width, height } = parseSvgDimensions(content);
        setOriginalSize({ width, height });
        setCrop({ x: 0, y: 0, width, height });
        setScale(1);
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/svg+xml': ['.svg'] },
    multiple: false,
  } as any);

  useEffect(() => {
    if (!svgContent || !(crop.width > 0) || !(crop.height > 0)) return;
    let active = true;
    rasterizeSvg(svgContent, {
      logicalWidth: originalSize.width,
      logicalHeight: originalSize.height,
      crop,
      scale,
    })
      .then((url) => {
        if (active) setPreviewUrl(url);
      })
      .catch(() => {
        if (active) setPreviewUrl(null);
      });
    return () => {
      active = false;
    };
  }, [svgContent, scale, crop, originalSize]);

  const handleDownload = () => {
    if (previewUrl) downloadUrl(previewUrl, outputFileName(fileName, scale));
  };

  const reset = () => {
    setSvgContent(null);
    setPreviewUrl(null);
    setScale(1);
  };

  return (
    <>
      {svgContent && (
        <div className="flex justify-end mb-4">
          <button
            onClick={reset}
            className="flex items-center gap-2 text-sm font-medium text-[#9e9e9e] hover:text-[#1a1a1a] transition-colors"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Upload & Preview */}
        <div className="lg:col-span-8 space-y-6">
          {!svgContent ? (
            <div
              {...getRootProps()}
              className={`h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-[#d1d1d1] hover:border-[#9e9e9e] bg-white/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                <Upload className="text-[#1a1a1a]" size={24} />
              </div>
              <p className="text-lg font-medium">Drop your SVG here</p>
              <p className="text-[#9e9e9e] text-sm mt-1">or click to browse files</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-black/5 flex items-center justify-between bg-[#fafafa]">
                <div className="flex items-center gap-2">
                  <FileImage size={18} className="text-[#9e9e9e]" />
                  <span className="text-sm font-medium truncate max-w-[200px]">{fileName}.svg</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#9e9e9e]">
                  <span>
                    Original: {Math.round(originalSize.width)} x {Math.round(originalSize.height)}
                  </span>
                  <span>
                    Output: {Math.round(crop.width * scale)} x {Math.round(crop.height * scale)}
                  </span>
                </div>
              </div>

              <div className="flex-1 relative bg-[#f0f0f0] flex items-center justify-center overflow-auto p-8 pattern-grid">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain shadow-2xl bg-white"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <AnimatePresence mode="wait">
            {svgContent ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Scale */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Maximize size={18} className="text-[#1a1a1a]" />
                      <h3 className="font-semibold">Scale</h3>
                    </div>
                    <span className="text-sm font-mono bg-[#f5f5f5] px-2 py-1 rounded-md">
                      {scale.toFixed(2)}x
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#f0f0f0] rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />

                  <div className="grid grid-cols-4 gap-2">
                    {[0.5, 1, 2, 4].map((s) => (
                      <button
                        key={s}
                        onClick={() => setScale(s)}
                        className={`py-2 text-xs font-medium rounded-xl transition-all ${
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

                {/* Crop */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Crop size={18} className="text-[#1a1a1a]" />
                    <h3 className="font-semibold">Crop</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(['x', 'y', 'width', 'height'] as const).map((key) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-[#9e9e9e] font-semibold">
                          {key === 'x' ? 'X Offset' : key === 'y' ? 'Y Offset' : key}
                        </label>
                        <input
                          type="number"
                          value={Math.round(crop[key])}
                          onChange={(e) =>
                            setCrop({ ...crop, [key]: parseInt(e.target.value) || 0 })
                          }
                          className="w-full px-3 py-2 bg-[#f5f5f5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setCrop({ x: 0, y: 0, width: originalSize.width, height: originalSize.height })
                    }
                    className="w-full py-2 text-xs font-medium text-[#9e9e9e] hover:text-emerald-600 transition-colors"
                  >
                    Reset Crop to Original
                  </button>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full bg-[#1a1a1a] text-white py-4 rounded-3xl font-semibold flex items-center justify-center gap-2 hover:bg-[#0a0a0a] transition-all shadow-lg shadow-black/10 active:scale-[0.98]"
                >
                  <Download size={20} />
                  Download PNG
                </button>
              </motion.div>
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-[#f5f5f5] rounded-2xl flex items-center justify-center">
                  <Settings2 className="text-[#9e9e9e]" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold">No Image Loaded</h3>
                  <p className="text-sm text-[#9e9e9e] mt-1">
                    Upload an SVG to start customizing your export.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
