// ✅ backend/scripts/enrichDescriptions.js
// One-shot script to enrich missing book descriptions with a short, real sentence.
// Sources: Open Library (default), Google Books (optional via GOOGLE_BOOKS_API_KEY)

import "dotenv/config";
import mongoose from "mongoose";
import https from "https";
import Book from "../models/Book.js";

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || "";
const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY || "";

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI / DATABASE_URL in .env");
  process.exit(1);
}

function getJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "clms-enricher/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("Request timeout"));
    });
  });
}

function firstSentence(text) {
  if (!text) return "";
  let s = String(text).replace(/\s+/g, " ").trim();
  const delims = /([。！？!?\.])\s/;
  const match = s.match(delims);
  if (match) {
    const idx = s.indexOf(match[0]) + match[0].length - 1;
    s = s.slice(0, idx + 1);
  }
  // keep it brief
  if (s.length > 220) {
    s = s.slice(0, 200).replace(/[，、；;,.\s]+$/, "") + "…";
  }
  return s;
}

async function fetchFromGoogle(title, author) {
  if (!GOOGLE_KEY) return null;
  const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(
    title
  )}+inauthor:${encodeURIComponent(author)}&maxResults=1&key=${GOOGLE_KEY}`;
  try {
    const json = await getJSON(url);
    const item = json?.items?.[0];
    const desc = item?.volumeInfo?.description || item?.searchInfo?.textSnippet;
    if (desc) return firstSentence(desc);
    return null;
  } catch (e) {
    return null;
  }
}

async function fetchFromOpenLibrary(title, author) {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
    title
  )}&author=${encodeURIComponent(author)}&limit=1`;
  try {
    const json = await getJSON(url);
    const doc = json?.docs?.[0];
    const key = doc?.key; // usually /works/OLxxxxW
    if (key && key.startsWith("/works/")) {
      const workUrl = `https://openlibrary.org${key}.json`;
      const work = await getJSON(workUrl);
      const desc = typeof work?.description === "string" ? work.description : work?.description?.value;
      if (desc) return firstSentence(desc);
    }
    // fallback: subtitle/first_sentence
    const descAlt = doc?.subtitle || doc?.first_sentence;
    if (descAlt) return firstSentence(descAlt);
    return null;
  } catch (e) {
    return null;
  }
}

function fallbackLine(book) {
  const title = book.title || "未知书名";
  const author = book.author || "未知作者";
  const category = book.category || "通识";
  return `${author}撰写的${category}主题作品《${title}》。`;
}

async function enrichOne(book) {
  // Try Google first if key provided, else Open Library
  let line = null;
  if (GOOGLE_KEY) {
    line = await fetchFromGoogle(book.title, book.author);
  }
  if (!line) {
    line = await fetchFromOpenLibrary(book.title, book.author);
  }
  if (!line) {
    line = fallbackLine(book);
  }
  return line;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const candidates = await Book.find({
    $or: [
      { description: { $exists: false } },
      { description: "" },
      { description: { $regex: /^\s*$/ } },
      { description: { $regex: /^.{0,15}$/ } }, // too short
    ],
  }).lean();

  console.log(`🔎 Found ${candidates.length} books needing description enrichment`);
  let ok = 0,
    failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const b = candidates[i];
    try {
      const desc = await enrichOne(b);
      if (desc) {
        await Book.updateOne({ _id: b._id }, { $set: { description: desc } });
        ok++;
        if (i % 25 === 0) {
          console.log(`✅ [${i + 1}/${candidates.length}] ${b.title} → ${desc}`);
        }
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
    // polite pacing to avoid rate limits
    await new Promise((r) => setTimeout(r, 180));
  }

  console.log(`\n📊 Done. Updated: ${ok}, Failed: ${failed}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Script failed:", e);
  process.exit(1);
});