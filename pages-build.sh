#!/usr/bin/env bash
set -euo pipefail

# 配置
REPO_ROOT="$(pwd)"
BOOK_DIR="book_html"
DIST_DIR="${REPO_ROOT}/dist"

# 总上限（MB），可在 Pages 项目中通过环境变量 LIMIT_MB 覆盖
LIMIT_MB="${LIMIT_MB:-950}"
LIMIT_BYTES=$(( LIMIT_MB * 1024 * 1024 ))

# 单文件大小上限（字节）
MAX_SINGLE_BYTES=$(( 20 * 1024 * 1024 ))  # 20MB

# 需要排除的媒体扩展名（忽略大小写）
EXCLUDE_EXTS='jpg|jpeg|png|gif|webp|svg|avif|heic|ico|mp4|webm|mov|mkv|m4v|ts|m3u8|avi|flv|wmv|mpg|mpeg|3gp|ogv|wav|mp3|ogg|m4a|aac|flac'

# 清单输出
UP_LIST="${REPO_ROOT}/uploaded_manifest.txt"
SKIP_LIST="${REPO_ROOT}/not_uploaded_manifest.txt"
: > "$UP_LIST"
: > "$SKIP_LIST"

TOTAL_BYTES=0

human() {
  local bytes=$1
  if (( bytes < 1024 )); then echo "${bytes}B"; return; fi
  if (( bytes < 1024*1024 )); then printf "%.1fKB" "$(echo "$bytes/1024" | bc -l)"; return; fi
  if (( bytes < 1024*1024*1024 )); then printf "%.1fMB" "$(echo "$bytes/(1024*1024)" | bc -l)"; return; fi
  printf "%.2fGB" "$(echo "$bytes/(1024*1024*1024)" | bc -l)"
}

bytes_of() {
  stat -c%s "$1"
}

can_take() {
  local f="$1"
  local sz
  sz=$(bytes_of "$f" || echo 0)
  if (( sz <= 0 )); then
    echo "跳过空文件: $f" >&2
    echo "$f" >> "$SKIP_LIST"
    return 1
  fi
  if (( sz > MAX_SINGLE_BYTES )); then
    echo "跳过超过 20MB 的文件: $f" >&2
    echo "$f" >> "$SKIP_LIST"
    return 1
  fi
  if (( TOTAL_BYTES + sz > LIMIT_BYTES )); then
    echo "已接近上限（$(human "$TOTAL_BYTES") / $(human "$LIMIT_BYTES")），停止纳入后续文件。" >&2
    echo "$f" >> "$SKIP_LIST"
    return 2  # 表示已到上限
  fi
  return 0
}

copy_into_dist() {
  local src="$1"
  local rel="${src#./}"         # 去掉前导 ./（如果有）
  rel="${rel#${REPO_ROOT}/}"    # 归一化为相对仓库根
  local dst="${DIST_DIR}/${rel}"
  mkdir -p "$(dirname "$dst")"
  cp -p "$src" "$dst"
}

add_file() {
  local f="$1"
  local sz
  sz=$(bytes_of "$f" || echo 0)
  copy_into_dist "$f"
  echo "$f" >> "$UP_LIST"
  TOTAL_BYTES=$(( TOTAL_BYTES + sz ))
  echo "纳入: $f  (+$(human "$sz"))  累计: $(human "$TOTAL_BYTES") / $(human "$LIMIT_BYTES")"
}

echo "Cloudflare Pages 受控拣选构建"
echo "上限: ${LIMIT_MB}MB（$(human "$LIMIT_BYTES")）"
echo "单文件上限: 20MB"
echo "媒体排除: ${EXCLUDE_EXTS}"
echo

# 清理并创建 dist
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 1) 优先纳入仓库根（不包含 book_html/.git/.github/node_modules/ 等）下的文件
echo "阶段1：纳入仓库根文件（不含 ${BOOK_DIR}）..."
while IFS= read -r -d '' f; do
  # 根阶段对媒体格式不做扩展名排除（你要求“确保先能组建成功”）
  set +e
  can_take "$f"
  rc=$?
  set -e
  if (( rc == 0 )); then
    add_file "$f"
  elif (( rc == 2 )); then
    # 达到上限，结束整个流程
    echo "达到容量上限，跳过其余所有文件。" >&2
    goto_end=1
    break
  fi
done < <(find "$REPO_ROOT" -maxdepth 1 -mindepth 1 -type f \
          -not -path "${REPO_ROOT}/${BOOK_DIR}" \
          -print0)

if [[ "${goto_end:-0}" -eq 1 ]]; then
  :
else
  echo
  echo "阶段2：从 ${BOOK_DIR} 里挑最近修改的 非图片/非视频 且 <=20MB 的文件..."
  # 说明：用制表符分隔 mtime 与路径，避免路径里出现冒号导致解析困难
  while IFS=$'\t' read -r mt path; do
    [[ -f "$path" ]] || continue
    # 扩展名排除
    ext="$(echo "${path##*.}" | tr 'A-Z' 'a-z')"
    if [[ "$ext" =~ ^(${EXCLUDE_EXTS})$ ]]; then
      echo "$path" >> "$SKIP_LIST"
      continue
    fi
    set +e
    can_take "$path"
    rc=$?
    set -e
    if (( rc == 0 )); then
      add_file "$path"
    elif (( rc == 2 )); then
      echo "达到容量上限，停止从 ${BOOK_DIR} 纳入后续文件。" >&2
      # 把剩余候选全部写入跳过清单
      while IFS=$'\t' read -r _ rest; do
        [[ -f "$rest" ]] && echo "$rest" >> "$SKIP_LIST"
      done
      break
    else
      # rc==1 已记录到 SKIP_LIST
      :
    fi
  done < <(
    find "$BOOK_DIR" -type f -printf '%T@\t%p\n' \
      | sort -nr
  )
fi

# 把清单复制进 dist 以便线上校对
cp -p "$UP_LIST"   "${DIST_DIR}/uploaded_manifest.txt"
cp -p "$SKIP_LIST" "${DIST_DIR}/not_uploaded_manifest.txt"

echo
echo "完成：已纳入 $(human "$TOTAL_BYTES") / $(human "$LIMIT_BYTES")"
echo "清单输出："
echo "  已纳入 -> $UP_LIST"
echo "  未纳入 -> $SKIP_LIST"
echo "输出目录：$DIST_DIR"
