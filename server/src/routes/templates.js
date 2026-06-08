import { db, now, uuid } from '../db.js';

export default async function templateRoutes(fastify) {
  fastify.get('/projects/:id/prompt-templates', async (req) => {
    return db
      .prepare(`SELECT * FROM prompt_templates WHERE project_id=? ORDER BY created_at DESC`)
      .all(req.params.id);
  });

  fastify.post('/projects/:id/prompt-templates', async (req, reply) => {
    const { name, content } = req.body || {};
    const p = db.prepare(`SELECT id FROM projects WHERE id=?`).get(req.params.id);
    if (!p) return reply.code(404).send({ code: 'NOT_FOUND', message: '项目不存在' });
    if (!name || !String(name).trim()) {
      return reply.code(400).send({ code: 'INVALID', message: '模版名称不能为空' });
    }
    const id = uuid();
    db.prepare(
      `INSERT INTO prompt_templates (id, project_id, name, content, created_at) VALUES (?,?,?,?,?)`
    ).run(id, req.params.id, String(name).trim(), content || '', now());
    return db.prepare(`SELECT * FROM prompt_templates WHERE id=?`).get(id);
  });

  fastify.patch('/prompt-templates/:id', async (req, reply) => {
    const t = db.prepare(`SELECT * FROM prompt_templates WHERE id=?`).get(req.params.id);
    if (!t) return reply.code(404).send({ code: 'NOT_FOUND', message: '模版不存在' });
    const { name, content } = req.body || {};
    db.prepare(`UPDATE prompt_templates SET name=COALESCE(?,name), content=COALESCE(?,content) WHERE id=?`)
      .run(name ?? null, content ?? null, req.params.id);
    return db.prepare(`SELECT * FROM prompt_templates WHERE id=?`).get(req.params.id);
  });

  fastify.delete('/prompt-templates/:id', async (req) => {
    db.prepare(`DELETE FROM prompt_templates WHERE id=?`).run(req.params.id);
    return { ok: true };
  });
}
