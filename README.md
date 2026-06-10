# AI 短剧创作工作台

本地 Web 应用：浏览器访问，本机起 Node 后端 + SQLite + 本地文件夹存图片（单机单用户）。

- 需求文档：`PRD.md`
- 技术方案：`TECH_DESIGN.md`

## 目录结构

```
shortVideoAs/
├─ server/        # Fastify + better-sqlite3 后端
├─ web/           # Vite + React + Tailwind 前端
└─ data/          # 运行时生成：app.db + storage/{images,assets}（已 gitignore）
```

## 启动

### 1. 后端（端口 3000）
```bash
cd server
npm install
cp .env.example .env   # 填入 Google Gemini API Key
npm start              # 或 npm run dev (watch)
```

`.env` 关键项：
- `AI_PROVIDER`：生图服务商，`gemini`（默认）或 `doubao`
- Gemini：`GOOGLE_API_KEY` / `GEMINI_API_KEY` + `GEMINI_IMAGE_MODEL`
- 豆包(火山方舟)：`ARK_API_KEY` + `DOUBAO_IMAGE_MODEL`（可选 `ARK_BASE_URL`、`DOUBAO_IMAGE_SIZE`）
- `HTTPS_PROXY`：仅 Gemini 需要时填写（被墙环境）；`AI_PROVIDER=doubao` 时自动忽略
- 未配置 Key 或生成失败时直接报错，不回退占位图

切换豆包示例：在 `.env` 设 `AI_PROVIDER=doubao` 与 `ARK_API_KEY=xxx`，然后 `./restart.sh server`。

### 2. 前端（端口 5173）
```bash
cd web
npm install
npm run dev
```

浏览器打开 http://localhost:5173 （前端通过 `/api` 代理到后端，图片走 `/files`）。

## 已实现功能

- 项目列表 / 创建（仅名称）/ 重命名 / 删除
- 工作台三栏：章节·分镜目录 / 剧本（自动保存）·分镜图片 / 资产（人物·背景·道具，支持图片上传）
- 提示词模版（项目级，接口已就绪）
- 分镜图片生成：选资产+模版 → Gemini 生成 → 图片落盘本地 → 轮询进度
- 生成串行：同时仅一个任务，占用中其他提交返回 409

## 数据与备份

所有数据在 `data/`：SQLite 库 + 本地图片。备份/迁移直接拷贝整个 `data/` 目录即可。
