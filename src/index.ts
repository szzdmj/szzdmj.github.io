function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

// 用于缓存 manifest 内容
let staticManifestPaths: Set<string> = new Set();
let manifestLoaded = false;

// 加载 manifest 文件并缓存（只在第一次请求时加载一次）
async function ensureManifest(env: any) {
  if (!manifestLoaded) {
    try {
      const resp = await env.STATIC.fetch(new Request("/uploaded_manifest.txt"));
      if (resp && resp.ok) {
        const text = await resp.text();
        staticManifestPaths = new Set(text.split('\n').map(s => s.trim()).filter(Boolean));
        manifestLoaded = true;
      }
    } catch (e) {
      staticManifestPaths = new Set();
      manifestLoaded = true;
    }
  }
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const pathNoSlash = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    const STATIC_DIR = "/book_html";

    // 1. `/` 和 `/book_html` 无 query 走静态
    if (
      (pathname === "/" || pathname === STATIC_DIR) &&
      !url.search
    ) {
      return await env.STATIC.fetch(request);
    }

    // 2. `/` 和 `/book_html` 带 query才走容器
    if (
      (pathname === "/" || pathname === STATIC_DIR) &&
      url.search
    ) {
      return await env.CONTAINER.fetch(request);
    }

    // 3. 其它静态资源，检查 manifest，只允许 manifest 列出的路径
    if (
      staticManifestPaths.size === 0 ||
      !manifestLoaded
    ) {
      await ensureManifest(env);
    }
    if (staticManifestPaths.has(pathNoSlash)) {
      return await env.STATIC.fetch(request);
    }

    // 4. 其它路径全部走容器
    return await env.CONTAINER.fetch(request);
  }
};
