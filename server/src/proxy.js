// 让 Node 全局 fetch (undici) 走代理。
// 解决无法直连 Google Gemini 接口 (fetch failed) 的问题。
// 读取 HTTPS_PROXY / HTTP_PROXY / ALL_PROXY 环境变量, 配置时才启用。
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy ||
  process.env.ALL_PROXY ||
  process.env.all_proxy ||
  '';

// 豆包(火山方舟)为国内服务, 无需代理; 配了代理也跳过, 避免走境外代理失败。
if (provider === 'doubao' || provider === 'ark') {
  console.log('[proxy] 当前 provider=豆包, 跳过代理(国内直连)');
} else if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  console.log(`[proxy] 出站请求走代理: ${proxyUrl}`);
} else {
  console.log('[proxy] 未配置代理, 直连出站');
}
