// ✅ backend/scripts/importManualCovers.js
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/Book.js";

dotenv.config();

function parseCsvLine(line) {
  // Expecting: id,coverUrl
  // Trim and split on first comma to be tolerant
  const idx = line.indexOf(",");
  if (idx === -1) return null;
  const id = line.slice(0, idx).trim();
  const coverUrl = line.slice(idx + 1).trim();
  if (!id || !coverUrl) return null;
  return { id, coverUrl };
}

async function main() {
  const fileArg = process.argv[2];
  const filePath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.join(process.cwd(), "scripts", "out", "manual_covers.csv");

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI in env");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/).filter(Boolean);
  let ok = 0, bad = 0;
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const parsed = parseCsvLine(line);
    if (!parsed) {
      bad++;
      continue;
    }
    const { id, coverUrl } = parsed;
    try {
      await Book.updateOne({ _id: id }, { $set: { coverImage: coverUrl } });
      ok++;
    } catch {
      bad++;
    }
  }

  console.log(`✅ Manual covers imported. ok=${ok}, bad=${bad}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ importManualCovers failed:", e);
  process.exit(1);
});
