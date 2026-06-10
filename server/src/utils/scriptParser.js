// 将 Word 剧本纯文本解析为 { chapters: [{ title, shots: [{ title, content }] }] }
// 规则:
//   第X集 / 第一集 → 新章节
//   X-Y场景 / X-Y 场景 开头 → 新分镜, 标题内部统一为 "分镜N"
//   其余行 → 追加到当前分镜内容

const CHAPTER_RE = /^第\s*(\d+|[零一二三四五六七八九十百千]+)\s*[集]/;
const SHOT_RE = /^\d+[-—–]\d+\s*场景/;

export function parseScript(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const chapters = [];
  let curChapter = null;
  let curShot = null;

  for (const line of lines) {
    if (!line) continue;

    if (CHAPTER_RE.test(line)) {
      curShot = null;
      curChapter = { title: line.replace(/[^\S\n]+/g, ''), shots: [] };
      chapters.push(curChapter);
      continue;
    }

    if (SHOT_RE.test(line)) {
      if (!curChapter) {
        curChapter = { title: '第1集', shots: [] };
        chapters.push(curChapter);
      }
      const idx = curChapter.shots.length + 1;
      curShot = { title: `分镜${idx}`, content: line + '\n' };
      curChapter.shots.push(curShot);
      continue;
    }

    // 普通内容行
    if (curShot) {
      curShot.content += line + '\n';
    } else if (curChapter) {
      // 章节开头、首个场景前的说明行: 归入一个默认分镜
      const idx = curChapter.shots.length + 1;
      curShot = { title: `分镜${idx}`, content: line + '\n' };
      curChapter.shots.push(curShot);
    }
  }

  // 清理多余尾部空行
  for (const ch of chapters) {
    for (const sh of ch.shots) {
      sh.content = sh.content.trimEnd();
    }
  }

  return chapters;
}
