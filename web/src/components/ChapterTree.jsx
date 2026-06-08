import { Plus, Film, Trash2 } from 'lucide-react';
import { api } from '../api.js';

export default function ChapterTree({ projectId, chapters, activeShotId, onSelectShot, onChanged }) {
  const addChapter = async () => {
    await api.createChapter(projectId);
    onChanged();
  };
  const addShot = async (chapterId) => {
    const shot = await api.createShot(chapterId);
    await onChanged();
    onSelectShot(shot.id);
  };
  const delShot = async (e, id) => {
    e.stopPropagation();
    if (!confirm('删除该分镜？')) return;
    await api.deleteShot(id);
    if (activeShotId === id) onSelectShot(null);
    onChanged();
  };

  return (
    <div className="p-2">
      {chapters.map((ch) => (
        <div key={ch.id} className="mb-2">
          <div className="flex items-center justify-between px-2 py-1 text-sm text-neutral-300">
            <span className="font-medium truncate">{ch.title}</span>
            <button
              onClick={() => addShot(ch.id)}
              title="新增分镜"
              className="text-neutral-500 hover:text-white"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="ml-2">
            {ch.shots.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectShot(s.id)}
                className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded cursor-pointer text-sm ${
                  activeShotId === s.id ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-900'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Film size={13} /> {s.title}
                </span>
                <button
                  onClick={(e) => delShot(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={addChapter}
        className="flex items-center gap-1 w-full justify-center mt-2 py-2 text-sm text-neutral-400 border border-dashed border-neutral-700 rounded hover:text-white hover:border-neutral-500"
      >
        <Plus size={14} /> 添加章节
      </button>
    </div>
  );
}
