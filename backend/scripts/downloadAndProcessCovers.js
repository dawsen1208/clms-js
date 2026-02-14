// ✅ backend/scripts/downloadAndProcessCovers.js
import fs from "fs";
import path from "path";
import https from "https";
import mongoose from "mongoose";
import dotenv from "dotenv";
import sharp from "sharp";
import Book from "../models/Book.js";

dotenv.config();

const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "frontend", "public", "covers");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const isLikelyIsbn = (s) => typeof s === "string" && /^\d{10}(\d{3})?$/.test(s.trim());
const buildIsbnCoverUrl = (isbn, size = "L") =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`;

const fetchBuffer = (url) =>
  new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });

async function processBookCover(book) {
  const id = String(book._id);
  let sourceUrl = "";

  if (book.coverImage && /^https?:\/\//i.test(book.coverImage)) {
    sourceUrl = book.coverImage;
  } else if (isLikelyIsbn(book.isbn)) {
    sourceUrl = buildIsbnCoverUrl(book.isbn, "L");
  } else {
    return { id, skipped: "no-source" };
  }

  try {
    const buf = await fetchBuffer(sourceUrl);

    // 目标尺寸（宽 x 高）— 3:4 比例
    const sizes = [
      { w: 160, h: 213 },
      { w: 240, h: 320 },
      { w: 360, h: 480 },
    ];

    ensureDir(OUTPUT_DIR);

    const outputs = {};
    for (const { w, h } of sizes) {
      const outPath = path.join(OUTPUT_DIR, `${id}-${w}.webp`);
      const relUrl = `/covers/${id}-${w}.webp`;
      await sharp(buf).resize(w, h, { fit: "cover", position: "center" }).webp({ quality: 82 }).toFile(outPath);
      outputs[w] = relUrl;
    }

    // 回写数据库：主图指向 240 宽，附带多尺寸集合
    const coverImage = outputs[240] || outputs[160] || outputs[360];
    const coverImageSet = {
      w160: outputs[160],
      w240: outputs[240],
      w360: outputs[360],
    };

    await Book.updateOne(
      { _id: id },
      { $set: { coverImage, coverImageSet } },
      { upsert: false }
    );

    return { id, ok: true };
  } catch (e) {
    return { id, error: e.message };
  }
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI in env");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const books = await Book.find({}, { _id: 1, isbn: 1, coverImage: 1 }).lean();

  let ok = 0, skipped = 0, failed = 0;
  for (const b of books) {
    const res = await processBookCover(b);
    if (res.ok) ok++;
    else if (res.skipped) skipped++;
    else failed++;
  }

  console.log(`✅ Covers processed. ok=${ok}, skipped=${skipped}, failed=${failed}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ covers processing failed:", e);
  process.exit(1);
});
