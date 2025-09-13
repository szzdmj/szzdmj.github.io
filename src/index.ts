export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // 配置：允许 fallback 归一化的静态目录
    const STATIC_DIRS = ["/book_html/"];
    const url = new URL(request.url);

    // 只处理静态资源目录
    const matchStatic = STATIC_DIRS.some(dir => url.pathname.startsWith(dir));
    if (!matchStatic) {
      return new Response("Not Found", { status: 404 });
    }

    // Fallback 检查列表：原始、decode、NFC、NFD、.html后缀
    const candidates: string[] = [];
    candidates.push(url.pathname);

    // decodeURIComponent
    try {
      const decoded = decodeURIComponent(url.pathname);
      if (decoded !== url.pathname) candidates.push(decoded);
      // NFC/NFD
      if (decoded.normalize("NFC") !== decoded) candidates.push(decoded.normalize("NFC"));
      if (decoded.normalize("NFD") !== decoded) candidates.push(decoded.normalize("NFD"));

      // .html补全
      if (!decoded.endsWith(".html")) {
        candidates.push(decoded + ".html");
        candidates.push(decoded.normalize("NFC") + ".html");
        candidates.push(decoded.normalize("NFD") + ".html");
      }
    } catch {}

    // 去重
    const uniqCandidates = [...new Set(candidates)];
    // 尝试每个候选
    for (const path of uniqCandidates) {
      const staticURL = new URL(request.url);
      staticURL.pathname = path;
      const resp = await fetch(staticURL, request);
      if (resp.status === 200) return resp;
    }

    // 全部失败，返回404
    return new Response("Not Found (Unicode fallback exhausted)", { status: 404 });
  }
};
