import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Film, Trash2, Pencil } from 'lucide-react';
import { api } from '../api.js';

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [menuId, setMenuId] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await api.listProjects());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    const p = await api.createProject(name.trim());
    setShowCreate(false);
    setName('');
    navigate(`/project/${p.id}`);
  };

  const remove = async (id) => {
    if (!confirm('确定删除该项目？此操作不可恢复。')) return;
    await api.deleteProject(id);
    setMenuId(null);
    load();
  };

  const rename = async (p) => {
    const newName = prompt('重命名项目', p.name);
    if (newName && newName.trim()) {
      await api.renameProject(p.id, newName.trim());
      setMenuId(null);
      load();
    }
  };

  const fmt = (ts) => new Date(ts).toLocaleString('zh-CN', { hour12: false });

  return (
    <div className="min-h-full p-6" onClick={() => setMenuId(null)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-brand font-semibold border-b-2 border-brand pb-1">
            我的项目 ({projects.length})
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 bg-brand text-black font-medium px-4 py-2 rounded-md hover:brightness-95"
        >
          <Plus size={16} /> 创建项目
        </button>
      </div>

      {loading ? (
        <p className="text-neutral-500">加载中...</p>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-32 text-neutral-500">
          <Film size={48} className="mb-3 opacity-50" />
          <p className="mb-4">还没有项目，创建你的第一个项目吧</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 bg-brand text-black font-medium px-4 py-2 rounded-md"
          >
            <Plus size={16} /> 创建项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/project/${p.id}`)}
              className="group cursor-pointer rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-600 transition"
            >
              <div className="relative aspect-video bg-neutral-800 flex items-center justify-center">
                <Film className="text-neutral-600" size={32} />
                <span className="absolute bottom-1 right-1 text-xs bg-black/70 px-1.5 py-0.5 rounded">
                  共 {p.chapter_count} 章
                </span>
                <div
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(menuId === p.id ? null : p.id);
                  }}
                >
                  <button className="bg-black/70 p-1 rounded">
                    <MoreHorizontal size={16} />
                  </button>
                  {menuId === p.id && (
                    <div className="absolute right-0 mt-1 w-28 bg-neutral-800 border border-neutral-700 rounded shadow-lg z-10 text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rename(p);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-neutral-700"
                      >
                        <Pencil size={14} /> 重命名
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(p.id);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-neutral-700 text-red-400"
                      >
                        <Trash2 size={14} /> 删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-2">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-neutral-500 mt-1">{fmt(p.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-lg w-96 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">创建项目</h3>
            <label className="text-sm text-neutral-400">项目名称</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="请输入项目名称"
              className="w-full mt-1 mb-4 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 outline-none focus:border-brand"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700"
              >
                取消
              </button>
              <button
                onClick={create}
                disabled={!name.trim()}
                className="px-4 py-2 rounded bg-brand text-black font-medium disabled:opacity-40"
              >
                立即创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
