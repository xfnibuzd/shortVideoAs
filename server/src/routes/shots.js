import { db, now, uuid } from '../db.js';
import { saveGenerationImage } from '../storage.js';

export default async function shotRoutes(fastify) {
  fastify.post('/chapters/:id/shots', async (req, reply) => {
    const { title } = req.body || {};
    const ch = db.prepare(`SELECT id FROM chapters WHERE id=?`).get(req.params.id);
    if (!ch) return reply.code(404).send({ code: 'NOT_FOUND', message: '章节不存在' });
    const order = db.prepare(`SELECT COUNT(*) AS c FROM shots WHERE chapter_id=?`).get(req.params.id).c;
    const id = uuid();
    db.prepare(
      `INSERT INTO shots (id, chapter_id, title, sort_order, script_content, updated_at)
       VALUES (?,?,?,?,'',?)`
    ).run(id, req.params.id, (title && String(title).trim()) || `分镜${order + 1}`, order, now());
    return db.prepare(`SELECT * FROM shots WHERE id=?`).get(id);
  });

  fastify.get('/shots/:id', async (req, reply) => {
    const s = db.prepare(`SELECT * FROM shots WHERE id=?`).get(req.params.id);
    if (!s) return reply.code(404).send({ code: 'NOT_FOUND', message: '分镜不存在' });
    return s;
  });

  // 自动保存剧本
  fastify.put('/shots/:id', async (req, reply) => {
    const { scriptContent, title } = req.body || {};
    const s = db.prepare(`SELECT * FROM shots WHERE id=?`).get(req.params.id);
    if (!s) return reply.code(404).send({ code: 'NOT_FOUND', message: '分镜不存在' });
    db.prepare(`UPDATE shots SET script_content=?, title=COALESCE(?,title), updated_at=? WHERE id=?`)
      .run(scriptContent ?? s.script_content, title ?? null, now(), req.params.id);
    return db.prepare(`SELECT * FROM shots WHERE id=?`).get(req.params.id);
  });

  fastify.delete('/shots/:id', async (req) => {
    db.prepare(`DELETE FROM shots WHERE id=?`).run(req.params.id);
    return { ok: true };
  });

  // 直接上传图片到分镜图片列表 (九宫格切割保存等手动操作)
  // body: { label?: string, images: string[] }  (base64 dataURL)
  fastify.post('/shots/:id/upload-images', async (req, reply) => {
    const { label, images } = req.body || {};
    const shot = db.prepare(
      `SELECT s.id, s.chapter_id, c.project_id
       FROM shots s JOIN chapters c ON c.id = s.chapter_id
       WHERE s.id=?`
    ).get(req.params.id);
    if (!shot) return reply.code(404).send({ code: 'NOT_FOUND', message: '分镜不存在' });
    if (!Array.isArray(images) || !images.length)
      return reply.code(400).send({ code: 'INVALID', message: '未提供图片' });

    const genId = uuid();
    const t = now();
    db.prepare(
      `INSERT INTO generations
         (id, shot_id, template_id, asset_ids, prompt, status, progress, error, created_at, updated_at)
       VALUES (?,?,NULL,'[]',?,'success',100,NULL,?,?)`
    ).run(genId, req.params.id, label || '手动导入', t, t);

    const savedImages = [];
    images.forEach((dataUrl, i) => {
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      const imgPath = saveGenerationImage(shot.project_id, shot.id, genId, i, buf);
      const imgId = uuid();
      db.prepare(
        `INSERT INTO generation_images (id, generation_id, image_path, sort_order) VALUES (?,?,?,?)`
      ).run(imgId, genId, imgPath, i);
      savedImages.push({ id: imgId, image_path: imgPath });
    });

    return { id: genId, status: 'success', prompt: label || '手动导入', images: savedImages };
  });
}
