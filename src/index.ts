//基于V12
function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const pathNoSlash = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const STATIC_DIR = "/book_html";

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

    // 4. 静态目录 fallback（略）

    // 5. fallback: 全部走容器
    return await env.CONTAINER.fetch(request);
  }
};
