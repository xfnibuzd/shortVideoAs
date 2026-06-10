import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import { api } from '../api.js';

export default function TemplateDialog({ projectId, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null); // null | {id?, name, content}

  const load = async () => setTemplates(await api.listTemplates(projectId));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const startNew = () => setEditing({ name: '', content: '' });

  const save = async () => {
    if (!editing.name.trim()) return;
    if (editing.id) {
      // 更新走 PATCH
      await fetch(`/api/prompt-templates/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editing.name.trim(), content: editing.content }),
      });
    } else {
      await api.createTemplate(projectId, editing.name.trim(), editing.content);
    }
    setEditing(null);
    load();
  };

  const del = async (id) => {
    if (!confirm('删除该模版？')) return;
    await api.deleteTemplate(id);
    load();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg w-[560px] max-h-[80vh] flex flex-col p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">提示词模版（项目级）</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {editing ? (
          <div className="flex-1 overflow-y-auto">
            <label className="text-xs text-neutral-400">模版名称</label>
            <input
              autoFocus
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="例如：写实人像九宫格"
              className="w-full mt-1 mb-3 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <label className="text-xs text-neutral-400">提示词内容</label>
            <textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder="在此编写提示词，可在其中约束图片格式、尺寸、风格、数量等。"
              rows={8}
              className="w-full mt-1 mb-4 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm outline-none focus:border-brand resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700">
                取消
              </button>
              <button
                onClick={save}
                disabled={!editing.name.trim()}
                className="px-4 py-2 rounded bg-brand text-black font-medium disabled:opacity-40"
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-10">还没有模版，点击下方按钮新增。</p>
              ) : (
                templates.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-start justify-between gap-2 p-3 rounded border border-neutral-800 hover:border-neutral-600"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2 whitespace-pre-wrap">
                        {t.content || '（无内容）'}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setEditing({ id: t.id, name: t.name, content: t.content })}
                        className="p-1.5 rounded hover:bg-neutral-700 text-neutral-400"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => del(t.id)}
                        className="p-1.5 rounded hover:bg-neutral-700 text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={startNew}
              className="flex items-center gap-1 justify-center mt-3 py-2 text-sm text-neutral-300 border border-dashed border-neutral-700 rounded hover:text-white hover:border-neutral-500"
            >
              <Plus size={14} /> 新增模版
            </button>
          </>
        )}
      </div>
    </div>
  );
}
