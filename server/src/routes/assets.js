import { db, now, uuid } from '../db.js';
import { saveAssetImage, deleteFileSafe } from '../storage.js';
import { generateImages } from '../ai/provider.js';

export default async function assetRoutes(fastify) {
  // AI 生成资产图片(人物/背景/道具通用): 生成 -> 落盘 -> 创建资产
  fastify.post('/projects/:id/assets/ai', async (req, reply) => {
    const projectId = req.params.id;
    const p = db.prepare(`SELECT id FROM projects WHERE id=?`).get(projectId);
    if (!p) return reply.code(404).send({ code: 'NOT_FOUND', message: '项目不存在' });

    const { name, type = 'person', prompt, description } = req.body || {};
    if (!name || !String(name).trim()) {
      return reply.code(400).send({ code: 'INVALID', message: '资产名称不能为空' });
    }
    if (!['person', 'background', 'prop'].includes(type)) {
      return reply.code(400).send({ code: 'INVALID', message: '资产类型非法' });
    }
    if (!prompt || !String(prompt).trim()) {
      return reply.code(400).send({ code: 'INVALID', message: '提示词不能为空' });
    }

    let images;
    try {
      images = await generateImages(String(prompt).trim());
    } catch (e) {
      return reply.code(502).send({ code: 'AI_FAILED', message: String(e.message || e) });
    }
    if (!images?.length) {
      return reply.code(502).send({ code: 'AI_FAILED', message: 'AI 未返回图片' });
    }

    const id = uuid();
    const imagePath = saveAssetImage(projectId, id, 'png', images[0].buffer);
    db.prepare(
      `INSERT INTO assets (id, project_id, type, name, image_path, description, created_at)
       VALUES (?,?,?,?,?,?,?)`
    ).run(id, projectId, type, String(name).trim(), imagePath, description || '', now());
    return db.prepare(`SELECT * FROM assets WHERE id=?`).get(id);
  });
  // 列表(可按 type 过滤)
  fastify.get('/projects/:id/assets', async (req) => {
    const { type } = req.query || {};
    if (type) {
      return db
        .prepare(`SELECT * FROM assets WHERE project_id=? AND type=? ORDER BY created_at`)
        .all(req.params.id, type);
    }
    return db.prepare(`SELECT * FROM assets WHERE project_id=? ORDER BY created_at`).all(req.params.id);
  });

  // 新增资产(multipart: name,type,description,image?)
  fastify.post('/projects/:id/assets', async (req, reply) => {
    const projectId = req.params.id;
    const p = db.prepare(`SELECT id FROM projects WHERE id=?`).get(projectId);
    if (!p) return reply.code(404).send({ code: 'NOT_FOUND', message: '项目不存在' });

    const fields = {};
    let imageBuffer = null;
    let imageExt = 'png';

    for await (const part of req.parts()) {
      if (part.type === 'file') {
        imageBuffer = await part.toBuffer();
        const m = (part.filename || '').match(/\.([a-z0-9]+)$/i);
        if (m) imageExt = m[1];
      } else {
        fields[part.fieldname] = part.value;
      }
    }

    if (!fields.name || !String(fields.name).trim()) {
      return reply.code(400).send({ code: 'INVALID', message: '资产名称不能为空' });
    }
    const type = fields.type || 'person';
    if (!['person', 'background', 'prop'].includes(type)) {
      return reply.code(400).send({ code: 'INVALID', message: '资产类型非法' });
    }

    const id = uuid();
    let imagePath = null;
    if (imageBuffer) imagePath = saveAssetImage(projectId, id, imageExt, imageBuffer);

    db.prepare(
      `INSERT INTO assets (id, project_id, type, name, image_path, description, created_at)
       VALUES (?,?,?,?,?,?,?)`
    ).run(id, projectId, type, String(fields.name).trim(), imagePath, fields.description || '', now());

    return db.prepare(`SELECT * FROM assets WHERE id=?`).get(id);
  });

  fastify.patch('/assets/:id', async (req, reply) => {
    const a = db.prepare(`SELECT * FROM assets WHERE id=?`).get(req.params.id);
    if (!a) return reply.code(404).send({ code: 'NOT_FOUND', message: '资产不存在' });
    const { name, description } = req.body || {};
    db.prepare(`UPDATE assets SET name=COALESCE(?,name), description=COALESCE(?,description) WHERE id=?`)
      .run(name ?? null, description ?? null, req.params.id);
    return db.prepare(`SELECT * FROM assets WHERE id=?`).get(req.params.id);
  });

  fastify.delete('/assets/:id', async (req) => {
    const a = db.prepare(`SELECT * FROM assets WHERE id=?`).get(req.params.id);
    if (a) {
      deleteFileSafe(a.image_path);
      db.prepare(`DELETE FROM assets WHERE id=?`).run(req.params.id);
    }
    return { ok: true };
  });
}
