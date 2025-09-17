export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const resp = await env.CONTAINER.fetch(request);

    // 1. 根路径带参数时，禁止一切静态资源（尤其 JS/CSS/图片等）
    if (pathname === "/" && url.search.includes("=")) {
      // 如果是静态资源请求（.js/.css/.html/图片等），直接 404
      if (/\.(js|css|html|png|jpe?g|gif|webp|ico|svg)$/i.test(pathname)) {
        return resp;
      }
      // 其它所有请求直接转发容器
      return resp;
    }

    // 2. 其它正常静态资源逻辑...
    // 比如你的静态目录判定
    // if (pathname.startsWith("/book_html/")) { ... }
    // ...按你的静态路由处理...

    // 3. fallback：其它全部容器
    return resp;
  }
};
