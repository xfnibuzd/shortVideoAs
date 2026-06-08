import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

export default function ScriptEditor({ shotId }) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const timer = useRef(null);
  const loaded = useRef(false);

  useEffect(() => {
    loaded.current = false;
    api.getShot(shotId).then((s) => {
      setContent(s.script_content || '');
      loaded.current = true;
    });
    return () => clearTimeout(timer.current);
  }, [shotId]);

  const onChange = (e) => {
    const val = e.target.value;
    setContent(val);
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await api.saveShot(shotId, { scriptContent: val });
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, 1000); // 防抖 1s 自动保存
  };

  const statusText = {
    idle: '',
    saving: '保存中…',
    saved: '已保存',
    error: '保存失败，稍后重试',
  }[status];

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 text-xs text-neutral-500">
        <span>剧本</span>
        <span className={status === 'error' ? 'text-red-400' : ''}>{statusText}</span>
      </div>
      <textarea
        value={content}
        onChange={onChange}
        placeholder="请输入本分镜剧本，输入后将自动保存…"
        className="flex-1 w-full resize-none bg-transparent outline-none text-sm leading-relaxed text-neutral-200"
      />
    </div>
  );
}
