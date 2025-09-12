#!/usr/bin/env python3
import csv
import argparse
import html
from pathlib import Path
from datetime import datetime

def build_html(rows, title):
    # rows: list of dicts with keys local_path,id,public_url
    stamped = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    head = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>{html.escape(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {{
    --bg: #0b0c0f;
    --fg: #e6e6e6;
    --muted: #a3a3a3;
    --card: #121318;
    --accent: #4f8cff;
    --border: #1e2230;
  }}
  body {{
    margin: 0; padding: 24px; background: var(--bg); color: var(--fg);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  }}
  h1 {{ margin: 0 0 16px; font-size: 20px; }}
  .meta {{ color: var(--muted); margin-bottom: 16px; }}
  .toolbar {{
    display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;
  }}
  .search {{
    flex: 1 1 320px; max-width: 640px;
  }}
  input[type="search"] {{
    width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);
    background: #0f1117; color: var(--fg); outline: none;
  }}
  .grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }}
  .card {{
    background: var(--card); border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
  }}
  .thumb-wrap {{
    aspect-ratio: 16 / 10; background: #0d0f14; display: grid; place-items: center; overflow: hidden;
  }}
  .thumb {{
    max-width: 100%; max-height: 100%; object-fit: contain; display: block;
    background: #0d0f14;
  }}
  .info {{ padding: 10px 12px; }}
  .row {{ margin: 6px 0; word-break: break-all; }}
  .label {{ color: var(--muted); margin-right: 6px; }}
  .link a {{
    color: var(--accent); text-decoration: none; word-break: break-all;
  }}
  .link a:hover {{ text-decoration: underline; }}
  .hidden {{ display: none !important; }}
  .count {{ color: var(--muted); }}
</style>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  <div class="meta">共 {len(rows)} 张图 | 生成时间：{stamped}</div>

  <div class="toolbar">
    <div class="search">
      <input id="q" type="search" placeholder="搜索（本地路径 / ID / URL 片段）…">
    </div>
    <div class="count" id="count"></div>
  </div>

  <div class="grid" id="grid">
"""
    cards = []
    for r in rows:
      lp = html.escape(r.get("local_path",""))
      iid = html.escape(r.get("id",""))
      url = html.escape(r.get("public_url",""))
      card = f"""    <div class="card" data-text="{lp} {iid} {url}">
      <a class="thumb-wrap" href="{url}" target="_blank" rel="noopener">
        <img src="{url}" class="thumb" alt="{lp}">
      </a>
      <div class="info">
        <div class="row"><span class="label">路径:</span>{lp}</div>
        <div class="row"><span class="label">ID:</span>{iid}</div>
        <div class="row link"><span class="label">URL:</span><a href="{url}" target="_blank" rel="noopener">{url}</a></div>
      </div>
    </div>"""
      cards.append(card)

    tail = """
  </div>

<script>
  const q = document.getElementById('q');
  const grid = document.getElementById('grid');
  const items = Array.from(grid.children);
  const countEl = document.getElementById('count');

  function updateCount() {
    const visible = items.filter(el => !el.classList.contains('hidden')).length;
    countEl.textContent = `显示 ${visible} / 共 ${items.length}`;
  }
  updateCount();

  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase();
    if (!v) {
      items.forEach(el => el.classList.remove('hidden'));
      updateCount();
      return;
    }
    items.forEach(el => {
      const t = (el.getAttribute('data-text') || '').toLowerCase();
      if (t.includes(v)) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
    updateCount();
  });
</script>
</body>
</html>
"""
    return head + "\n".join(cards) + tail

def main():
    ap = argparse.ArgumentParser(description="Generate HTML gallery from uploaded_images.csv")
    ap.add_argument("--csv", default="uploaded_images.csv", help="CSV path (default: uploaded_images.csv)")
    ap.add_argument("--out", default="images_gallery.html", help="Output HTML file (default: images_gallery.html)")
    ap.add_argument("--title", default="图片对照表（Cloudflare Images）", help="HTML title")
    args = ap.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.is_file():
      raise SystemExit(f"找不到 CSV 文件：{csv_path}")

    rows = []
    with csv_path.open("r", encoding="utf-8", newline="") as f:
      reader = csv.DictReader(f)
      for row in reader:
        local_path = (row.get("local_path") or "").strip()
        iid = (row.get("id") or "").strip()
        public_url = (row.get("public_url") or "").strip()
        if local_path and iid and public_url:
          rows.append({"local_path": local_path, "id": iid, "public_url": public_url})

    html_str = build_html(rows, args.title)
    out_path = Path(args.out)
    out_path.write_text(html_str, encoding="utf-8")
    print(f"已生成：{out_path.resolve()}（共 {len(rows)} 条）")

if __name__ == "__main__":
    main()
