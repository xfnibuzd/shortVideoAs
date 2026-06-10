import fs from 'node:fs';
import { db, now, uuid } from '../db.js';
import { saveGenerationImage, absPath } from '../storage.js';
import { generateImages } from '../ai/provider.js';

// §6.1 全局串行单任务锁(内存标志, 配合 DB 状态)
let RUNNING = false;

export function isBusy() {
  if (RUNNING) return true;
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM generations WHERE status IN ('running','queued')`)
    .get();
  return row.c > 0;
}

export function getActiveGeneration() {
  return db
    .prepare(
      `SELECT * FROM generations WHERE status IN ('running','queued')
       ORDER BY created_at DESC LIMIT 1`
    )
    .get();
}

// 组装提示词: 剧本 + 资产名称 + 模版内容 + 参考图一致性要求
function buildPrompt({ scriptContent, assets, template }) {
  const lines = [];
  if (template?.content) lines.push(template.content.trim());
  if (scriptContent?.trim()) lines.push(`剧本内容:\n${scriptContent.trim()}`);

  const persons = assets.filter((a) => a.type === 'person');
  const props = assets.filter((a) => a.type === 'prop');
  const backgrounds = assets.filter((a) => a.type === 'background');

  if (persons.length) lines.push(`人物: ${persons.map((a) => a.name).join('、')}`);
  if (backgrounds.length) lines.push(`背景: ${backgrounds.map((a) => a.name).join('、')}`);
  if (props.length) lines.push(`道具: ${props.map((a) => a.name).join('、')}`);

  // 针对携带参考图的资产，追加严格一致性要求
  const withImg = { persons: persons.filter((a) => a.image_path), props: props.filter((a) => a.image_path), backgrounds: backgrounds.filter((a) => a.image_path) };
  const consistency = [];
  if (withImg.persons.length) {
    consistency.push(`参考图中角色（${withImg.persons.map((a) => a.name).join('、')}）的面貌、发型、服装、配饰需严格保持一致，不得随意更改`);
  }
  if (withImg.backgrounds.length) {
    consistency.push(`参考图中的背景场景（${withImg.backgrounds.map((a) => a.name).join('、')}）的环境、光线、风格需严格保持一致`);
  }
  if (withImg.props.length) {
    consistency.push(`参考图中的道具（${withImg.props.map((a) => a.name).join('、')}）的外观、颜色、细节需严格保持一致`);
  }
  if (consistency.length) {
    lines.push(`【参考图一致性要求】\n${consistency.join('；\n')}`);
  }

  return lines.join('\n\n');
}

// 创建生成任务。若已有任务进行中, 抛出 BUSY 错误(由路由转 409)
export function createGeneration({ shotId, templateId, assetIds }) {
  if (isBusy()) {
    const err = new Error('有任务生成中');
    err.code = 'GENERATION_BUSY';
    throw err;
  }

  const shot = db.prepare(`SELECT * FROM shots WHERE id=?`).get(shotId);
  if (!shot) {
    const err = new Error('分镜不存在');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const template = templateId
    ? db.prepare(`SELECT * FROM prompt_templates WHERE id=?`).get(templateId)
    : null;

  const ids = Array.isArray(assetIds) ? assetIds : [];
  const assets = ids.length
    ? db
        .prepare(
          `SELECT * FROM assets WHERE id IN (${ids.map(() => '?').join(',')})`
        )
        .all(...ids)
    : [];

  const prompt = buildPrompt({ scriptContent: shot.script_content, assets, template });

  // 将有图片的资产转为 base64 dataURL 作为参考图
  const refImages = assets
    .filter((a) => a.image_path)
    .map((a) => {
      const buf = fs.readFileSync(absPath(a.image_path));
      return `data:image/png;base64,${buf.toString('base64')}`;
    });

  // 取得 project_id 用于落盘路径
  const chapter = db.prepare(`SELECT * FROM chapters WHERE id=?`).get(shot.chapter_id);
  const projectId = chapter?.project_id || 'unknown';

  const id = uuid();
  const ts = now();
  db.prepare(
    `INSERT INTO generations (id, shot_id, template_id, asset_ids, prompt, status, progress, created_at, updated_at)
     VALUES (?,?,?,?,?, 'running', 5, ?, ?)`
  ).run(id, shotId, templateId || null, JSON.stringify(ids), prompt, ts, ts);

  RUNNING = true;
  // 异步执行, 不阻塞响应
  runGeneration(id, { projectId, shotId, prompt, refImages }).catch((e) => {
    console.error('[generation] unexpected error', e);
  });

  return db.prepare(`SELECT * FROM generations WHERE id=?`).get(id);
}

async function runGeneration(generationId, { projectId, shotId, prompt, refImages = [] }) {
  const setProgress = (p) =>
    db.prepare(`UPDATE generations SET progress=?, updated_at=? WHERE id=?`).run(p, now(), generationId);
  try {
    setProgress(20);
    const images = await generateImages(prompt, { refImages });
    setProgress(70);

    const insertImg = db.prepare(
      `INSERT INTO generation_images (id, generation_id, image_path, sort_order) VALUES (?,?,?,?)`
    );
    images.forEach((img, index) => {
      const rel = saveGenerationImage(projectId, shotId, generationId, index, img.buffer);
      insertImg.run(uuid(), generationId, rel, index);
    });

    db.prepare(
      `UPDATE generations SET status='success', progress=100, updated_at=? WHERE id=?`
    ).run(now(), generationId);
  } catch (e) {
    db.prepare(
      `UPDATE generations SET status='failed', error=?, updated_at=? WHERE id=?`
    ).run(String(e.message || e), now(), generationId);
  } finally {
    RUNNING = false;
  }
}

// 失败重试: 仅当当前无运行任务时允许, 复用原参数新建任务
export function retryGeneration(generationId) {
  const g = db.prepare(`SELECT * FROM generations WHERE id=?`).get(generationId);
  if (!g) {
    const err = new Error('生成记录不存在');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return createGeneration({
    shotId: g.shot_id,
    templateId: g.template_id,
    assetIds: JSON.parse(g.asset_ids || '[]'),
  });
}

// 查询生成详情(含图片)
export function getGeneration(generationId) {
  const g = db.prepare(`SELECT * FROM generations WHERE id=?`).get(generationId);
  if (!g) return null;
  const images = db
    .prepare(`SELECT * FROM generation_images WHERE generation_id=? ORDER BY sort_order`)
    .all(generationId);
  return { ...g, asset_ids: JSON.parse(g.asset_ids || '[]'), images };
}
