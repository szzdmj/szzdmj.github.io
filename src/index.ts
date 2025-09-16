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
     return await env.STATIC.fetch(request);
      // 或 fallback 到 CONTAINER (按你的实际实现)
    }

    // 2. / 或 /book_html 带 query才走容器
    if ((pathname === "/" || pathname === "/book_html") && url.search) {
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

      // ...原有静态资源逻辑，或直接返回静态
      // return await env.STATIC.fetch(request);
    }

    // 4. 其它路径走容器
    return await env.CONTAINER.fetch(request);
  }
};
