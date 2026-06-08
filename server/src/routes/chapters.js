import { db, now, uuid } from '../db.js';

export default async function chapterRoutes(fastify) {
  // 章节(含分镜)树
  fastify.get('/projects/:id/chapters', async (req) => {
    const chapters = db
      .prepare(`SELECT * FROM chapters WHERE project_id=? ORDER BY sort_order, rowid`)
      .all(req.params.id);
    return chapters.map((ch) => ({
      ...ch,
      shots: db
        .prepare(`SELECT id, chapter_id, title, sort_order, updated_at FROM shots WHERE chapter_id=? ORDER BY sort_order, rowid`)
        .all(ch.id),
    }));
  });

  // 新增章节
  fastify.post('/projects/:id/chapters', async (req, reply) => {
    const { title } = req.body || {};
    const p = db.prepare(`SELECT id FROM projects WHERE id=?`).get(req.params.id);
    if (!p) return reply.code(404).send({ code: 'NOT_FOUND', message: '项目不存在' });
    const order = db
      .prepare(`SELECT COUNT(*) AS c FROM chapters WHERE project_id=?`)
      .get(req.params.id).c;
    const id = uuid();
    db.prepare(
      `INSERT INTO chapters (id, project_id, title, sort_order) VALUES (?,?,?,?)`
    ).run(id, req.params.id, (title && String(title).trim()) || `第${order + 1}章`, order);
    return db.prepare(`SELECT * FROM chapters WHERE id=?`).get(id);
  });

  fastify.patch('/chapters/:id', async (req, reply) => {
    const { title } = req.body || {};
    const ch = db.prepare(`SELECT * FROM chapters WHERE id=?`).get(req.params.id);
    if (!ch) return reply.code(404).send({ code: 'NOT_FOUND', message: '章节不存在' });
    if (title) db.prepare(`UPDATE chapters SET title=? WHERE id=?`).run(String(title).trim(), req.params.id);
    return db.prepare(`SELECT * FROM chapters WHERE id=?`).get(req.params.id);
  });

  fastify.delete('/chapters/:id', async (req) => {
    db.prepare(`DELETE FROM chapters WHERE id=?`).run(req.params.id);
    return { ok: true };
  });
}
