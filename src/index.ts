// Worker for szzdmj.github.io: 自动支持中文路径、.html fallback，并自动将 .html 请求302重定向到无扩展名

// function encodeBySegments(s: string): string {
//  return s.split("/").map(seg => (seg === "" ? "" : encodeURIComponent(seg))).join("/");
// }

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    // 只处理静态目录，动态到容器
    const STATIC_DIR = "/book_html/";
    const ALLOW_CONTAINER_REGEX = /^\/([A-Za-z0-9\-]{1,18})\/?$|^\/zh-CN\/video\/.*$|^\/.+\.php(?:\/.*)?$/;
    const resp = await env.CONTAINER.fetch(request);

    // 1. 用正则直接判断 /?xxx=yyy
    if (/^\/\?.+/.test(url.pathname)) {
      return resp;
    }

// 非静态目录
　　　if (!pathname.startsWith(STATIC_DIR) ) {
      return resp;
    }
    // 4. 其它路径全部走容器
    return resp;
  }
};
