export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const STATIC_DIR = "/book_html/";
// 根路径随机 query 优先分支
if (p === "/" && hasQuery && isRandomNoiseRootQuery(url)) {
  const req2 = withContainerEntryIfNeeded(request, env);
  let reason = "root_random_query";
  let target = "UPSTREAM";
  const fo = await fetchWithFailover(req2, env, "UPSTREAM");
  if (fo.resp.status === 404 && env.BRIDGE_ON_404 === "1") {
    return buildBridgeHtmlAdvanced(url, env, reason || "container_404");
  }
  const h = new Headers(fo.resp.headers);
  h.set("x-router","routenewcontainer");
  h.set("x-target", target);
  h.set("x-reason", reason);
  tagVersion(h);
  return new Response(fo.resp.body, { status: fo.resp.status, headers: h });
}
    // 优先：根路径带 query 直接转发容器，不落静态分支
    if (pathname === "/" && url.search.length > 0) {
      return await env.CONTAINER.fetch(request);
    }

    // 优先：非静态目录全部转发容器
    if (!pathname.startsWith(STATIC_DIR)) {
      return await env.CONTAINER.fetch(request);
    }

    // 优先：静态目录下 .html 自动 302 到无扩展名
    if (pathname.endsWith(".html") && !url.search && !url.hash) {
      let baseName = pathname.slice(STATIC_DIR.length, -5);
      try { baseName = decodeURIComponent(baseName); } catch {}
      const noExtPath = STATIC_DIR + encodeBySegments(baseName);
      return Response.redirect(noExtPath + url.search, 302);
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
      // 你可以用 env.STATIC.fetch(new Request(cand, request))，或其它静态资源查找方式
      // 这里简化为直接 404
      // return await env.STATIC.fetch(new Request(cand, request));
    }

    // fallback: 全部走容器
    return await env.CONTAINER.fetch(request);
  }
};

// encodeBySegments 辅助函数
function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}
