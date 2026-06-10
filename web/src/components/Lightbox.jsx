import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

async function downloadImage(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename || url.split('/').pop() || 'image.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch {
    // 兜底：直接新开窗口
    window.open(url, '_blank');
  }
}

export default function Lightbox({ src, filename, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadImage(src, filename);
          }}
          title="下载"
          className="flex items-center gap-1 bg-neutral-800/90 hover:bg-neutral-700 text-white px-3 py-2 rounded-md text-sm"
        >
          <Download size={16} /> 下载
        </button>
        <button
          onClick={onClose}
          title="关闭 (Esc)"
          className="bg-neutral-800/90 hover:bg-neutral-700 text-white p-2 rounded-md"
        >
          <X size={18} />
        </button>
      </div>
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[92vh] object-contain rounded shadow-2xl"
      />
    </div>
  );
}
