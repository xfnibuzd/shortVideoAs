import { db, now, uuid } from '../db.js';

export default async function projectRoutes(fastify) {
  // 项目列表(首期仅 mine)
  fastify.get('/projects', async () => {
    const rows = db
      .prepare(`SELECT * FROM projects ORDER BY created_at DESC`)
      .all();
    return rows.map((p) => {
      const c = db
        .prepare(`SELECT COUNT(*) AS c FROM chapters WHERE project_id=?`)
        .get(p.id);
      return { ...p, chapter_count: c.c };
    });
  });

  // 创建项目(仅 name)
  fastify.post('/projects', async (req, reply) => {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return reply.code(400).send({ code: 'INVALID', message: '项目名称不能为空' });
    }
    const id = uuid();
    const ts = now();
    db.prepare(
      `INSERT INTO projects (id, name, created_at, updated_at) VALUES (?,?,?,?)`
    ).run(id, String(name).trim(), ts, ts);
    return db.prepare(`SELECT * FROM projects WHERE id=?`).get(id);
  });

  // 重命名
  fastify.patch('/projects/:id', async (req, reply) => {
    const { name } = req.body || {};
    const p = db.prepare(`SELECT * FROM projects WHERE id=?`).get(req.params.id);
    if (!p) return reply.code(404).send({ code: 'NOT_FOUND', message: '项目不存在' });
    if (name) {
      db.prepare(`UPDATE projects SET name=?, updated_at=? WHERE id=?`).run(
        String(name).trim(),
        now(),
        req.params.id
      );
    }
    return db.prepare(`SELECT * FROM projects WHERE id=?`).get(req.params.id);
  });

  // 删除(级联)
  fastify.delete('/projects/:id', async (req) => {
    db.prepare(`DELETE FROM projects WHERE id=?`).run(req.params.id);
    return { ok: true };
  });
}
