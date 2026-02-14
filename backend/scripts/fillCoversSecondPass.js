// ✅ backend/scripts/fillCoversSecondPass.js
// Second-pass cover fill using Google Books (no API key, low volume)
import https from "https";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/Book.js";

dotenv.config();

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ((res.statusCode || 0) >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });

const pickBestImage = (imageLinks = {}) => {
  const order = ["extraLarge", "large", "medium", "small", "thumbnail", "smallThumbnail"];
  for (const key of order) {
    if (imageLinks[key]) {
      let url = imageLinks[key];
      // ensure https
      if (url.startsWith("http://")) url = url.replace("http://", "https://");
      // normalize google images that contain &edge=curl, etc.
      return url;
    }
  }
  return null;
};

async function findByGoogleBooks(title, author) {
  if (!title) return null;
  const q = encodeURIComponent(`intitle:${title} ${author ? "inauthor:" + author : ""}`.trim());
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5`;
  try {
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) return null;
    for (const it of data.items) {
      const img = pickBestImage(it.volumeInfo?.imageLinks || {});
      if (img) return img;
    }
  } catch {
    // ignore
  }
  return null;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI in env");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const missing = await Book.find(
    { $or: [{ coverImage: { $in: [null, ""] } }, { coverImage: { $exists: false } }] },
    { _id: 1, title: 1, author: 1 }
  ).lean();

  let updated = 0;
  for (const b of missing) {
    const url = await findByGoogleBooks(b.title, b.author);
    if (!url) continue;
    try {
      await Book.updateOne({ _id: b._id }, { $set: { coverImage: url } });
      updated++;
    } catch {
      // ignore
    }
  }

  console.log(`✅ Second pass done. Attempted: ${missing.length}, Updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ fillCoversSecondPass failed:", e);
  process.exit(1);
});
