// Unicode/static fallback Worker for szzdmj.github.io on Cloudflare Workers
// 自动支持 /book_html/中文.html, /book_html/%E4%B9%9D%E8%AF%84%E5%85%B1%E4%BA%A7%E5%85%9A.html 等多种路径访问
// 只处理静态目录（如 /book_html/），其它路径直接 404

function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

// 归一化静态兜底 fetch，适配 szzdmj.github.io 的 assets 目录
async function fetchStaticWithUnicodeFallback(request: Request, staticRoot: string = "/book_html/"): Promise<Response> {
  const origURL = new URL(request.url);
  const origPath = origURL.pathname;

  // 只允许静态目录
  if (!origPath.startsWith(staticRoot)) {
    return new Response("Not Found (not a static asset request)", { status: 404 });
  }

  // 构造候选路径列表
  const hasExt = /\.[A-Za-z0-9]{1,8}$/.test(origPath);
  const candidates = new Set<string>([origPath]);
  if (!hasExt && !origPath.endsWith("/")) candidates.add(origPath + ".html");

  let decoded = origPath;
  try { decoded = decodeURIComponent(origPath); } catch {}
  const forms = new Set<string>([decoded, decoded.normalize("NFC"), decoded.normalize("NFD")]);
  for (const s of forms) {
    candidates.add(encodeBySegments(s));
    if (!hasExt && !s.endsWith("/")) candidates.add(encodeBySegments(s + ".html"));
    try { candidates.add(encodeURI(s)); } catch {}
    // 无扩展名 fallback
    if (s.endsWith(".html")) candidates.add(encodeBySegments(s.replace(/\.html$/, "")));
    else candidates.add(encodeBySegments(s + ".html"));
  }

  // 去重并尝试每个候选
  for (const path of [...candidates]) {
    const staticURL = new URL(origURL.toString());
    staticURL.pathname = path;
    // 注意：Cloudflare Pages/Worker 默认 assets 目录是 /dist/book_html 或 /book_html
    // 使用 fetch 时自动跟随重定向
    try {
      const resp = await fetch(staticURL.toString(), { method: request.method, headers: request.headers, redirect: "follow" });
      if (resp.status === 200) return resp;
      // 某些静态资源 304，也算成功
      if (resp.status === 304) return resp;
    } catch (err) {}
  }

  // 全部失败，返回404
  return new Response("Not Found (Unicode static fallback exhausted)", { status: 404 });
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 仅处理静态资源目录（可自定义多个）
    const STATIC_DIRS = ["/book_html/"];
    if (STATIC_DIRS.every(dir => !pathname.startsWith(dir))) {
      return new Response("Not Found (not a static asset request)", { status: 404 });
    }

    // 移植 routenewcontainer 的 Unicode fallback 兜底
    return await fetchStaticWithUnicodeFallback(request, STATIC_DIRS.find(dir => pathname.startsWith(dir))!);
  }
};
