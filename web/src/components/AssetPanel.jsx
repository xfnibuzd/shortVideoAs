import { useEffect, useState } from 'react';
import { Plus, Trash2, User, Image as ImageIcon, Box } from 'lucide-react';
import { api, fileUrl } from '../api.js';

const TYPES = [
  { key: 'person', label: '人物', icon: User },
  { key: 'background', label: '背景', icon: ImageIcon },
  { key: 'prop', label: '道具', icon: Box },
];

export default function AssetPanel({ projectId }) {
  const [type, setType] = useState('person');
  const [assets, setAssets] = useState([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);

  const load = async () => setAssets(await api.listAssets(projectId, type));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, type]);

  const add = async () => {
    if (!name.trim()) return;
    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('type', type);
    if (file) fd.append('image', file);
    await api.createAsset(projectId, fd);
    setAdding(false);
    setName('');
    setFile(null);
    load();
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
                <img src={fileUrl(a.image_path)} alt={a.name} className="w-full h-full object-cover" />
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
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="资产名称"
            className="w-full mb-2 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm outline-none"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full mb-2 text-xs text-neutral-400"
          />
          <div className="flex gap-2">
            <button onClick={add} className="flex-1 bg-brand text-black rounded py-1 text-sm font-medium">
              保存
            </button>
            <button onClick={() => setAdding(false)} className="flex-1 bg-neutral-800 rounded py-1 text-sm">
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
    </div>
  );
}
