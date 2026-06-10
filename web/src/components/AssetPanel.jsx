import { useEffect, useState } from 'react';
import { Plus, Trash2, User, Image as ImageIcon, Box } from 'lucide-react';
import { api, fileUrl } from '../api.js';
import Lightbox from './Lightbox.jsx';

const TYPES = [
  { key: 'person', label: '人物', icon: User },
  { key: 'background', label: '背景', icon: ImageIcon },
  { key: 'prop', label: '道具', icon: Box },
];

export default function AssetPanel({ projectId }) {
  const [type, setType] = useState('person');
  const [assets, setAssets] = useState([]);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState('upload'); // upload | ai
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const load = async () => setAssets(await api.listAssets(projectId, type));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, type]);

  const reset = () => {
    setAdding(false);
    setName('');
    setFile(null);
    setPrompt('');
    setError('');
    setGenerating(false);
  };

  const add = async () => {
    if (!name.trim()) return;
    setError('');
    try {
      if (mode === 'ai') {
        if (!prompt.trim()) {
          setError('请填写提示词');
          return;
        }
        setGenerating(true);
        await api.createAssetAI(projectId, { name: name.trim(), type, prompt: prompt.trim() });
      } else {
        const fd = new FormData();
        fd.append('name', name.trim());
        fd.append('type', type);
        if (file) fd.append('image', file);
        await api.createAsset(projectId, fd);
      }
      reset();
      load();
    } catch (e) {
      setError(e.message || 'AI 生成失败');
      setGenerating(false);
    }
  };

  const del = async (id) => {
    if (!confirm('删除该资产？')) return;
    await api.deleteAsset(id);
    load();
  };

  return (
    <div className="p-3">
      <div className="flex gap-1 mb-3 bg-neutral-900 rounded p-0.5 text-sm">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`flex-1 py-1 rounded ${
              type === t.key ? 'bg-neutral-700 text-white' : 'text-neutral-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {assets.map((a) => (
          <div key={a.id} className="group relative rounded bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="aspect-square bg-neutral-800 flex items-center justify-center">
              {a.image_path ? (
                <img
                  src={fileUrl(a.image_path)}
                  alt={a.name}
                  onClick={() => setPreview(fileUrl(a.image_path))}
                  className="w-full h-full object-cover cursor-zoom-in hover:opacity-90"
                />
              ) : (
                <span className="text-neutral-600 text-xs">无图</span>
              )}
            </div>
            <p className="text-xs p-1 truncate">{a.name}</p>
            <button
              onClick={() => del(a.id)}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/70 p-1 rounded text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 p-2 bg-neutral-900 rounded border border-neutral-800">
          <div className="flex gap-1 mb-2 bg-neutral-800 rounded p-0.5 text-xs">
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 py-1 rounded ${mode === 'upload' ? 'bg-neutral-600 text-white' : 'text-neutral-400'}`}
            >
              本地上传
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 py-1 rounded ${mode === 'ai' ? 'bg-neutral-600 text-white' : 'text-neutral-400'}`}
            >
              AI 生成
            </button>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="资产名称"
            className="w-full mb-2 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm outline-none"
          />
          {mode === 'upload' ? (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full mb-2 text-xs text-neutral-400"
            />
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述要生成的形象，可含风格/尺寸约束…"
              rows={3}
              className="w-full mb-2 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm outline-none resize-none"
            />
          )}
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={add}
              disabled={generating}
              className="flex-1 bg-brand text-black rounded py-1 text-sm font-medium disabled:opacity-50"
            >
              {generating ? '生成中…' : mode === 'ai' ? 'AI 生成并保存' : '保存'}
            </button>
            <button onClick={reset} disabled={generating} className="flex-1 bg-neutral-800 rounded py-1 text-sm disabled:opacity-50">
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 w-full justify-center mt-3 py-2 text-sm text-neutral-400 border border-dashed border-neutral-700 rounded hover:text-white"
        >
          <Plus size={14} /> 新增{TYPES.find((t) => t.key === type).label}
        </button>
      )}

      <Lightbox src={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
