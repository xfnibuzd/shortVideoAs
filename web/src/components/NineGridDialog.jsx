import { useEffect, useState } from 'react';
import { X, Download, Save, Check } from 'lucide-react';
import { api } from '../api.js';

function sliceImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const sw = Math.floor(W / 3);
      const sh = Math.floor(H / 3);
      const result = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const canvas = document.createElement('canvas');
          canvas.width = sw;
          canvas.height = sh;
          canvas.getContext('2d').drawImage(img, col * sw, row * sh, sw, sh, 0, 0, sw, sh);
          result.push({ url: canvas.toDataURL('image/png'), label: `宫格${row * 3 + col + 1}` });
        }
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function NineGridDialog({ src, shotId, onClose, onSaved }) {
  const [slices, setSlices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedSet, setSavedSet] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!src) return;
    setLoading(true);
    setError('');
    setSlices([]);
    setSavedSet(new Set());
    sliceImage(src)
      .then((s) => { setSlices(s); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [src]);

  const saveOne = async (s) => {
    if (!shotId || savedSet.has(s.label)) return;
    setSaving(true);
    try {
      await api.saveSlicesToShot(shotId, s.label, [s.url]);
      setSavedSet((prev) => new Set([...prev, s.label]));
      onSaved?.();
    } catch (e) {
      alert(`保存失败: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    if (!shotId || !slices.length) return;
    const unsaved = slices.filter((s) => !savedSet.has(s.label));
    if (!unsaved.length) return;
    setSaving(true);
    try {
      await api.saveSlicesToShot(shotId, '九宫格切割', unsaved.map((s) => s.url));
      setSavedSet(new Set(slices.map((s) => s.label)));
      onSaved?.();
    } catch (e) {
      alert(`保存失败: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const downloadAll = () => {
    slices.forEach((s, i) => setTimeout(() => downloadDataUrl(s.url, `${s.label}.png`), i * 80));
  };

  const allSaved = slices.length > 0 && slices.every((s) => savedSet.has(s.label));

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg p-5 w-[600px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">九宫格切割</h3>
          <div className="flex items-center gap-2">
            {slices.length > 0 && (
              <>
                {shotId && (
                  <button
                    onClick={saveAll}
                    disabled={saving || allSaved}
                    className="flex items-center gap-1 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 text-white px-3 py-1.5 rounded text-sm"
                  >
                    {allSaved ? <Check size={14} /> : <Save size={14} />}
                    {allSaved ? '已全部保存' : '全部保存到分镜'}
                  </button>
                )}
                <button
                  onClick={downloadAll}
                  className="flex items-center gap-1 bg-brand text-black px-3 py-1.5 rounded text-sm font-medium"
                >
                  <Download size={14} /> 全部下载
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {loading && <p className="text-center text-neutral-500 py-12">切割中…</p>}
        {error && <p className="text-center text-red-400 py-12">{error}</p>}

        {slices.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {slices.map((s) => {
              const saved = savedSet.has(s.label);
              return (
                <div key={s.label} className="group relative">
                  <img
                    src={s.url}
                    alt={s.label}
                    className="w-full aspect-square object-cover rounded bg-neutral-800"
                  />
                  {saved && (
                    <div className="absolute top-1 right-1 bg-green-600 rounded-full p-0.5">
                      <Check size={11} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 rounded transition">
                    <button
                      onClick={() => downloadDataUrl(s.url, `${s.label}.png`)}
                      className="bg-white/20 hover:bg-white/30 p-2 rounded"
                      title="下载"
                    >
                      <Download size={14} />
                    </button>
                    {shotId && (
                      <button
                        onClick={() => saveOne(s)}
                        disabled={saving || saved}
                        className="bg-white/20 hover:bg-white/30 disabled:opacity-40 p-2 rounded"
                        title={saved ? '已保存' : '保存到分镜'}
                      >
                        {saved ? <Check size={14} /> : <Save size={14} />}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-center text-neutral-400 mt-1">{s.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
