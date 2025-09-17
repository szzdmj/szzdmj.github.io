export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const STATIC_DIR = "/book_html/";

    // ------- 根路径随机 query 优先分支: 只要有随机 query（如 /?xxx=yyy），优先走容器 -------
    if (pathname === "/" && url.search.length > 0) {
      // 如果需要进一步判断是不是“随机加密参数”，可以用 isRandomNoiseRootQuery(url)
      // 但绝大多数场景只要带 query 就能直接 forward 到容器
      return await env.CONTAINER.fetch(request);
    }

    // ------- 非静态目录全部转发容器 -------
    if (!pathname.startsWith(STATIC_DIR)) {
      return await env.CONTAINER.fetch(request);
    }

    // ------- 静态目录下 .html 自动 302 到无扩展名 -------
    if (pathname.endsWith(".html") && !url.search && !url.hash) {
      let baseName = pathname.slice(STATIC_DIR.length, -5);
      try { baseName = decodeURIComponent(baseName); } catch {}
      const noExtPath = STATIC_DIR + encodeBySegments(baseName);
      return Response.redirect(noExtPath + url.search, 302);
    }

    // ------- 静态目录 fallback: 多种编码和补全 -------
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

    // 逐候选尝试静态目录（假设有 env.STATIC.fetch 实现，或者直接 Response 404）
    for (const cand of candidates) {
      // 如果你有实际的静态资源处理逻辑，可以用：
      // let staticResp = await env.STATIC.fetch(new Request(cand, request));
      // if (staticResp && staticResp.status === 200) return staticResp;
      // 这里简化为直接 404
      // break;
    }

    // ------- fallback: 全部走容器 -------
    return await env.CONTAINER.fetch(request);
  }
};

// encodeBySegments 辅助函数
function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

// 可选：判断是否为“随机加密参数”的 query（如有需要可用，否则可省略）
function isRandomNoiseRootQuery(u: URL): boolean {
  if (u.pathname !== "/") return false;
  const sp = u.searchParams;
  if (sp.size === 0) return false;
  let count = 0;
  for (const [k, v] of sp.entries()) {
    count++;
    if (count > 12) return false;
    // 可自定义更严格的 key/value 检查
    if (!/^[A-Za-z0-9_.\-]{1,32}$/.test(k) || !/^[A-Za-z0-9_.\-]{1,32}$/.test(v)) return false;
  }
  return true;
}
