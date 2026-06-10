import mammoth from 'mammoth';
import { db, now, uuid } from '../db.js';
import { parseScript } from '../utils/scriptParser.js';

export default async function importScriptRoutes(fastify) {
  // POST /projects/:id/import-script  (multipart, field: file .docx)
  // 覆盖模式: 先删除该项目所有章节(级联删分镜), 再按解析结果重建。
  fastify.post('/projects/:id/import-script', async (req, reply) => {
    const projectId = req.params.id;
    const project = db.prepare('SELECT id FROM projects WHERE id=?').get(projectId);
    if (!project) return reply.code(404).send({ code: 'NOT_FOUND', message: '项目不存在' });

    // 读取上传的文件
    const data = await req.file();
    if (!data) return reply.code(400).send({ code: 'INVALID', message: '未收到文件' });

    const buf = await data.toBuffer();

    // 提取纯文本
    let text;
    try {
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    } catch (e) {
      return reply.code(422).send({ code: 'PARSE_FAILED', message: `文件解析失败: ${e.message}` });
    }

    const chapters = parseScript(text);
    if (!chapters.length) {
      return reply.code(422).send({ code: 'EMPTY', message: '未解析到任何章节，请确认文件格式' });
    }

    // 事务: 覆盖写入
    const run = db.transaction(() => {
      // 1. 删除旧章节(shots 外键级联删除)
      const oldChapters = db
        .prepare('SELECT id FROM chapters WHERE project_id=?')
        .all(projectId);
      for (const ch of oldChapters) {
        db.prepare('DELETE FROM shots WHERE chapter_id=?').run(ch.id);
      }
      db.prepare('DELETE FROM chapters WHERE project_id=?').run(projectId);

      // 2. 插入新章节 + 分镜
      let totalShots = 0;
      for (let ci = 0; ci < chapters.length; ci++) {
        const ch = chapters[ci];
        const chId = uuid();
        db.prepare(
          'INSERT INTO chapters (id, project_id, title, sort_order) VALUES (?,?,?,?)'
        ).run(chId, projectId, ch.title, ci);

        for (let si = 0; si < ch.shots.length; si++) {
          const sh = ch.shots[si];
          const shId = uuid();
          db.prepare(
            `INSERT INTO shots (id, chapter_id, title, sort_order, script_content, updated_at)
             VALUES (?,?,?,?,?,?)`
          ).run(shId, chId, sh.title, si, sh.content, now());
          totalShots++;
        }
      }

      // 3. 更新项目 updated_at
      db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(now(), projectId);

      return { chapters: chapters.length, shots: totalShots };
    });

    const summary = run();
    return { ok: true, ...summary };
  });
}
