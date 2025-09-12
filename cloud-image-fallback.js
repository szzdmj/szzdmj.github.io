(() => {
  // 从路径里提取 images/... 相对路径作为映射键
  function toImagesRel(pathname) {
    if (!pathname) return null;
    try {
      // 只用路径部分，不带 query/hash
      const p = String(pathname);
      let i = p.indexOf("/images/");
      if (i >= 0) return p.slice(i + 1); // 去掉开头的斜杠，统一成 images/...
      i = p.indexOf("images/");
      if (i >= 0) return p.slice(i);
      return null;
    } catch {
      return null;
    }
  }

  // 把 <img src="..."> 的 URL 解析为绝对路径后提取 images/...
  function imgToRel(img) {
    try {
      const src = img.getAttribute("src");
      if (!src) return null;
      const u = new URL(src, window.location.href);
      return toImagesRel(u.pathname);
    } catch { return null; }
  }

  // 解析 CSV（简单版：按逗号分隔，假设字段里没有逗号）
  function parseCsvToMap(csvText) {
    const map = new Map(); // key: images/... , value: cloud url
    const lines = csvText.split(/\r?\n/);
    if (!lines.length) return map;
    // 跳过表头
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // 期待结构: local_path,id,public_url
      const parts = line.split(",");
      if (parts.length < 3) continue;
      const local = parts[0].trim();
      const url = parts.slice(2).join(",").trim(); // 容忍 URL 中的逗号（一般不会有）
      // local 可能是 book_html/images/... 或 /images/... 等，统一提取 images/...
      const rel = toImagesRel(local);
      if (rel && url.startsWith("http")) {
        map.set(rel, url);
      }
    }
    return map;
  }

  async function loadCsvMap() {
    try {
      // 使用相对路径，适配 GitHub Pages 根目录
      const resp = await fetch("uploaded_images.csv", { cache: "no-store" });
      if (!resp.ok) return null;
      const text = await resp.text();
      return parseCsvToMap(text);
    } catch {
      return null;
    }
  }

  function applyCloudWithFallback(map) {
    if (!map || !(map instanceof Map) || map.size === 0) return;

    const imgs = document.getElementsByTagName("img");
    for (const img of imgs) {
      // 提取原始本地路径键
      const rel = imgToRel(img);
      if (!rel) continue;

      const cloud = map.get(rel);
      if (!cloud) continue;

      // 已经换过的跳过（避免重复设置）
      if (img.dataset.cloudApplied === "1") continue;

      const original = img.getAttribute("src") || "";
      // 设置回退
      img.dataset.local = original;
      img.onerror = function () {
        // 回退一次即可，避免无限循环
        if (this.dataset.fallbackDone === "1") return;
        this.dataset.fallbackDone = "1";
        if (this.dataset.local) this.src = this.dataset.local;
      };

      // 优先使用云端
      img.setAttribute("src", cloud);
      img.dataset.cloudApplied = "1";
    }
  }

  // DOM 就绪后执行
  document.addEventListener("DOMContentLoaded", async () => {
    const map = await loadCsvMap();
    if (map) applyCloudWithFallback(map);
    // 如果 map 加载失败，什么都不做，保持本地图片正常显示
  });
})();
