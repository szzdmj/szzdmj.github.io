const STATIC_ROOT = "/book_html/";
const ALLOW_CONTAINER_REGEX = /^\/([A-Za-z0-9\-]{1,18})\/?$|^\/zh-CN\/video\/.*$|^\/.+\.php(?:\/.*)?$/;

// 判断是否根路径且query为随机字段（防DDOS/反爬）
function isRandomNoiseRootQuery(u: URL): boolean {
  if (u.pathname !== "/") return false;
  const sp = u.searchParams;
  if (sp.size === 0) return false;
  let count = 0;
  for (const [k, v] of sp.entries()) {
    count++;
    if (count > 12) return false; // 太多字段也不合理
    if (!/^[A-Za-z0-9_\-]{4,16}$/.test(k)) return false;
    if (!/^[A-Za-z0-9_\-]{1,16}$/.test(v)) return false;
  }
  return true;
}

function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

function allowContainerPath(pathname: string): boolean {
  return ALLOW_CONTAINER_REGEX.test(pathname);
}

// 桥页
function buildBridgeHtml(url: URL): Response {
  const html = `<!doctype html>
<html><head>
<meta charset="utf-8"><title>中转桥页</title>
<style>
body{background:#f8fafc;color:#222;font:16px system-ui;margin:0;padding:48px 16px}
.card{background:#fff;max-width:600px;margin:auto;padding:28px 18px;border-radius:16px;box-shadow:0 2px 12px #0002}
h1{font-size:22px}
p{margin:1em 0}
</style>
</head><body>
<div class="card">
  <h1>中转页面/翻墙助手</h1>
  <p>您请求的资源不可直接访问，已进入桥接模式。</p>
  <p>原始路径：<code>${url.pathname + url.search}</code></p>
  <p>如需访问，请使用代理/VPN等方式，或尝试刷新。</p>
</div>
</body></html>`;
  return new Response(html, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-bridge": "1"
    }
  });
}

async function fetchStaticWithFallback(request: Request): Promise<Response> {
  const origURL = new URL(request.url);
  const origPath = origURL.pathname;
  if (!origPath.startsWith(STATIC_ROOT)) {
    return new Response("Not Found (not a static asset request)", { status: 404 });
  }
  const hasExt = /\.[A-Za-z0-9]{1,8}$/.test(origPath);
  const candidates = new Set<string>();
  candidates.add(origPath);
  if (!hasExt && !origPath.endsWith("/")) candidates.add(origPath + ".html");
  let decoded = origPath;
  try { decoded = decodeURIComponent(origPath); } catch {}
  const forms = new Set<string>([decoded, decoded.normalize("NFC"), decoded.normalize("NFD")]);
  for (const s of forms) {
    candidates.add(encodeBySegments(s));
    if (!hasExt && !s.endsWith("/")) candidates.add(encodeBySegments(s + ".html"));
    try { candidates.add(encodeURI(s)); } catch {}
    if (s.endsWith(".html")) candidates.add(encodeBySegments(s.replace(/\.html$/, "")));
    else candidates.add(encodeBySegments(s + ".html"));
  }
  for (const path of [...candidates]) {
    const staticURL = new URL(request.url);
    staticURL.pathname = path;
    try {
      const resp = await fetch(staticURL.toString(), { method: request.method, headers: request.headers, redirect: "follow" });
      if (resp.status === 200 || resp.status === 304) return resp;
    } catch {}
  }
  return new Response("Not Found (Unicode static fallback exhausted)", { status: 404 });
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. book_html 静态资源优先
    if (url.pathname.startsWith(STATIC_ROOT)) {
      const staticResp = await fetchStaticWithFallback(request);
      if (staticResp.status === 200 || staticResp.status === 304) {
        return staticResp;
      }
      // 404且静态失败时，自动转发到容器
      const resp = await env.CONTAINER.fetch(request);
      // 如果容器返回404且桥页开关（env.BRIDGE_ON_404 === "1"），返回桥页
      if (resp.status === 404 && env.BRIDGE_ON_404 === "1") {
        return buildBridgeHtml(url);
      }
      return resp;
    }

    // 2. 根路径随机query直接转发容器
    if (url.pathname === "/" && isRandomNoiseRootQuery(url)) {
      const resp = await env.CONTAINER.fetch(request);
      if (resp.status === 404 && env.BRIDGE_ON_404 === "1") {
        return buildBridgeHtml(url);
      }
      return resp;
    }

    // 3. 其它路径按正则允许则转发容器
    if (allowContainerPath(url.pathname)) {
      const resp = await env.CONTAINER.fetch(request);
      if (resp.status === 404 && env.BRIDGE_ON_404 === "1") {
        return buildBridgeHtml(url);
      }
      return resp;
    }

    // 4. 主页 "/" 或其它都直接 404 或返回主页（可定制）
    if (url.pathname === "/") {
      // 可返回你的主页内容，也可返回 404
      return new Response("主页", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    return new Response("Not Found (blocked by github.io Worker)", { status: 404 });
  }
};
