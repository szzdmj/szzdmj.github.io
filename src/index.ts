// Cloudflare Worker for szzdmj.github.io: 自动支持中文路径、.html fallback，无扩展名自动兜底
// 支持 /book_html/xxx, /book_html/xxx.html, /book_html/中文.html, /book_html/%E4%B9%9D%E8%AF%84%E5%85%B1%E4%BA%A7%E5%85%9A.html 等多种形式

const STATIC_ROOT = "/book_html/";

function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

async function fetchStaticWithFallback(request: Request): Promise<Response> {
  const origURL = new URL(request.url);
  const origPath = origURL.pathname;

  // 只允许静态目录
  if (!origPath.startsWith(STATIC_ROOT)) {
    return new Response("Not Found (not a static asset request)", { status: 404 });
  }

  // 构造候选路径列表
  const hasExt = /\.[A-Za-z0-9]{1,8}$/.test(origPath);
  const candidates = new Set<string>();
  candidates.add(origPath);
  if (!hasExt && !origPath.endsWith("/")) candidates.add(origPath + ".html");

  let decoded = origPath;
  try { decoded = decodeURIComponent(origPath); } catch {}
  const forms = new Set<string>([decoded, decoded.normalize("NFC"), decoded.normalize("NFD")]);
  for (const s of forms) {
    candidates.add(encodeBySegments(s));
    if (!hasExt && !s.endsWith("/")) candidates.add(encodeBySegments(s + ".html"));
    try { candidates.add(encodeURI(s)); } catch {}
    // 支持 .html -> 无扩展名
    if (s.endsWith(".html")) candidates.add(encodeBySegments(s.replace(/\.html$/, "")));
    else candidates.add(encodeBySegments(s + ".html"));
  }

  // 依次尝试本地静态资源（Pages/Worker会自动查找本地文件）
  for (const path of [...candidates]) {
    const staticURL = new URL(request.url);
    staticURL.pathname = path;
    try {
      const resp = await fetch(staticURL.toString(), { method: request.method, headers: request.headers, redirect: "follow" });
      if (resp.status === 200 || resp.status === 304) return resp;
    } catch {}
  }

  // 全部失败，返回444
  return new Response("Not Found (Unicode static fallback exhausted)", { status: 444 });
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const staticResp = await fetchStaticWithFallback(request);
    if (staticResp.status === 200 || staticResp.status === 304) {
      return staticResp;
    }
    // 404时直接转发给绑定的 CONTAINER Worker
    return await env.CONTAINER.fetch(request);
  }
};
