import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const STORAGE_ROOT = path.join(DATA_DIR, 'storage');
export const IMAGES_DIR = path.join(STORAGE_ROOT, 'images');
export const ASSETS_DIR = path.join(STORAGE_ROOT, 'assets');
export const DB_PATH = path.join(DATA_DIR, 'app.db');

export function ensureDirs() {
  for (const dir of [DATA_DIR, STORAGE_ROOT, IMAGES_DIR, ASSETS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
