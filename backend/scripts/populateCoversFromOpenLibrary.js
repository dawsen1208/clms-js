// ✅ backend/scripts/populateCoversFromOpenLibrary.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/Book.js";

dotenv.config();

const isLikelyIsbn = (s) => typeof s === "string" && /^\d{10}(\d{3})?$/.test(s.trim());

const buildIsbnCoverUrl = (isbn, size = "L") =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`;

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI in env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const cur = Book.find({}, { _id: 1, title: 1, author: 1, isbn: 1, coverImage: 1 }).lean().cursor();
  let updated = 0;
  let total = 0;

  for (let doc = await cur.next(); doc != null; doc = await cur.next()) {
    total++;
    const { _id, isbn, coverImage } = doc;
    if (coverImage && coverImage.startsWith("http")) continue;
    if (!isLikelyIsbn(isbn)) continue;

    const url = buildIsbnCoverUrl(isbn, "L");
    try {
      // 直接写入 URL，前端用 onError 回退占位图；可在后续脚本加下载缓存
      await Book.updateOne({ _id }, { $set: { coverImage: url } });
      updated++;
    } catch (e) {
      // 忽略单个失败
    }
  }

  console.log(`✅ Done. Scanned: ${total}, Updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ populateCovers failed:", e);
  process.exit(1);
});
