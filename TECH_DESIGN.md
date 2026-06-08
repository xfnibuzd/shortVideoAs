# AI 短剧创作工作台 — 技术方案（简版）

- **版本**：v1.0
- **配套文档**：`PRD.md`
- **运行形态**：**本地 Web 应用**（浏览器访问，本机起 Node 后端 + SQLite + 本地文件夹存图片，单机单用户）

---

## 1. 技术选型

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | React + Vite + TypeScript | 工作台三栏布局，SPA |
| UI | TailwindCSS + shadcn/ui + lucide-react | 现代深色 UI（贴合草图） |
| 状态管理 | Zustand + TanStack Query | 本地 UI 状态 + 服务端数据缓存/轮询 |
| 后端 | Node.js + Fastify (TypeScript) | 轻量、性能好，提供 REST API + 静态图片服务 |
| 数据库 | **SQLite**（`better-sqlite3`） | 本地单文件数据库，零部署 |
| ORM | Drizzle ORM | 类型安全、迁移简单（也可用 Prisma） |
| 图片存储 | **本地文件系统** | 见第 4 节，DB 仅存路径引用 |
| AI 生图 | **Google Gemini 图片生成（`@google/genai`）** | 调用谷歌生图模型，返回图片二进制落盘本地 |
| 任务/进度 | 后端任务表 + **串行全局锁** + 前端**轮询** | 同时仅一个生成任务，状态持久化，切页不丢失 |

> 选型原则：**简单、可本地零依赖运行**。`better-sqlite3` 同步 API 简单可靠；图片走文件系统而非存进 DB，避免数据库膨胀。

---

## 2. 总体架构

```
┌─────────────────────────────────────────────┐
│ Browser (React SPA :5173)                    │
│  项目列表 / 工作台(章节·分镜·资产) / 生成弹窗  │
└───────────────┬─────────────────────────────┘
                │ HTTP (REST) + 轮询/SSE
┌───────────────▼─────────────────────────────┐
│ Local Node Server (Fastify :3000)            │
│  ├─ REST API (projects/chapters/shots/...)   │
│  ├─ 静态图片服务  /files/*                    │
│  ├─ 生成任务调度器 (异步 + 状态落库)           │
│  └─ AI Provider 适配层 (可换不同图片生成API)  │
└───────┬───────────────────────┬──────────────┘
        │                       │
┌───────▼────────┐     ┌────────▼─────────────┐
│ SQLite          │     │ 本地文件系统          │
│ app.db (元数据) │     │ ./data/storage/images │
└─────────────────┘     └──────────────────────┘
                                │
                        ┌──────────▼─────────┐
                        │ Google Gemini 生图API │
                        └────────────────────┘
```

数据目录统一放在项目根的 `./data/`：
```
data/
├─ app.db                 # SQLite 数据库文件
└─ storage/
   ├─ images/             # 生成的分镜图片
   │  └─ {projectId}/{shotId}/{generationId}/{index}.png
   └─ assets/             # 资产图片(人物/背景/道具)
      └─ {projectId}/{assetId}.png
```

---

## 3. 本地数据库设计（SQLite）

> 字段与 `PRD.md` 第 4 节数据模型对齐。时间统一存 ISO 字符串或 epoch 毫秒。

```sql
-- 项目
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,            -- uuid
  name        TEXT NOT NULL,
  cover_path  TEXT,                        -- 本地相对路径，可空
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- 章节
CREATE TABLE chapters (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- 分镜
CREATE TABLE shots (
  id             TEXT PRIMARY KEY,
  chapter_id     TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  script_content TEXT NOT NULL DEFAULT '',   -- 剧本（自动保存）
  updated_at     INTEGER NOT NULL
);

-- 资产（项目内复用，不跨项目）
CREATE TABLE assets (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('person','background','prop')),
  name        TEXT NOT NULL,
  image_path  TEXT,                          -- 本地相对路径
  description TEXT DEFAULT '',
  created_at  INTEGER NOT NULL
);

-- 提示词模版（项目级）
CREATE TABLE prompt_templates (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

-- 生成任务（状态持久化，切页可恢复）
CREATE TABLE generations (
  id           TEXT PRIMARY KEY,
  shot_id      TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  template_id  TEXT REFERENCES prompt_templates(id),
  asset_ids    TEXT NOT NULL DEFAULT '[]',   -- JSON 数组(人物/道具/背景)
  prompt       TEXT NOT NULL,                -- 组装后的最终提示词
  status       TEXT NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued','running','success','failed')),
  progress     INTEGER NOT NULL DEFAULT 0,   -- 0-100
  error        TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

-- 生成产物图片（数量由提示词控制，故一对多）
CREATE TABLE generation_images (
  id             TEXT PRIMARY KEY,
  generation_id  TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  image_path     TEXT NOT NULL,              -- 本地相对路径
  sort_order     INTEGER NOT NULL DEFAULT 0
);

-- 常用索引
CREATE INDEX idx_chapters_project ON chapters(project_id);
CREATE INDEX idx_shots_chapter    ON shots(chapter_id);
CREATE INDEX idx_assets_project   ON assets(project_id);
CREATE INDEX idx_templates_project ON prompt_templates(project_id);
CREATE INDEX idx_generations_shot ON generations(shot_id);
CREATE INDEX idx_genimages_gen    ON generation_images(generation_id);
```

要点：
- **级联删除**：删项目自动清理其章节/分镜/资产/模版/生成记录（图片文件由后端钩子一并删除，见 §4.4）。
- `cover_path` / `image_path` 一律存**相对路径**（相对 `data/storage`），便于整体迁移、备份。
- `章节数` 通过 `COUNT(chapters)` 实时算，不冗余存储。

---

## 4. 图片资源处理方案（本地）

### 4.1 存储位置与命名
- 统一根目录：`data/storage/`，DB 只存相对路径，绝对路径 = `STORAGE_ROOT + image_path`。
- 命名规则（避免冲突、便于定位）：
  - 生成图：`images/{projectId}/{shotId}/{generationId}/{index}.png`
  - 资产图：`assets/{projectId}/{assetId}.{ext}`
- 文件名用 uuid/index，**不使用用户输入命名**，避免路径穿越与非法字符。

### 4.2 图片落盘流程（AI 生成）
```
1. 提交生成 → 写 generations(status=queued) → 返回 generationId
2. 调度器获取全局锁（若已有 running 任务则拒绝提交，见 §6） → status=running，调用 Google Gemini 生图
3. Gemini 返回图片二进制(inlineData/base64)：
   - 后端解码 → 写入 data/storage/images/.../{index}.png
   - 每张写一条 generation_images(image_path 相对路径)
4. 全部完成 → status=success, progress=100 → 释放全局锁
5. 失败 → status=failed + error，释放锁；已落盘的部分图保留或清理(策略可配)
```
> **图片格式与尺寸在提示词中约束**（如在 prompt 中指定尺寸/比例/风格），后端不额外做尺寸参数化处理；落盘统一按 png 存储。
>
> 关键：**图片由后端落地到本地磁盘**，前端只拿相对路径，再通过静态服务读取，符合"图片保存本地"。

### 4.3 图片读取（前端展示）
- 后端暴露静态服务：`GET /files/{相对路径}` → 读 `data/storage/` 下文件返回。
  - 例：`image_path = images/p1/s1/g1/0.png` → `<img src="/files/images/p1/s1/g1/0.png">`
- 上传资产图：`POST /projects/{id}/assets`（multipart）→ 存盘 → 记录 `image_path`。

### 4.4 删除与清理
- 删除分镜/项目/资产/生成记录时，后端在事务提交后删除对应磁盘文件（best-effort，失败记日志不阻断）。
- 提供可选维护命令：扫描"DB 无引用"的孤儿文件并清理。

### 4.5 其它
- 大图可选生成缩略图（`{name}.thumb.webp`）用于列表/网格，按需迭代。
- 备份 = 拷贝整个 `data/` 目录即可（DB + 图片一起）。

---

## 5. 后端 API（在 PRD 基础上补充）

REST，JSON。错误统一 `{ code, message }`。关键端点：

```
# 项目 / 章节 / 分镜
GET    /projects?type=mine
POST   /projects                      { name }
PATCH  /projects/:id                  { name }
DELETE /projects/:id
GET    /projects/:id/chapters
POST   /projects/:id/chapters         { title }
POST   /chapters/:id/shots            { title }
PUT    /shots/:id                     { scriptContent }   # 自动保存(防抖)

# 资产（项目内, 支持图片上传 multipart）
GET    /projects/:id/assets?type=person|background|prop
POST   /projects/:id/assets           (multipart: name,type,description,image?)
PATCH  /assets/:id
DELETE /assets/:id

# 提示词模版（项目级）
GET    /projects/:id/prompt-templates
POST   /projects/:id/prompt-templates { name, content }
PATCH  /prompt-templates/:id
DELETE /prompt-templates/:id

# 分镜图片生成
POST   /shots/:id/generations         { assetIds[], templateId }
GET    /shots/:id/generations         # 该分镜历史
GET    /generations/:id               # 轮询状态/进度/结果图
POST   /generations/:id/retry         # 失败重试

# 静态图片
GET    /files/*                       # 读取本地图片
```

---

## 6. AI 生成异步任务与状态恢复

### 6.1 串行单任务（全局锁）
- **同时仅允许一个生成任务**：后端维护一个全局运行标志（内存 + DB 双保险）。
- 提交生成时：若已存在 `running`（或 `queued`）任务，**直接拒绝新提交**，返回 `409 Conflict`（如 `{ code: 'GENERATION_BUSY' }`）；前端据此置灰生成按钮并提示“有任务生成中”。
- 启动恢复：服务重启时，将遗留的 `running` 任务重置为 `failed`（或重新排队），避免锁死。

### 6.2 状态持久化与轮询
- **状态持久化**：进度、状态、结果均写 SQLite，**不依赖前端在线**。
- **轮询**：前端轮询 `GET /generations/:id`（建议 1.5s 间隔）获取 status/progress；结束（success/failed）后停止轮询。
- **切页恢复**：进入分镜「分镜图片」Tab 时拉取该分镜下未完成任务并继续轮询，保证用户切走再回来进度准确。

### 6.3 Google Gemini Provider
- **Provider 适配层**：`AIImageProvider` 接口（`generate(prompt, refs) → images[]`），首期实现 `GeminiImageProvider`（`@google/genai`，调用谷歌生图模型）。
- 返回的图片为 `inlineData`(base64)，后端解码后落盘 png。
- **图片格式/尺寸在 prompt 中约束**，后端不额外传尺寸参数。
- 密钥从环境变量读取，**不硬编码**（`.env`：`GOOGLE_API_KEY` / `GEMINI_API_KEY`，通过 `process.env`）。

---

## 7. 工程目录结构

```
shortVideoAs/
├─ PRD.md
├─ TECH_DESIGN.md
├─ data/                       # 运行时生成(加入 .gitignore)
│  ├─ app.db
│  └─ storage/{images,assets}/
├─ server/                     # Node + Fastify 后端
│  ├─ src/
│  │  ├─ index.ts              # 启动、注册路由、静态服务
│  │  ├─ db/{schema.ts,migrate.ts,client.ts}
│  │  ├─ routes/{projects,chapters,shots,assets,templates,generations}.ts
│  │  ├─ services/{generation.ts,storage.ts}
│  │  └─ ai/{provider.ts}
│  └─ package.json
└─ web/                        # React + Vite 前端
   ├─ src/
   │  ├─ pages/{ProjectList,Workbench}.tsx
   │  ├─ components/{ChapterTree,ScriptEditor,ImagePanel,AssetPanel,GenerateDialog}.tsx
   │  ├─ store/  (zustand)
   │  └─ api/    (TanStack Query 封装)
   └─ package.json
```

---

## 8. 落地步骤（建议顺序）

1. 初始化 `server`（Fastify + better-sqlite3 + Drizzle），建表迁移，跑通 `/projects` CRUD + `/files/*` 静态服务。
2. 初始化 `web`（Vite + React + Tailwind + shadcn），完成项目列表 + 创建项目。
3. 工作台三栏：章节/分镜树、剧本编辑器(自动保存)、资产面板(含图片上传落盘)。
4. 接入 AI Provider，打通「提交生成 → 落盘图片 → 轮询进度 → 展示」闭环。
5. 提示词模版(项目级) + 删除清理 + 边界/空态完善。

---

## 9. 技术确认结论（已拍板）

| # | 问题 | 结论 |
| --- | --- | --- |
| 1 | AI 生图服务 | **Google Gemini**（`@google/genai`），返回 base64 图片落盘本地；密钥走 `.env` |
| 2 | 并发策略 | **串行，全局单任务**；有任务生成中时其他提交返回 409 拒绝 |
| 3 | 进度推送 | **轮询**（`GET /generations/:id`，~1.5s） |
| 4 | 图片格式/尺寸 | **在提示词中约束**，后端不参数化；落盘统一 png |

> 补充：生成接口需返回当前是否占用的状态供前端置灰按钮；可选提供 `GET /generations/active` 查询全局是否有运行中任务。
