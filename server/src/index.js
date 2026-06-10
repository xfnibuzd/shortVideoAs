import 'dotenv/config';
import './proxy.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';

import { STORAGE_ROOT, ensureDirs } from './paths.js';
import './db.js';

import projectRoutes from './routes/projects.js';
import chapterRoutes from './routes/chapters.js';
import shotRoutes from './routes/shots.js';
import assetRoutes from './routes/assets.js';
import templateRoutes from './routes/templates.js';
import generationRoutes from './routes/generations.js';

ensureDirs();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });

// 本地图片静态服务: GET /files/<相对路径>
await app.register(fastifyStatic, {
  root: STORAGE_ROOT,
  prefix: '/files/',
  decorateReply: false,
});

app.get('/health', async () => ({ ok: true }));

await app.register(projectRoutes);
await app.register(chapterRoutes);
await app.register(shotRoutes);
await app.register(assetRoutes);
await app.register(templateRoutes);
await app.register(generationRoutes);

const port = Number(process.env.PORT || 3000);
try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Server listening on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
