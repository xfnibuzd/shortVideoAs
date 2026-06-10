// 豆包(火山方舟 Ark)文生图。OpenAI 兼容接口。
// 无 Key 或生成失败时直接抛错。返回: Promise<Array<{ buffer: Buffer }>>

const API_KEY = process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || '';
const BASE_URL = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
const MODEL = process.env.DOUBAO_IMAGE_MODEL || 'doubao-seedream-3-0-t2i-250415';
// Seedream 要求图片像素数 >= 3,686,400(约 1920x1920), 默认用 2048x2048
const SIZE = process.env.DOUBAO_IMAGE_SIZE || '2048x2048';

export async function generateImages(prompt, { refImages = [] } = {}) {
  if (!API_KEY) {
    throw new Error('未配置 ARK_API_KEY（豆包/火山方舟）');
  }

  const body = {
    model: MODEL,
    prompt,
    response_format: 'b64_json',
    size: SIZE,
    n: 1,
    watermark: false,
  };

  // Seedream 4.0+ 支持参考图: 单图 → image, 多图 → images
  if (refImages.length === 1) {
    body.image = refImages[0];
  } else if (refImages.length > 1) {
    body.images = refImages;
  }

  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`豆包生成失败: ${res.status} ${text}`);
  }

  const data = await res.json();
  const images = [];
  for (const item of data?.data || []) {
    if (item.b64_json) {
      images.push({ buffer: Buffer.from(item.b64_json, 'base64') });
    } else if (item.url) {
      const r = await fetch(item.url);
      images.push({ buffer: Buffer.from(await r.arrayBuffer()) });
    }
  }

  if (images.length === 0) throw new Error('豆包未返回图片');
  return images;
}
