export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // 允许 fallback 的静态目录
    const STATIC_DIRS = ["/book_html/"];
    const url = new URL(request.url);

    if (!STATIC_DIRS.some(dir => url.pathname.startsWith(dir))) {
      return new Response("Not Found", { status: 404 });
    }

    // Fallback 检查列表：原始、decode、NFC、NFD、.html后缀、无后缀
    const candidates: string[] = [];
    candidates.push(url.pathname);

    try {
      const decoded = decodeURIComponent(url.pathname);
      if (decoded !== url.pathname) candidates.push(decoded);

      // NFC/NFD
      if (decoded.normalize("NFC") !== decoded) candidates.push(decoded.normalize("NFC"));
      if (decoded.normalize("NFD") !== decoded) candidates.push(decoded.normalize("NFD"));

      // .html补全
      for (const base of [decoded, decoded.normalize("NFC"), decoded.normalize("NFD")]) {
        if (!base.endsWith(".html")) candidates.push(base + ".html");
        // 无后缀
        if (base.endsWith(".html")) candidates.push(base.replace(/\.html$/, ''));
      }
    } catch {}

    // 去重
    const uniqCandidates = [...new Set(candidates)];

    // 每个候选都尝试，自动跟随重定向
    for (const path of uniqCandidates) {
      const staticURL = new URL(request.url);
      staticURL.pathname = path;
      const resp = await fetch(staticURL.toString(), { method: request.method, headers: request.headers, redirect: "follow" });
      if (resp.status === 200) return resp;
    }

    // 全部失败，返回404
    return new Response("Not Found (Unicode & .html fallback exhausted)", { status: 404 });
  }
};
