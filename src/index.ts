export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const STATIC_DIR = "/book_html/";
    const resp = await env.CONTAINER.fetch(request);

    // 根路径带 query参数就走容器
    if (pathname === "/" && url.search.includes("=")) {
      return resp;
    }

    // 非静态目录直接走容器
  //  if (!pathname.startsWith(STATIC_DIR)) {
  //    return resp;
  //  }

    // 其它分支可以按静态处理（比如直接返回静态，或其它逻辑）
    // 这里简化为始终走容器（你可以根据需要补充）
    return resp;
  }
};
