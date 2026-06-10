import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, FileText, Images, BookText } from 'lucide-react';
import { api } from '../api.js';
import ChapterTree from '../components/ChapterTree.jsx';
import ScriptEditor from '../components/ScriptEditor.jsx';
import ImagePanel from '../components/ImagePanel.jsx';
import AssetPanel from '../components/AssetPanel.jsx';
import TemplateDialog from '../components/TemplateDialog.jsx';

export default function Workbench() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeShotId, setActiveShotId] = useState(null);
  const [tab, setTab] = useState('script'); // script | images
  const [showTemplates, setShowTemplates] = useState(false);

  const loadChapters = async () => {
    const data = await api.getChapters(projectId);
    setChapters(data);
    // 默认选中第一个分镜
    if (!activeShotId) {
      const firstShot = data.find((c) => c.shots.length)?.shots[0];
      if (firstShot) setActiveShotId(firstShot.id);
    }
    return data;
  };

  useEffect(() => {
    (async () => {
      const list = await api.listProjects();
      setProject(list.find((p) => p.id === projectId) || { name: '项目' });
      await loadChapters();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const activeShot =
    chapters.flatMap((c) => c.shots).find((s) => s.id === activeShotId) || null;

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-neutral-800 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm text-neutral-300 hover:text-white"
        >
          <ChevronLeft size={16} /> 返回
        </button>
        <span className="font-medium">{project?.name}</span>
        <div className="flex items-center gap-2">
        <div className="flex bg-neutral-900 rounded-md p-0.5 text-sm">
          <button
            onClick={() => setTab('script')}
            className={`flex items-center gap-1 px-3 py-1 rounded ${
              tab === 'script' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
            }`}
          >
            <FileText size={14} /> 剧本
          </button>
          <button
            onClick={() => setTab('images')}
            className={`flex items-center gap-1 px-3 py-1 rounded ${
              tab === 'images' ? 'bg-neutral-700 text-white' : 'text-neutral-400'
            }`}
          >
            <Images size={14} /> 分镜图片
          </button>
        </div>
        <button
          onClick={() => setShowTemplates(true)}
          className="flex items-center gap-1 px-3 py-1 text-sm text-neutral-300 hover:text-white border border-neutral-700 rounded-md"
        >
          <BookText size={14} /> 提示词模版
        </button>
        </div>
      </header>

      {showTemplates && (
        <TemplateDialog projectId={projectId} onClose={() => setShowTemplates(false)} />
      )}

      <div className="flex flex-1 min-h-0">
        {/* 左栏 */}
        <aside className="w-60 border-r border-neutral-800 overflow-y-auto shrink-0">
          <ChapterTree
            projectId={projectId}
            chapters={chapters}
            activeShotId={activeShotId}
            onSelectShot={setActiveShotId}
            onChanged={loadChapters}
          />
        </aside>

        {/* 中栏 */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {!activeShot ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500">
              <p>请选择或创建一个分镜</p>
            </div>
          ) : tab === 'script' ? (
            <ScriptEditor key={activeShot.id} shotId={activeShot.id} />
          ) : (
            <ImagePanel
              key={activeShot.id}
              projectId={projectId}
              shotId={activeShot.id}
            />
          )}
        </main>

        {/* 右栏 */}
        <aside className="w-72 border-l border-neutral-800 overflow-y-auto shrink-0">
          <AssetPanel projectId={projectId} />
        </aside>
      </div>
    </div>
  );
}
