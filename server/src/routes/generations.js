import { db } from '../db.js';
import { deleteFileSafe } from '../storage.js';
import {
  createGeneration,
  retryGeneration,
  getGeneration,
  getActiveGeneration,
  isBusy,
} from '../services/generation.js';

export default async function generationRoutes(fastify) {
  // 提交生成(串行: 占用中返回 409)
  fastify.post('/shots/:id/generations', async (req, reply) => {
    const { assetIds, templateId } = req.body || {};
    try {
      const g = createGeneration({
        shotId: req.params.id,
        templateId: templateId || null,
        assetIds: assetIds || [],
      });
      return getGeneration(g.id);
    } catch (e) {
      if (e.code === 'GENERATION_BUSY') {
        return reply.code(409).send({ code: 'GENERATION_BUSY', message: '有任务生成中' });
      }
      if (e.code === 'NOT_FOUND') {
        return reply.code(404).send({ code: 'NOT_FOUND', message: e.message });
      }
      throw e;
    }
  });

  // 该分镜历史
  fastify.get('/shots/:id/generations', async (req) => {
    const rows = db
      .prepare(`SELECT * FROM generations WHERE shot_id=? ORDER BY created_at DESC`)
      .all(req.params.id);
    return rows.map((g) => getGeneration(g.id));
  });

  // 全局是否有运行中任务(前端置灰按钮用)
  fastify.get('/generations/active', async () => {
    const active = getActiveGeneration();
    return { busy: isBusy(), active: active ? getGeneration(active.id) : null };
  });

  // 轮询单个生成
  fastify.get('/generations/:id', async (req, reply) => {
    const g = getGeneration(req.params.id);
    if (!g) return reply.code(404).send({ code: 'NOT_FOUND', message: '生成记录不存在' });
    return g;
  });

  // 失败重试
  fastify.post('/generations/:id/retry', async (req, reply) => {
    try {
      const g = retryGeneration(req.params.id);
      return getGeneration(g.id);
    } catch (e) {
      if (e.code === 'GENERATION_BUSY') {
        return reply.code(409).send({ code: 'GENERATION_BUSY', message: '有任务生成中' });
      }
      if (e.code === 'NOT_FOUND') {
        return reply.code(404).send({ code: 'NOT_FOUND', message: e.message });
      }
      throw e;
    }
  });

  // 删除整个 generation（含所有图片文件）
  fastify.delete('/generations/:id', async (req, reply) => {
    const imgs = db
      .prepare('SELECT image_path FROM generation_images WHERE generation_id=?')
      .all(req.params.id);
    imgs.forEach((r) => deleteFileSafe(r.image_path));
    db.prepare('DELETE FROM generations WHERE id=?').run(req.params.id);
    return { ok: true };
  });

  // 删除单张图片；若 generation 已无图片则一并删除 generation
  fastify.delete('/generation-images/:id', async (req, reply) => {
    const img = db
      .prepare('SELECT * FROM generation_images WHERE id=?')
      .get(req.params.id);
    if (!img) return reply.code(404).send({ code: 'NOT_FOUND', message: '图片不存在' });
    deleteFileSafe(img.image_path);
    db.prepare('DELETE FROM generation_images WHERE id=?').run(req.params.id);
    const remaining = db
      .prepare('SELECT COUNT(*) AS c FROM generation_images WHERE generation_id=?')
      .get(img.generation_id).c;
    if (remaining === 0) {
      db.prepare('DELETE FROM generations WHERE id=?').run(img.generation_id);
    }
    return { ok: true };
  });
}
