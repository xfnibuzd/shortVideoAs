import Database from 'better-sqlite3';
import { DB_PATH, ensureDirs } from './paths.js';

ensureDirs();

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  cover_path  TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS shots (
  id             TEXT PRIMARY KEY,
  chapter_id     TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  script_content TEXT NOT NULL DEFAULT '',
  updated_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('person','background','prop')),
  name        TEXT NOT NULL,
  image_path  TEXT,
  description TEXT DEFAULT '',
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS generations (
  id           TEXT PRIMARY KEY,
  shot_id      TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  template_id  TEXT REFERENCES prompt_templates(id),
  asset_ids    TEXT NOT NULL DEFAULT '[]',
  prompt       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued','running','success','failed')),
  progress     INTEGER NOT NULL DEFAULT 0,
  error        TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_images (
  id             TEXT PRIMARY KEY,
  generation_id  TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  image_path     TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_shots_chapter    ON shots(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assets_project   ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_templates_project ON prompt_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_generations_shot ON generations(shot_id);
CREATE INDEX IF NOT EXISTS idx_genimages_gen    ON generation_images(generation_id);
`);

// 启动恢复：将遗留的 running 任务重置为 failed，避免锁死（§6.1）
db.prepare(
  `UPDATE generations SET status='failed', error='server restarted', updated_at=?
   WHERE status IN ('running','queued')`
).run(Date.now());

export const now = () => Date.now();
export const uuid = () => crypto.randomUUID();
