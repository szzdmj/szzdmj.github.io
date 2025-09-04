export default {
  async fetch(request, env, ctx) {
    // 1) 先尝试静态资源
    const assetsResp = await env.ASSETS.fetch(request);
    if (assetsResp.status !== 404) {
      return assetsResp;
    }

    // 2) 未命中静态资源则回退到 R2，使用相同的路径作为 key
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/+/, ""); // 去掉前导斜杠

    // 仅对 GET/HEAD 处理对象读取
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const obj = await env.SRC_R2.get(key);
    if (!obj) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();

    // Content-Type
    if (obj.httpMetadata && obj.httpMetadata.contentType) {
      headers.set("Content-Type", obj.httpMetadata.contentType);
    } else {
      headers.set("Content-Type", guessContentType(key));
    }

    // 缓存策略（按需调整）
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    // ETag（如需）
    if (obj.etag) headers.set("ETag", obj.etag);

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    return new Response(obj.body, { status: 200, headers });
  },
};

function guessContentType(key) {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
      return "audio/ogg";
    case "wav":
      return "audio/wav";
    case "pdf":
      return "application/pdf";
    case "css":
      return "text/css; charset=utf-8";
    case "js":
      return "application/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "html":
    case "htm":
      return "text/html; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
