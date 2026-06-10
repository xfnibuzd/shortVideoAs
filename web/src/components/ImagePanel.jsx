import { useEffect, useRef, useState } from 'react';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { api, fileUrl } from '../api.js';
import GenerateDialog from './GenerateDialog.jsx';
import Lightbox from './Lightbox.jsx';

const STATUS_TEXT = {
  queued: '排队中',
  running: '生成中',
  success: '成功',
  failed: '失败',
};

export default function ImagePanel({ projectId, shotId }) {
  const [generations, setGenerations] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [preview, setPreview] = useState(null);
  const pollRef = useRef(null);

  const load = async () => {
    const list = await api.listGenerations(shotId);
    setGenerations(list);
    return list;
  };

  // 轮询: 只要存在未完成任务就持续刷新(切页返回也能恢复)
  const startPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const list = await load();
      const hasPending = list.some((g) => g.status === 'running' || g.status === 'queued');
      if (!hasPending) clearInterval(pollRef.current);
    }, 1500);
  };

  useEffect(() => {
    (async () => {
      const list = await load();
      if (list.some((g) => g.status === 'running' || g.status === 'queued')) startPolling();
    })();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotId]);

  const onGenerated = () => {
    setShowDialog(false);
    load();
    startPolling();
  };

  const retry = async (id) => {
    try {
      await api.retryGeneration(id);
      load();
      startPolling();
    } catch (e) {
      alert(e.code === 'GENERATION_BUSY' ? '有任务生成中，请稍候' : e.message);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-neutral-400">分镜图片</span>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-1 bg-brand text-black text-sm font-medium px-3 py-1.5 rounded"
        >
          <Plus size={14} /> 新增图片
        </button>
      </div>

      {generations.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 text-neutral-500">
          <p className="mb-4">还没有生成记录</p>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-1 bg-brand text-black text-sm font-medium px-3 py-1.5 rounded"
          >
            <Plus size={14} /> 新增图片
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {generations.map((g) => (
            <div key={g.id} className="rounded-lg border border-neutral-800 p-3">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="flex items-center gap-2">
                  {(g.status === 'running' || g.status === 'queued') && (
                    <Loader2 size={14} className="animate-spin text-brand" />
                  )}
                  <span
                    className={
                      g.status === 'failed'
                        ? 'text-red-400'
                        : g.status === 'success'
                        ? 'text-brand'
                        : 'text-neutral-300'
                    }
                  >
                    {STATUS_TEXT[g.status]}
                    {(g.status === 'running' || g.status === 'queued') && ` ${g.progress}%`}
                  </span>
                </span>
                {g.status === 'failed' && (
                  <button
                    onClick={() => retry(g.id)}
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white"
                  >
                    <RefreshCw size={12} /> 重试
                  </button>
                )}
              </div>
              {g.error && <p className="text-xs text-red-400 mb-2">{g.error}</p>}
              {g.images?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {g.images.map((img) => (
                    <img
                      key={img.id}
                      src={fileUrl(img.image_path)}
                      alt=""
                      onClick={() => setPreview(fileUrl(img.image_path))}
                      className="w-full aspect-square object-cover rounded bg-neutral-800 cursor-zoom-in hover:opacity-90"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Lightbox src={preview} onClose={() => setPreview(null)} />

      {showDialog && (
        <GenerateDialog
          projectId={projectId}
          shotId={shotId}
          onClose={() => setShowDialog(false)}
          onGenerated={onGenerated}
        />
      )}
    </div>
  );
}
