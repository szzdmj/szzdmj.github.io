function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

// manifest缓存与加载
let staticManifestPaths: Set<string> = new Set();
let manifestLoaded = false;
async function ensureManifest(env: any) {
  if (!manifestLoaded) {
    try {
      const resp = await env.STATIC.fetch(new Request("/uploaded_manifest.txt"));
      if (resp && resp.ok) {
        const text = await resp.text();
        staticManifestPaths = new Set(text.split('\n').map(s => s.trim()).filter(Boolean));
        manifestLoaded = true;
      }
    } catch { manifestLoaded = true; }
  }
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const pathNoSlash = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const STATIC_DIR = "/book_html";

    // 1. / 或 /book_html 且有 query，走容器
    if (
      (pathname === "/" || pathname === STATIC_DIR) &&
      url.search && url.search.length > 0
    ) {
      return await env.CONTAINER.fetch(request);
    }

    // 2. / 或 /book_html 且无 query，走静态
    if (
      (pathname === "/" || pathname === STATIC_DIR) &&
      (!url.search || url.search.length === 0)
    ) {
      return await env.STATIC.fetch(request);
    }

    // 3. 其它静态资源，manifest允许才静态
    if (!manifestLoaded) {
      await ensureManifest(env);
    }
    if (staticManifestPaths.has(pathNoSlash)) {
      return await env.STATIC.fetch(request);
    }

    // 4. 其它全部走容器
    return await env.CONTAINER.fetch(request);
  }
};
