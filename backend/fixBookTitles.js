// ✅ backend/fixBookTitles.js — 批量清理书籍标题中的 "Vol.**"
import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "./models/Book.js";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/clms_db";

function cleanTitle(title) {
  if (!title || typeof title !== "string") return title;
  // 移除大小写不敏感的 "vol." 及其后跟的数字（可能带空格）
  const removed = title.replace(/\s*vol\.?\s*\d+\s*/gi, " ");
  // 规整多余空格
  return removed.replace(/\s{2,}/g, " ").trim();
}

async function main() {
  await mongoose.connect(uri);

  const candidates = await Book.find({ title: /vol\.?\s*\d+/i }).select("_id title");
  console.log(`🔎 发现待清理书名: ${candidates.length}`);

  let updated = 0;
  for (const b of candidates) {
    const newTitle = cleanTitle(b.title);
    if (newTitle && newTitle !== b.title) {
      await Book.updateOne({ _id: b._id }, { $set: { title: newTitle } });
      updated++;
    }
  }

  console.log(`✅ 已清理书名共计: ${updated}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ 清理失败:", err);
  process.exit(1);
});