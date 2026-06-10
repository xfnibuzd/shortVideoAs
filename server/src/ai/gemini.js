// Google Gemini 文生图。
// 无 Key 或生成失败时直接抛错。返回: Promise<Array<{ buffer: Buffer }>>

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation';

export async function generateImages(prompt, { refImages = [] } = {}) {
  if (!API_KEY) {
    throw new Error('未配置 GOOGLE_API_KEY / GEMINI_API_KEY');
  }

  const { GoogleGenAI, Modality } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // 构建多模态 contents: 文字 + 可选的参考图片
  let contents;
  if (refImages.length === 0) {
    contents = prompt;
  } else {
    const parts = [{ text: prompt }];
    for (const dataUrl of refImages) {
      const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
    contents = [{ role: 'user', parts }];
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
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
}
