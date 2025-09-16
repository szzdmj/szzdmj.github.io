// Cloudflare Worker for routenewcontainer: 中文路径、.html fallback、根路径带 query 优先走容器。
// 绝不会被静态页面接管（即不会 １１０１），根路径带 query、非静态目录全部走容器。

function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

// 你可以在 Worker 启动时异步加载 manifest 到 Set
let staticManifestPaths: Set<string> = new Set();

// 可选: Worker启动时加载manifest（伪代码，Cloudflare建议用KV或R2）
async function loadManifest(env: any) {
  // 例如: 从KV或R2加载manifest
  const manifestText = await env.STATIC.fetch(new Request("/uploaded_manifest.txt"));
  staticManifestPaths = new Set(manifestText.split('\n').map(s => s.trim()).filter(Boolean));
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const STATIC_DIR = "/book_html/";

    // 1. 排除 / 和 /book_html（无 query）直接走静态
    if ((pathname === "/" || pathname === "/book_html") && !url.search) {
      // 这里直接走静态页面逻辑
      // 例如: return await env.STATIC.fetch(request);
      // 或 fallback 到 CONTAINER (按你的实际实现)
    }

    // 2. / 或 /book_html 带 query才走容器
    if ((pathname === "/" || pathname === "/book_html") && url.search) {
      return await env.CONTAINER.fetch(request);
    }

    // 3. /book_html/ 下的所有静态资源，优先查 manifest
    if (pathname.startsWith(STATIC_DIR)) {
      // 优先查 manifest，如果找不到就 404
      if (staticManifestPaths.size === 0) {
        // 首次请求时载入一次
        await loadManifest(env);
    }
      // 排除 manifest中不存在的路径
      if (!staticManifestPaths.has(pathname.slice(1))) { // 去掉前面的 /
        return new Response("Not found", { status: 404 });
    }

      // ...原有静态资源逻辑，或直接返回静态
      // return await env.STATIC.fetch(request);
    }

    // 4. 其它路径走容器
    return await env.CONTAINER.fetch(request);
  }
};
