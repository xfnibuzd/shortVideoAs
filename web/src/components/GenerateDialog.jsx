import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function GenerateDialog({ projectId, shotId, onClose, onGenerated }) {
  const [assets, setAssets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState([]); // asset ids (含人物多选/道具/背景)
  const [templateId, setTemplateId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listAssets(projectId).then(setAssets);
    api.listTemplates(projectId).then(setTemplates);
  }, [projectId]);

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const group = (type) => assets.filter((a) => a.type === type);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.createGeneration(shotId, selected, templateId || null);
      onGenerated();
    } catch (e) {
      setError(e.code === 'GENERATION_BUSY' ? '已有任务生成中，请等待完成后再试' : e.message);
      setSubmitting(false);
    }
  };

  const Section = ({ title, type }) => {
    const items = group(type);
    if (!items.length) return null;
    return (
      <div className="mb-3">
        <p className="text-xs text-neutral-400 mb-1">{title}</p>
        <div className="flex flex-wrap gap-2">
          {items.map((a) => (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className={`px-3 py-1 rounded text-sm border ${
                selected.includes(a.id)
                  ? 'border-brand text-brand'
                  : 'border-neutral-700 text-neutral-300'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-lg w-[480px] max-h-[80vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">生成分镜图片</h3>

        <Section title="角色（可多选）" type="person" />
        <Section title="背景" type="background" />
        <Section title="道具" type="prop" />
        {assets.length === 0 && (
          <p className="text-xs text-neutral-500 mb-3">暂无资产，可直接基于剧本与模版生成。</p>
        )}

        <div className="mb-4">
          <p className="text-xs text-neutral-400 mb-1">提示词模版</p>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-sm outline-none"
          >
            <option value="">不使用模版</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700">
            取消
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded bg-brand text-black font-medium disabled:opacity-40"
          >
            {submitting ? '提交中…' : '开始生成'}
          </button>
        </div>
      </div>
    </div>
  );
}
