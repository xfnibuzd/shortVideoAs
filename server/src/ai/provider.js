// AIImageProvider 适配层。首期实现 Gemini, 无 Key 时回退本地占位图。
// 返回: Promise<Array<{ buffer: Buffer }>>

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation';
const MOCK_FALLBACK = (process.env.AI_MOCK_FALLBACK ?? 'true') !== 'false';

// 最小的 1x1 PNG (透明) base64, 作为占位图种子
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

function mockImages(count = 1) {
  const buf = Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64');
  return Array.from({ length: count }, () => ({ buffer: buf }));
}

export async function generateImages(prompt) {
  if (!API_KEY) {
    if (MOCK_FALLBACK) {
      console.warn('[ai] 未配置 API Key, 使用占位图 (AI_MOCK_FALLBACK)');
      return mockImages(1);
    }
    throw new Error('未配置 GOOGLE_API_KEY / GEMINI_API_KEY');
  }

  try {
    // 动态导入, 避免无 Key 环境下的强依赖问题
    const { GoogleGenAI, Modality } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
    });

    const images = [];
    const parts = response?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        images.push({ buffer: Buffer.from(part.inlineData.data, 'base64') });
      }
    }

    if (images.length === 0) throw new Error('AI 未返回图片');
    return images;
  } catch (e) {
    if (MOCK_FALLBACK) {
      console.warn('[ai] 调用失败, 使用占位图回退:', e.message);
      return mockImages(1);
    }
    throw e;
  }
}
