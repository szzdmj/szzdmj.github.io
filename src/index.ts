// Cloudflare Worker for szzdmj.github.io: 支持静态分发、404自动容器转发、根路径随机query直接到容器
const STATIC_ROOT = "/book_html/";

// 容器允许的路径正则（可根据实际调整）
const ALLOW_CONTAINER_REGEX = /^\/([A-Za-z0-9\-]{1,18})\/?$|^\/zh-CN\/video\/.*$|^\/.+\.php(?:\/.*)?$/;

function encodeBySegments(s: string): string {
  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
}

// 判断是否根路径且query为随机字段（防DDOS/反爬）
function isRandomNoiseRootQuery(u: URL): boolean {
  if (u.pathname !== "/") return false;
  const sp = u.searchParams;
  if (sp.size === 0) return false;
  let count = 0;
  for (const [k, v] of sp.entries()) {
    count++;
    if (count > 12) return false; // 太多字段也不合理
    // 字段名和值都必须是疑似随机串
    if (!/^[A-Za-z0-9_\-]{4,16}$/.test(k)) return false;
    if (!/^[A-Za-z0-9_\-]{4,16}$/.test(v)) return false;
  }
  return true;
}

// 判断是否容器允许的路径
function allowContainerPath(pathname: string): boolean {
  return ALLOW_CONTAINER_REGEX.test(pathname);
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
      // 404时自动转发到容器
      return await env.CONTAINER.fetch(request);
    }

    // 2. 根路径随机query直接转发容器
    if (url.pathname === "/" && isRandomNoiseRootQuery(url)) {
      return await env.CONTAINER.fetch(request);
    }

    // 3. 其它路径按正则允许则转发容器
    if (allowContainerPath(url.pathname)) {
      return await env.CONTAINER.fetch(request);
    }

    // 4. 主页 "/" 或其它都直接 404 或返回主页（可定制）
    if (url.pathname === "/") {
      // 可返回你的主页内容，也可返回 404
      return new Response("主页", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    return new Response("Not Found (blocked by github.io Worker)", { status: 404 });
  }
};
