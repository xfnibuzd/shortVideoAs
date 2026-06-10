// AIImageProvider 适配层(调度层)。
// 通过环境变量 AI_PROVIDER 选择后端: 'gemini'(默认) | 'doubao'。
// 各实现无 Key 或生成失败时直接抛错(不做占位图回退)。
// 统一返回: Promise<Array<{ buffer: Buffer }>>

export const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

export async function generateImages(prompt, options = {}) {
  switch (AI_PROVIDER) {
    case 'doubao':
    case 'ark': {
      const { generateImages: gen } = await import('./doubao.js');
      return gen(prompt, options);
    }
    case 'gemini':
    case 'google':
    default: {
      const { generateImages: gen } = await import('./gemini.js');
      return gen(prompt, options);
    }
  }
}
