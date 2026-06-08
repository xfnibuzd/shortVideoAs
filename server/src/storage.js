import fs from 'node:fs';
import path from 'node:path';
import { STORAGE_ROOT, IMAGES_DIR, ASSETS_DIR } from './paths.js';

// 将相对路径(相对 STORAGE_ROOT)转为绝对路径
export function absPath(relPath) {
  return path.join(STORAGE_ROOT, relPath);
}

// 将绝对路径转为相对 STORAGE_ROOT 的路径(用 / 分隔, 存库用)
export function relPath(absolute) {
  return path.relative(STORAGE_ROOT, absolute).split(path.sep).join('/');
}

// 写入生成图片, 返回相对路径
export function saveGenerationImage(projectId, shotId, generationId, index, buffer) {
  const dir = path.join(IMAGES_DIR, projectId, shotId, generationId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${index}.png`);
  fs.writeFileSync(file, buffer);
  return relPath(file);
}

// 写入资产图片, 返回相对路径
export function saveAssetImage(projectId, assetId, ext, buffer) {
  const dir = path.join(ASSETS_DIR, projectId);
  fs.mkdirSync(dir, { recursive: true });
  const safeExt = (ext || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
  const file = path.join(dir, `${assetId}.${safeExt}`);
  fs.writeFileSync(file, buffer);
  return relPath(file);
}

// best-effort 删除文件
export function deleteFileSafe(relativePath) {
  if (!relativePath) return;
  try {
    fs.rmSync(absPath(relativePath), { force: true });
  } catch (e) {
    console.warn('[storage] delete failed:', relativePath, e.message);
  }
}

// best-effort 删除目录
export function deleteDirSafe(absoluteDir) {
  try {
    fs.rmSync(absoluteDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('[storage] rmdir failed:', absoluteDir, e.message);
  }
}
