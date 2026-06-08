import { db, now, uuid } from '../db.js';

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
}
