#!/bin/sh
set -eu

REPO_ROOT="$(pwd)"
BOOK_DIR="book_html"
DIST_DIR="${REPO_ROOT}/dist"

# 总上限（MB），可在 Pages 环境变量里设置 LIMIT_MB 覆盖
LIMIT_MB="${LIMIT_MB:-950}"
LIMIT_BYTES=$(( LIMIT_MB * 1024 * 1024 ))

# 单文件最大 20MB
MAX_SINGLE_BYTES=$(( 20 * 1024 * 1024 ))

# 判断媒体扩展名（忽略大小写）
is_media_ext() {
  case "$1" in
    jpg|jpeg|png|gif|webp|svg|avif|heic|ico|JPG|JPEG|PNG|GIF|WEBP|SVG|AVIF|HEIC|ICO) return 0 ;;
    mp4|webm|mov|mkv|m4v|ts|m3u8|avi|flv|wmv|mpg|mpeg|3gp|ogv|MP4|WEBM|MOV|MKV|M4V|TS|M3U8|AVI|FLV|WMV|MPG|MPEG|3GP|OGV) return 0 ;;
    wav|mp3|ogg|m4a|aac|flac|WAV|MP3|OGG|M4A|AAC|FLAC) return 0 ;;
    *) return 1 ;;
  esac
}

bytes_of() { stat -c%s "$1"; }

copy_preserve_path() {
  src="$1"
  rel="${src#./}"; rel="${rel#${REPO_ROOT}/}"
  dst="${DIST_DIR}/${rel}"
  mkdir -p "$(dirname "$dst")"
  cp -p "$src" "$dst"
}

human() {
  bytes=$1
  if [ "$bytes" -lt 1024 ]; then echo "${bytes}B"; return; fi
  if [ "$bytes" -lt $((1024*1024)) ]; then awk "BEGIN{printf(\"%.1fKB\", $bytes/1024)}"; return; fi
  if [ "$bytes" -lt $((1024*1024*1024)) ]; then awk "BEGIN{printf(\"%.1fMB\", $bytes/1048576)}"; return; fi
  awk "BEGIN{printf(\"%.2fGB\", $bytes/1073741824)}"
}

echo "Pages 受控拣选构建: 上限=${LIMIT_MB}MB"

# 清理 dist
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

UP_LIST="${REPO_ROOT}/uploaded_manifest.txt"
SKIP_LIST="${REPO_ROOT}/not_uploaded_manifest.txt"
: > "$UP_LIST"
: > "$SKIP_LIST"

TOTAL=0

# 阶段1：纳入仓库根文件（不含 book_html）
echo "阶段1：根目录文件..."
find "$REPO_ROOT" -maxdepth 1 -mindepth 1 -type f -printf '%p\n' | while IFS= read -r f; do
  [ -f "$f" ] || continue
  sz=$(bytes_of "$f" 2>/dev/null || echo 0)
  if [ "$sz" -le 0 ]; then echo "$f" >> "$SKIP_LIST"; continue; fi
  if [ $((TOTAL + sz)) -gt "$LIMIT_BYTES" ]; then echo "$f" >> "$SKIP_LIST"; continue; fi
  cp -p "$f" "$DIST_DIR/"
  echo "$f" >> "$UP_LIST"
  TOTAL=$((TOTAL + sz))
  echo "纳入(根): $f (+$(human "$sz")) 累计 $(human "$TOTAL") / $(human "$LIMIT_BYTES")"
done

# 阶段2：从 book_html 里按 mtime 降序挑 非媒体 且 <=20MB
echo "阶段2：book_html 非媒体、<=20MB、按修改时间新到旧..."
find "$BOOK_DIR" -type f -printf '%T@;%p\n' | sort -nr -t';' -k1,1 | while IFS=';' read -r _mt path; do
  [ -f "$path" ] || continue
  ext="${path##*.}"
  if is_media_ext "$ext"; then echo "$path" >> "$SKIP_LIST"; continue; fi
  sz=$(bytes_of "$path" 2>/dev/null || echo 0)
  if [ "$sz" -le 0 ] || [ "$sz" -gt "$MAX_SINGLE_BYTES" ]; then echo "$path" >> "$SKIP_LIST"; continue; fi
  if [ $((TOTAL + sz)) -gt "$LIMIT_BYTES" ]; then echo "$path" >> "$SKIP_LIST"; continue; fi
  copy_preserve_path "$path"
  echo "$path" >> "$UP_LIST"
  TOTAL=$((TOTAL + sz))
  echo "纳入(book): $path (+$(human "$sz")) 累计 $(human "$TOTAL") / $(human "$LIMIT_BYTES")"
done

# 把清单带上，便于线上校对
cp -p "$UP_LIST"   "${DIST_DIR}/uploaded_manifest.txt"
cp -p "$SKIP_LIST" "${DIST_DIR}/not_uploaded_manifest.txt"

echo "完成：已纳入 $(human "$TOTAL") / $(human "$LIMIT_BYTES")"
echo "输出目录：$DIST_DIR"
