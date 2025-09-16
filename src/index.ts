//2bdaf39
// Cloudflare Worker for routenewcontainer: 中文路径、.html fallback、根路径带 query 优先走容器。
// 绝不会被静态页面接管（即不会 １１０１），根路径带 query、非静态目录全部走容器。

function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const STATIC_DIR = "/book_html/";

    // 1. 用正则直接判断 /?xxx=yyy
    if (/^\/\?.+/.test(url.pathname + url.search)) {
      return await env.CONTAINER.fetch(request);
    }

    // 2. 非静态目录全部走容器
    if (!pathname.startsWith(STATIC_DIR)) {
      return await env.CONTAINER.fetch(request);
    }

    // 3. 静态目录下 .html 自动 302 到无扩展名
    if (pathname.endsWith(".html") && !url.search && !url.hash) {
      let baseName = pathname.slice(STATIC_DIR.length, -5);
      try { baseName = decodeURIComponent(baseName); } catch {}
      const noExtPath = STATIC_DIR + encodeBySegments(baseName);
      return Response.redirect(noExtPath, 302);
    }

    // 静态目录 fallback: 多种编码和补全
    const hasExt = /\.[A-Za-z0-9]{1,8}$/.test(pathname);
    const candidates = new Set<string>([pathname]);
    if (!hasExt && !pathname.endsWith("/")) candidates.add(pathname + ".html");

    let decoded = pathname;
    try { decoded = decodeURIComponent(pathname); } catch {}
    const forms = new Set<string>([decoded, decoded.normalize("NFC"), decoded.normalize("NFD")]);
    for (const s of forms) {
      candidates.add(encodeBySegments(s));
      if (!hasExt && !s.endsWith("/")) candidates.add(encodeBySegments(s + ".html"));
      try { candidates.add(encodeURI(s)); } catch {}
      if (s.endsWith(".html")) candidates.add(encodeBySegments(s.replace(/\.html$/, "")));
      else candidates.add(encodeBySegments(s + ".html"));
    }

    // 逐候选尝试静态目录（假设有 env.STATIC.fetch/kv/r2 实现，或者直接 Response 404）
    for (const cand of candidates) {
      // 如果有静态资源服务可用，可以这样查找：
      // const staticResp = await env.STATIC.fetch(new Request(cand, request));
      // if (staticResp && staticResp.status === 200) return staticResp;
      // 这里简化为直接 404
      // break;
    }

    // 5. fallback: 全部走容器
    return await env.CONTAINER.fetch(request);
  }
};
