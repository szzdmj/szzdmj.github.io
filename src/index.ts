// Worker for szzdmj.github.io: 自动支持中文路径、.html fallback，并自动将 .html 请求302重定向到无扩展名

function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 只处理静态目录
    const STATIC_DIR = "/book_html/";
    if (!pathname.startsWith(STATIC_DIR)) {
      return new Response("Not Found (not a static asset request)", { status: 404 });
    }

    // 302逻辑：如果是 .html 结尾，且无 query/hash，自动重定向到无扩展名路径
    if (pathname.endsWith(".html") && !url.search && !url.hash) {
      // 归一化后段
      let baseName = pathname.slice(STATIC_DIR.length, -5); // 去掉前缀和 .html
      // decodeURIComponent，兼容中文
      try { baseName = decodeURIComponent(baseName); } catch {}
      // 逐段编码
      const noExtPath = STATIC_DIR + encodeBySegments(baseName);
      // 不做实际文件判断，直接302
      return Response.redirect(noExtPath + url.search, 302);
    }

    // 归一化静态资源 fallback
    // 尝试原始、decode、NFC、NFD、.html补全等多种路径
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
      // 无扩展名 fallback
      if (s.endsWith(".html")) candidates.add(encodeBySegments(s.replace(/\.html$/, "")));
      else candidates.add(encodeBySegments(s + ".html"));
    }

    // 依次尝试本地静态资源
    for (const path of [...candidates]) {
      const staticURL = new URL(request.url);
      staticURL.pathname = path;
      try {
        const resp = await fetch(staticURL.toString(), { method: request.method, headers: request.headers, redirect: "follow" });
        if (resp.status === 200 || resp.status === 304) return resp;
      } catch {}
    }

    // 全部失败，返回404
    return new Response("Not Found (Unicode static fallback exhausted)", { status: 404 });
  }
};
