// ✅ backend/scripts/reportMissingCovers.js
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/Book.js";

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI in env");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const missing = await Book.find(
    { $or: [{ coverImage: { $in: [null, ""] } }, { coverImage: { $exists: false } }] },
    { _id: 1, title: 1, author: 1, isbn: 1 }
  ).lean();

  const outDir = path.join(process.cwd(), "scripts", "out");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, "missing_covers.csv");

  const rows = [
    "id,title,author,isbn,ol_title_search,ol_title_author_search",
    ...missing.map((b) => {
      const t = encodeURIComponent(b.title || "");
      const a = encodeURIComponent(b.author || "");
      const ol1 = `https://openlibrary.org/search?q=${t}`;
      const ol2 = `https://openlibrary.org/search?q=${t}%20${a}`;
      return [
        b._id,
        JSON.stringify(b.title || "").slice(1, -1),
        JSON.stringify(b.author || "").slice(1, -1),
        b.isbn || "",
        ol1,
        ol2,
      ].join(",");
    }),
  ].join("\n");

  fs.writeFileSync(filePath, rows, "utf-8");
  console.log(`✅ Missing covers exported: ${missing.length} -> ${filePath}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ reportMissingCovers failed:", e);
  process.exit(1);
});
