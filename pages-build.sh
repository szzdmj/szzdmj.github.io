#!/usr/bin/env bash
set -euo pipefail
export LANG=C.UTF-8; export LC_ALL=C.UTF-8
REPO_ROOT="$(pwd)"
BOOK_DIR="book_html"
DIST_DIR="${REPO_ROOT}/dist"

# 总上限（MB），可用环境变量 LIMIT_MB 覆盖
LIMIT_MB="${LIMIT_MB:-950}"
LIMIT_BYTES=$(( LIMIT_MB * 1024 * 1024 ))

# 单文件最大 20MB
MAX_SINGLE_BYTES=$(( 20 * 1024 * 1024 ))

# 扩展名是否为媒体（忽略大小写）
is_media_ext() {
  local ext="${1,,}"  # 小写
  case "$ext" in
    # 图片
    jpg|jpeg|png|gif|webp|svg|avif|heic|ico) return 0 ;;
    # 视频
    mp4|webm|mov|mkv|m4v|ts|m3u8|avi|flv|wmv|mpg|mpeg|3gp|ogv) return 0 ;;
    # 音频
    wav|mp3|ogg|m4a|aac|flac) return 0 ;;
    *) return 1 ;;
  esac
}

# 获取文件大小（字节）
bytes_of() {
  stat -c%s "$1" 2>/dev/null || stat -f%z "$1" 2>/dev/null || wc -c < "$1"
}

# 人类可读
human() {
  local bytes="$1"
  if (( bytes < 1024 )); then
    printf "%dB" "$bytes"
  elif (( bytes < 1024*1024 )); then
    awk -v b="$bytes" 'BEGIN{printf "%.1fKB", b/1024}'
  elif (( bytes < 1024*1024*1024 )); then
    awk -v b="$bytes" 'BEGIN{printf "%.1fMB", b/1048576}'
  else
    awk -v b="$bytes" 'BEGIN{printf "%.2fGB", b/1073741824}'
  fi
}

copy_preserve_path() {
  local src="$1"
  local rel="${src#./}"; rel="${rel#${REPO_ROOT}/}"
  local dst="${DIST_DIR}/${rel}"
  mkdir -p "$(dirname "$dst")"
  cp -p "$src" "$dst"
}

echo "Pages 受控拣选构建: 上限=$(human "$LIMIT_BYTES")"
echo "单文件上限: $(human "$MAX_SINGLE_BYTES")"
echo

# 清理 dist
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

UP_LIST="${REPO_ROOT}/uploaded_manifest.txt"
SKIP_LIST="${REPO_ROOT}/not_uploaded_manifest.txt"
: > "$UP_LIST"
: > "$SKIP_LIST"

TOTAL=0

# 阶段1：根目录文件（不包含目录 ${BOOK_DIR} 本身）
echo "阶段1：根目录文件..."
# 注意：用进程替代（process substitution）避免管道子进程导致 TOTAL 丢失
while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  sz=$(bytes_of "$f" 2>/dev/null || echo 0)
  if (( sz <= 0 )); then
    echo "$f" >> "$SKIP_LIST"
    continue
  fi
  if (( TOTAL + sz > LIMIT_BYTES )); then
    echo "$f" >> "$SKIP_LIST"
    continue
  fi
  cp -p "$f" "$DIST_DIR/"
  echo "$f" >> "$UP_LIST"
  TOTAL=$(( TOTAL + sz ))
  echo "纳入(根): $f (+$(human "$sz")) 累计 $(human "$TOTAL") / $(human "$LIMIT_BYTES")"
done < <(find "$REPO_ROOT" -maxdepth 1 -mindepth 1 -type f -printf '%p\n')

# 阶段2：从 ${BOOK_DIR} 里按 mtime 降序挑 非媒体 且 <=20MB
echo
echo "阶段2：${BOOK_DIR} 非媒体、<=20MB、按修改时间新到旧..."
if [[ -d "$BOOK_DIR" ]]; then
  while IFS=';' read -r _mt path; do
    [[ -f "$path" ]] || continue
    ext="${path##*.}"
    if is_media_ext "$ext"; then
      echo "$path" >> "$SKIP_LIST"
      continue
    fi
    sz=$(bytes_of "$path" 2>/dev/null || echo 0)
    if (( sz <= 0 || sz > MAX_SINGLE_BYTES )); then
      echo "$path" >> "$SKIP_LIST"
      continue
    fi
    if (( TOTAL + sz > LIMIT_BYTES )); then
      echo "$path" >> "$SKIP_LIST"
      continue
    fi
    copy_preserve_path "$path"
    echo "$path" >> "$UP_LIST"
    TOTAL=$(( TOTAL + sz ))
    echo "纳入(book): $path (+$(human "$sz")) 累计 $(human "$TOTAL") / $(human "$LIMIT_BYTES")"
  done < <(find "$BOOK_DIR" -type f -printf '%T@;%p\n' | sort -nr -t';' -k1,1)
else
  echo "跳过：未找到目录 ${BOOK_DIR}"
fi

# 把清单复制到 dist，便于线上查看
cp -p "$UP_LIST"   "${DIST_DIR}/uploaded_manifest.txt"
cp -p "$SKIP_LIST" "${DIST_DIR}/not_uploaded_manifest.txt"

echo
echo "dist 内容预览（前两层）："
find "$DIST_DIR" -maxdepth 2 -type f -printf '%s %p\n' | sort -nr | head -n 200

echo
echo "完成：已纳入 $(human "$TOTAL") / $(human "$LIMIT_BYTES")"
echo "输出目录：$DIST_DIR"
