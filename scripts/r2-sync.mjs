import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import mime from "mime-types";

/**
 * 环境变量：
 * - R2_ACCOUNT_ID: 你的 Cloudflare 账号 ID（用于 R2 endpoint）
 * - R2_ACCESS_KEY_ID: R2 Access Key ID
 * - R2_SECRET_ACCESS_KEY: R2 Secret Access Key
 * - R2_BUCKET: 目标桶名（默认 php-src）
 * - SRC_DIR: 本地源目录（默认 book_html/media）
 * - R2_PREFIX: R2 对象 key 前缀（默认 book_html/media）
 * - CONCURRENCY: 并发上传数（默认 8）
 * - CACHE_CONTROL: Cache-Control 头（默认 public, max-age=31536000, immutable）
 */

const ACCOUNT_ID = requiredEnv("R2_ACCOUNT_ID");
const ACCESS_KEY_ID = requiredEnv("R2_ACCESS_KEY_ID");
const SECRET_ACCESS_KEY = requiredEnv("R2_SECRET_ACCESS_KEY");
const BUCKET = process.env.R2_BUCKET || "php-src";
const SRC_DIR = process.env.SRC_DIR || "book_html/media";
const R2_PREFIX = process.env.R2_PREFIX || "book_html/media";
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const CACHE_CONTROL =
  process.env.CACHE_CONTROL || "public, max-age=31536000, immutable";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  // 使用 path-style 以确保兼容
  forcePathStyle: true
});

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const absSrc = path.resolve(SRC_DIR);
  const files = await listFiles(absSrc);
  if (files.length === 0) {
    console.log(`No files found under ${absSrc}`);
    return;
  }

  console.log(
    `Uploading ${files.length} files from ${absSrc} to r2://${BUCKET}/${R2_PREFIX}/`
  );

  let uploaded = 0;
  await runPool(CONCURRENCY, files, async (filePath) => {
    const rel = path.relative(absSrc, filePath);
    const key = toPosix(path.join(R2_PREFIX, rel));
    const contentType = mime.lookup(filePath) || "application/octet-stream";

    const body = fs.createReadStream(filePath);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: CACHE_CONTROL
      })
    );
    uploaded++;
    if (uploaded % 50 === 0 || uploaded === files.length) {
      console.log(`Progress: ${uploaded}/${files.length}`);
    }
  });

  console.log("Done.");
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

async function listFiles(dir) {
  const out = [];
  async function walk(d) {
    const ents = await fsp.readdir(d, { withFileTypes: true });
    for (const ent of ents) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile()) {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out;
}

async function runPool(limit, items, worker) {
  const q = [...items];
  const workers = Array.from({ length: limit }, async () => {
    while (q.length) {
      const item = q.shift();
      try {
        await worker(item);
      } catch (err) {
        console.error("Upload failed:", item, err);
        // 不中断整体流程，如需严格失败可抛出
      }
    }
  });
  await Promise.all(workers);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
