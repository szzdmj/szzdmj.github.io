export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // 所有请求强制走容器
    return await env.CONTAINER.fetch(request);
  }
};
