#!/usr/bin/env python3
import csv
import os
import re
import sys
from pathlib import Path

"""
将站点文件中的本地图片路径（如 images/foo.jpg 或 ./images/foo.jpg）
替换为 Cloudflare Images 对应的 public 变体 URL。

前提：
- 你已运行批量上传脚本，产生 uploaded_images.csv，格式：
  local_path,id,public_url
  /root/.../images/foo.jpg,xxxxxxxx-...,https://imagedelivery.net/<hash>/<id>/public

用法：
  python3 replace_images.py <site_root_dir> [csv_path]
示例：
  python3 replace_images.py /root/szmj0.github.io/book_html uploaded_images.csv
"""

def load_mapping(csv_path: Path) -> dict[str, str]:
    mapping = {}
    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            local_path = row["local_path"]
            url = row["public_url"]
            # 只取 images/ 目录相对路径作为键
            # 例如 /root/.../images/foo/bar.png -> images/foo/bar.png
            p = Path(local_path)
            parts = p.parts
            if "images" in parts:
                idx = parts.index("images")
                rel = Path(*parts[idx:]).as_posix()
                mapping[rel] = url
    return mapping

def replace_in_text(text: str, rel_path: str, new_url: str) -> str:
    # 支持多种引用写法：images/foo.jpg 或 ./images/foo.jpg 或 "../images/foo.jpg"（可以按需扩展）
    # 这里主要替换常见的相对引用：images/... 和 ./images/...
    patterns = [
        r'(?P<prefix>["\'(])' + re.escape(rel_path) + r'(?P<suffix>["\')])',
        r'(?P<prefix>["\'(])\./' + re.escape(rel_path) + r'(?P<suffix>["\')])',
    ]
    out = text
    for pat in patterns:
        out = re.sub(pat, lambda m: f'{m.group("prefix")}{new_url}{m.group("suffix")}', out)
    return out

def process_file(path: Path, mapping: dict[str, str]) -> int:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # 非文本文件跳过
        return 0

    original = text
    for rel, url in mapping.items():
        text = replace_in_text(text, rel, url)

    if text != original:
        backup = path.with_suffix(path.suffix + ".bak")
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")
        path.write_text(text, encoding="utf-8")
        return 1
    return 0

def main():
    if len(sys.argv) < 2:
        print("用法: python3 replace_images.py <site_root_dir> [csv_path]", file=sys.stderr)
        sys.exit(1)

    site_root = Path(sys.argv[1]).resolve()
    csv_path = Path(sys.argv[2]).resolve() if len(sys.argv) >= 3 else Path("uploaded_images.csv").resolve()

    if not site_root.is_dir():
        print(f"站点目录不存在: {site_root}", file=sys.stderr)
        sys.exit(1)
    if not csv_path.is_file():
        print(f"找不到 CSV: {csv_path}", file=sys.stderr)
        sys.exit(1)

    mapping = load_mapping(csv_path)
    if not mapping:
        print("CSV 中未解析到任何 images/* 映射。确认 uploaded_images.csv 的 local_path 列包含 images/ 子路径。", file=sys.stderr)
        sys.exit(1)

    # 需要处理的文本类型（可按需扩展）
    exts = {".html", ".htm", ".md", ".markdown", ".txt", ".xml", ".json", ".js", ".css"}
    changed = 0
    total = 0

    for root, _, files in os.walk(site_root):
        for fn in files:
            p = Path(root) / fn
            total += 1
            if p.suffix.lower() in exts:
                changed += process_file(p, mapping)

    print(f"扫描文件: {total}，修改文件: {changed}")
    print("已为修改的文件生成 .bak 备份（同目录）。")

if __name__ == "__main__":
    main()
